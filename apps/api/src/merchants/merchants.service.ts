import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { LedgerService } from "../ledger/ledger.service";
import { AuditLogService } from "../common/audit-log.service";
import type { FeeBorneBy } from "@meld/types";

@Injectable()
export class MerchantsService {
  constructor(
    private prisma: PrismaService,
    private ledger: LedgerService,
    private audit: AuditLogService,
  ) {}

  async findOwn(userId: string) {
    const merchant = await this.prisma.merchant.findUnique({ where: { userId } });
    if (!merchant) throw new NotFoundException("No merchant profile for this user");
    return merchant;
  }

  async listPending() {
    return this.prisma.merchant.findMany({ where: { status: "pending_approval" } });
  }

  async listAll() {
    return this.prisma.merchant.findMany({ orderBy: { createdAt: "desc" } });
  }

  /** Mirrors the Supabase-era approve_merchant() Postgres function. */
  async approve(input: {
    merchantId: string;
    feeBorneBy: FeeBorneBy;
    overrideFlatFeeKobo?: number;
    actorId: string;
  }) {
    const merchant = await this.prisma.merchant.findUnique({ where: { id: input.merchantId } });
    if (!merchant) throw new NotFoundException("Merchant not found");
    if (merchant.status !== "pending_approval") {
      throw new BadRequestException(`Merchant is ${merchant.status}, not pending_approval`);
    }

    const updated = await this.prisma.merchant.update({
      where: { id: input.merchantId },
      data: {
        status: "approved",
        feeBorneBy: input.feeBorneBy,
        approvedById: input.actorId,
        approvedAt: new Date(),
      },
    });

    await this.ledger.ensureAccount({
      type: "merchant_payable",
      ownerType: "merchant",
      ownerId: input.merchantId,
    });

    if (input.overrideFlatFeeKobo != null) {
      await this.prisma.feeRule.create({
        data: {
          scope: "merchant",
          merchantId: input.merchantId,
          type: "flat",
          intrastateFeeKobo: BigInt(input.overrideFlatFeeKobo),
          fallbackFeeKobo: BigInt(input.overrideFlatFeeKobo),
          createdById: input.actorId,
        },
      });
    }

    await this.audit.record({
      actorId: input.actorId,
      action: "approve_merchant",
      entityType: "merchant",
      entityId: input.merchantId,
      detail: { feeBorneBy: input.feeBorneBy, overrideFeeKobo: input.overrideFlatFeeKobo ?? null },
    });

    return updated;
  }

  async setStatus(merchantId: string, status: "approved" | "suspended", actorId: string) {
    const updated = await this.prisma.merchant.update({ where: { id: merchantId }, data: { status } });
    await this.audit.record({
      actorId,
      action: "set_merchant_status",
      entityType: "merchant",
      entityId: merchantId,
      detail: { status },
    });
    return updated;
  }

  async updateOwnProfile(
    userId: string,
    input: {
      businessName: string;
      contactPerson?: string;
      phone?: string;
      email?: string;
      pickupAddress?: string;
      pickupState?: string;
      bankName?: string;
      bankCode?: string;
      bankAccountNo?: string;
      bankAccountName?: string;
    },
  ) {
    // Deliberately excludes status/feeBorneBy/approvedBy — a merchant can
    // never self-approve or change fee terms by editing "their own row"
    // (same rule as update_merchant_profile() in the earlier Supabase design).
    return this.prisma.merchant.update({ where: { userId }, data: input });
  }
}
