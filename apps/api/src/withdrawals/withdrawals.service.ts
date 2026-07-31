import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { LedgerService } from "../ledger/ledger.service";
import { AuditLogService } from "../common/audit-log.service";
import { paymentsKit } from "../kits/payments-kit";
import { ledgerKit } from "../kits/ledger-kit";

@Injectable()
export class WithdrawalsService {
  constructor(
    private prisma: PrismaService,
    private ledger: LedgerService,
    private audit: AuditLogService,
  ) {}

  async request(input: { ownerType: "merchant" | "rider"; ownerId: string; amountKobo: number }) {
    if (!Number.isInteger(input.amountKobo) || input.amountKobo <= 0) {
      throw new BadRequestException("amountKobo must be a positive integer");
    }
    const { available } = await this.balance(input.ownerType, input.ownerId);
    if (input.amountKobo > available) {
      throw new BadRequestException("Amount exceeds available balance");
    }

    return this.prisma.withdrawal.create({
      data: { ownerType: input.ownerType, ownerId: input.ownerId, amountKobo: BigInt(input.amountKobo) },
    });
  }

  /** Ledger balance minus withdrawals already requested/processing — what's actually free to withdraw. */
  async balance(ownerType: "merchant" | "rider", ownerId: string) {
    const accountType = ownerType === "merchant" ? "merchant_payable" : "rider_wallet";
    const accountId = await this.ledger.ensureAccount({ type: accountType, ownerType, ownerId });
    const ledgerBalance = await this.ledger.getBalance(accountId);

    const inFlight = await this.prisma.withdrawal.aggregate({
      where: { ownerType, ownerId, status: { in: ["requested", "processing"] } },
      _sum: { amountKobo: true },
    });
    const pending = Number(inFlight._sum.amountKobo ?? 0n);
    return { balanceKobo: ledgerBalance, pendingWithdrawalsKobo: pending, available: ledgerBalance - pending };
  }

  async listForOwner(ownerType: "merchant" | "rider", ownerId: string) {
    return this.prisma.withdrawal.findMany({ where: { ownerType, ownerId }, orderBy: { createdAt: "desc" } });
  }

  async listAll() {
    return this.prisma.withdrawal.findMany({ orderBy: { createdAt: "desc" } });
  }

  /** ops_admin only, balance re-checked before calling the partner, ledger posts only on confirmed success. */
  async process(withdrawalId: string, actorId: string) {
    const withdrawal = await this.prisma.withdrawal.findUnique({ where: { id: withdrawalId } });
    if (!withdrawal) throw new NotFoundException("Withdrawal not found");
    if (withdrawal.status !== "requested") {
      throw new BadRequestException(`Withdrawal is ${withdrawal.status}, not requested`);
    }

    const ownerTable = withdrawal.ownerType === "merchant" ? "merchant" : "rider";
    const owner =
      ownerTable === "merchant"
        ? await this.prisma.merchant.findUnique({ where: { id: withdrawal.ownerId } })
        : await this.prisma.rider.findUnique({ where: { id: withdrawal.ownerId } });
    if (!owner) throw new NotFoundException(`${withdrawal.ownerType} not found`);
    if (!owner.bankCode) {
      throw new BadRequestException(`${withdrawal.ownerType} has no bank_code on file — cannot initiate transfer`);
    }

    const accountType = withdrawal.ownerType === "merchant" ? "merchant_payable" : "rider_wallet";
    // withdrawals.owner_type is a plain string column (matches the original
    // schema's design), always "merchant" | "rider" by construction —
    // request() only ever accepts those two.
    const ownerAccountId = await this.ledger.ensureAccount({
      type: accountType,
      ownerType: withdrawal.ownerType as "merchant" | "rider",
      ownerId: withdrawal.ownerId,
    });
    const balance = await this.ledger.getBalance(ownerAccountId);
    if (Number(withdrawal.amountKobo) > balance) {
      throw new BadRequestException("Withdrawal exceeds available balance");
    }

    const paymentsMod = await paymentsKit();
    const provider = paymentsMod.createPaymentProvider(process.env as Record<string, string | undefined>);
    const result = await provider.initiateTransfer({
      amountKobo: Number(withdrawal.amountKobo),
      bankName: owner.bankName ?? "",
      bankCode: owner.bankCode,
      bankAccountNo: owner.bankAccountNo ?? "",
      accountName: owner.bankAccountName ?? "",
      reference: withdrawal.id,
    });

    if (result.status === "failed") {
      await this.prisma.withdrawal.update({
        where: { id: withdrawalId },
        data: { status: "failed", failureReason: result.failureReason ?? "Transfer failed" },
      });
      return { ok: false, status: "failed", reason: result.failureReason };
    }

    const kit = await ledgerKit();
    const partnerFloat = await this.ledger.ensureAccount({ type: "partner_float", ownerType: "meld", ownerId: null });
    await this.ledger.post(
      kit.buildWithdrawalPaidPosting({
        accounts: { owner: ownerAccountId, partnerFloat },
        withdrawalId,
        amountKobo: Number(withdrawal.amountKobo),
      }),
    );

    await this.prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: {
        status: result.status === "paid" ? "paid" : "processing",
        provider: provider.name,
        providerRef: result.providerRef,
        processedAt: new Date(),
      },
    });

    await this.audit.record({
      actorId,
      action: "process_withdrawal",
      entityType: "withdrawal",
      entityId: withdrawalId,
      detail: { amountKobo: Number(withdrawal.amountKobo), providerRef: result.providerRef },
    });

    return { ok: true, status: result.status };
  }

  async fail(withdrawalId: string, reason: string, actorId: string) {
    const withdrawal = await this.prisma.withdrawal.findUnique({ where: { id: withdrawalId } });
    if (!withdrawal || withdrawal.status !== "requested") {
      throw new BadRequestException("Withdrawal must be in requested status");
    }
    const updated = await this.prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: { status: "failed", failureReason: reason },
    });
    await this.audit.record({
      actorId,
      action: "fail_withdrawal",
      entityType: "withdrawal",
      entityId: withdrawalId,
      detail: { reason },
    });
    return updated;
  }

  async retry(withdrawalId: string, actorId: string) {
    const withdrawal = await this.prisma.withdrawal.findUnique({ where: { id: withdrawalId } });
    if (!withdrawal || withdrawal.status !== "failed") {
      throw new BadRequestException("Withdrawal must be in failed status");
    }
    const updated = await this.prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: { status: "requested", failureReason: null },
    });
    await this.audit.record({ actorId, action: "retry_withdrawal", entityType: "withdrawal", entityId: withdrawalId });
    return updated;
  }
}
