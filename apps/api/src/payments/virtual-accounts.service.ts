import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { paymentsKit } from "../kits/payments-kit";

interface Caller {
  isOps: boolean;
  riderId: string | null;
}

/** Idempotent per (purpose, referenceId) — 04_PRD_Rider FR-3: never a second account number. */
@Injectable()
export class VirtualAccountsService {
  constructor(private prisma: PrismaService) {}

  private async findExisting(purpose: "delivery_payment" | "cash_remittance", referenceId: string) {
    return this.prisma.virtualAccount.findFirst({
      where:
        purpose === "delivery_payment"
          ? { purpose, deliveryId: referenceId, isActive: true }
          : { purpose, remittanceId: referenceId, isActive: true },
    });
  }

  /** Read-only lookup for pages that need to know whether a VA already exists, without creating one. */
  async find(input: { purpose: "delivery_payment" | "cash_remittance"; referenceId: string; caller: Caller }) {
    await this.assertAuthorized(input.purpose, input.referenceId, input.caller);
    const existing = await this.findExisting(input.purpose, input.referenceId);
    if (!existing) return null;
    return { accountNo: existing.accountNo, bankName: existing.bankName, amountKobo: existing.amountKobo };
  }

  private async assertAuthorized(purpose: "delivery_payment" | "cash_remittance", referenceId: string, caller: Caller) {
    if (caller.isOps) return;
    if (purpose === "delivery_payment") {
      const delivery = await this.prisma.delivery.findUnique({ where: { id: referenceId } });
      if (!delivery || caller.riderId !== delivery.riderId) throw new ForbiddenException("Not authorized for this delivery");
    } else {
      const remittance = await this.prisma.cashRemittance.findUnique({ where: { id: referenceId } });
      if (!remittance || caller.riderId !== remittance.riderId) throw new ForbiddenException("Not authorized for this remittance");
    }
  }

  async generate(input: {
    purpose: "delivery_payment" | "cash_remittance";
    referenceId: string;
    caller: Caller;
  }) {
    const existing = await this.findExisting(input.purpose, input.referenceId);
    if (existing) {
      return { accountNo: existing.accountNo, bankName: existing.bankName, amountKobo: existing.amountKobo };
    }

    let amountKobo: number;
    if (input.purpose === "delivery_payment") {
      const delivery = await this.prisma.delivery.findUnique({ where: { id: input.referenceId } });
      if (!delivery) throw new NotFoundException("Delivery not found");
      if (!input.caller.isOps && input.caller.riderId !== delivery.riderId) {
        throw new ForbiddenException("Not authorized for this delivery");
      }
      const order = await this.prisma.order.findUnique({ where: { id: delivery.orderId } });
      if (!order) throw new NotFoundException("Order not found");
      if (order.deliveryFeeKobo == null) {
        throw new BadRequestException("Dispatcher has not set a delivery fee for this order yet");
      }
      amountKobo =
        order.feeBorneBy === "customer"
          ? Number(order.orderValueKobo) + Number(order.deliveryFeeKobo)
          : Number(order.orderValueKobo);
    } else {
      const remittance = await this.prisma.cashRemittance.findUnique({ where: { id: input.referenceId } });
      if (!remittance) throw new NotFoundException("Remittance not found");
      if (!input.caller.isOps && input.caller.riderId !== remittance.riderId) {
        throw new ForbiddenException("Not authorized for this remittance");
      }
      amountKobo = Number(remittance.amountOwedKobo);
    }

    if (amountKobo <= 0) throw new BadRequestException("Amount must be positive");

    const kit = await paymentsKit();
    const provider = kit.createPaymentProvider(process.env as Record<string, string | undefined>);
    const va = await provider.createVirtualAccount({ purpose: input.purpose, referenceId: input.referenceId, amountKobo });

    await this.prisma.virtualAccount.create({
      data: {
        purpose: input.purpose,
        deliveryId: input.purpose === "delivery_payment" ? input.referenceId : undefined,
        remittanceId: input.purpose === "cash_remittance" ? input.referenceId : undefined,
        provider: va.provider,
        accountNo: va.accountNo,
        bankName: va.bankName,
        amountKobo: va.amountKobo != null ? BigInt(va.amountKobo) : null,
      },
    });

    return { accountNo: va.accountNo, bankName: va.bankName, amountKobo: va.amountKobo };
  }
}
