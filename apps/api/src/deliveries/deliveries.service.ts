import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { LedgerService } from "../ledger/ledger.service";
import { AuditLogService } from "../common/audit-log.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { ledgerKit } from "../kits/ledger-kit";

interface Caller {
  isOps: boolean;
  riderId: string | null;
}

function assertAuthorized(caller: Caller, assignedRiderId: string | null): void {
  if (caller.isOps) return;
  if (!caller.riderId || caller.riderId !== assignedRiderId) {
    throw new ForbiddenException("Not authorized for this delivery");
  }
}

@Injectable()
export class DeliveriesService {
  constructor(
    private prisma: PrismaService,
    private ledger: LedgerService,
    private audit: AuditLogService,
    private realtime: RealtimeGateway,
  ) {}

  /**
   * Mirrors assign_rider() — ops only, validates rider is active and order is
   * awaiting_assignment. Dispatcher sets BOTH money numbers here, in the same
   * action: deliveryFeeKobo (what the merchant/customer is charged) and
   * riderPayoutKobo (what the rider earns) — two independent figures, not a
   * fixed split. This is the one and only point an order's fee gets set; no
   * automatic fee-rules resolution runs anymore.
   */
  async assign(input: {
    orderId: string;
    riderId: string;
    deliveryFeeKobo: number;
    riderPayoutKobo: number;
    actorId: string;
  }) {
    if (!Number.isInteger(input.deliveryFeeKobo) || input.deliveryFeeKobo <= 0) {
      throw new BadRequestException("deliveryFeeKobo must be a positive integer");
    }
    if (!Number.isInteger(input.riderPayoutKobo) || input.riderPayoutKobo < 0) {
      throw new BadRequestException("riderPayoutKobo must be a non-negative integer");
    }
    if (input.riderPayoutKobo > input.deliveryFeeKobo) {
      throw new BadRequestException("Rider payout cannot exceed the delivery fee");
    }

    const rider = await this.prisma.rider.findUnique({ where: { id: input.riderId } });
    if (!rider || rider.status !== "active") {
      throw new BadRequestException("Rider must be active to receive assignments");
    }
    const order = await this.prisma.order.findUnique({ where: { id: input.orderId } });
    if (!order) throw new NotFoundException("Order not found");
    if (order.status !== "awaiting_assignment") {
      throw new BadRequestException(`Order must be awaiting_assignment, got ${order.status}`);
    }

    const [delivery] = await this.prisma.$transaction([
      this.prisma.delivery.create({
        data: {
          orderId: input.orderId,
          riderId: input.riderId,
          status: "assigned",
          assignedById: input.actorId,
          assignedAt: new Date(),
        },
      }),
      this.prisma.order.update({
        where: { id: input.orderId },
        data: {
          status: "assigned",
          deliveryFeeKobo: BigInt(input.deliveryFeeKobo),
          riderPayoutKobo: BigInt(input.riderPayoutKobo),
        },
      }),
    ]);

    await this.audit.record({
      actorId: input.actorId,
      action: "assign_rider",
      entityType: "delivery",
      entityId: delivery.id,
      detail: { orderId: input.orderId, riderId: input.riderId },
    });
    this.realtime.emitDeliveryUpdate(delivery.id, "delivery.assigned", { status: "assigned" });
    return delivery;
  }

  private async transition(
    deliveryId: string,
    caller: Caller,
    fromStatus: string,
    toStatus: "accepted" | "en_route" | "arrived",
  ) {
    const delivery = await this.prisma.delivery.findUnique({ where: { id: deliveryId } });
    if (!delivery) throw new NotFoundException("Delivery not found");
    assertAuthorized(caller, delivery.riderId);
    if (delivery.status !== fromStatus) {
      throw new BadRequestException(`Cannot move to ${toStatus} from status ${delivery.status}`);
    }
    const updated = await this.prisma.delivery.update({ where: { id: deliveryId }, data: { status: toStatus } });
    this.realtime.emitDeliveryUpdate(deliveryId, "delivery.status_changed", { status: toStatus });
    return updated;
  }

  accept(deliveryId: string, caller: Caller) {
    return this.transition(deliveryId, caller, "assigned", "accepted");
  }

  startEnRoute(deliveryId: string, caller: Caller) {
    return this.transition(deliveryId, caller, "accepted", "en_route");
  }

  markArrived(deliveryId: string, caller: Caller) {
    return this.transition(deliveryId, caller, "en_route", "arrived");
  }

  async fail(deliveryId: string, reason: string, caller: Caller & { actorId: string }) {
    const delivery = await this.prisma.delivery.findUnique({ where: { id: deliveryId } });
    if (!delivery) throw new NotFoundException("Delivery not found");
    assertAuthorized(caller, delivery.riderId);
    if (delivery.status === "delivered" || delivery.status === "failed") {
      throw new BadRequestException(`Cannot fail a delivery already in status ${delivery.status}`);
    }

    await this.prisma.$transaction([
      this.prisma.delivery.update({ where: { id: deliveryId }, data: { status: "failed" } }),
      this.prisma.order.update({ where: { id: delivery.orderId }, data: { status: "failed" } }),
    ]);
    await this.audit.record({
      actorId: caller.actorId,
      action: "fail_delivery",
      entityType: "delivery",
      entityId: deliveryId,
      detail: { reason },
    });
    this.realtime.emitDeliveryUpdate(deliveryId, "delivery.status_changed", { status: "failed", reason });
  }

  /**
   * THE PAYMENT GATE (04_PRD_Rider §3.2, 08_APP_FLOWS §4). "Delivered" is
   * allowed only if payment_status = 'paid' OR cash_collected = true — this
   * check runs here regardless of what the client claims, and this is the
   * ONLY method that can move a delivery to 'delivered' (no generic PATCH
   * endpoint exists for delivery status). Idempotent — repeat calls on an
   * already-delivered delivery are a no-op, not an error, matching the
   * earlier Postgres function's behavior.
   */
  async complete(deliveryId: string, caller: Caller) {
    const delivery = await this.prisma.delivery.findUnique({ where: { id: deliveryId } });
    if (!delivery) throw new NotFoundException("Delivery not found");
    assertAuthorized(caller, delivery.riderId);

    if (delivery.status === "delivered") return delivery; // idempotent
    if (delivery.status !== "arrived") {
      throw new BadRequestException(`Cannot complete a delivery in status ${delivery.status}`);
    }
    const paymentAccountedFor = delivery.paymentStatus === "paid" || delivery.cashCollected;
    if (!paymentAccountedFor) {
      throw new BadRequestException(
        "Payment not accounted for — confirm payment or mark cash collected before completing this delivery",
      );
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.delivery.update({
        where: { id: deliveryId },
        data: { status: "delivered", completedAt: new Date() },
      }),
      this.prisma.order.update({ where: { id: delivery.orderId }, data: { status: "delivered" } }),
    ]);
    this.realtime.emitDeliveryUpdate(deliveryId, "delivery.status_changed", { status: "delivered" });
    return updated;
  }

  /**
   * Rider marks COD cash collected. Posts the 80/20 split immediately —
   * money moves at collection time, not at delivery completion
   * (01_SHARED_FOUNDATIONS §4 Scenario B) — and creates the remittance
   * obligation. Unblocks complete()'s payment gate.
   */
  async markCashCollected(deliveryId: string, amountKobo: number, caller: Caller) {
    if (!Number.isInteger(amountKobo) || amountKobo <= 0) {
      throw new BadRequestException("amountKobo must be a positive integer");
    }
    const delivery = await this.prisma.delivery.findUnique({ where: { id: deliveryId } });
    if (!delivery) throw new NotFoundException("Delivery not found");
    assertAuthorized(caller, delivery.riderId);
    if (delivery.cashCollected) return { ok: true, alreadyCollected: true };

    const order = await this.prisma.order.findUnique({ where: { id: delivery.orderId } });
    if (!order) throw new NotFoundException("Order not found");
    if (order.paymentType !== "cod") throw new BadRequestException("Order is not cash-on-delivery");
    if (!delivery.riderId) throw new BadRequestException("Delivery has no assigned rider");
    if (order.deliveryFeeKobo == null || order.riderPayoutKobo == null) {
      throw new BadRequestException("Dispatcher has not set a delivery fee for this order yet");
    }

    const cashInTransit = await this.ledger.ensureAccount({
      type: "cash_in_transit",
      ownerType: "rider",
      ownerId: delivery.riderId,
    });
    const merchantPayable = await this.ledger.ensureAccount({
      type: "merchant_payable",
      ownerType: "merchant",
      ownerId: order.merchantId,
    });
    const riderWallet = await this.ledger.ensureAccount({
      type: "rider_wallet",
      ownerType: "rider",
      ownerId: delivery.riderId,
    });
    const meldRevenue = await this.ledger.ensureAccount({ type: "meld_revenue", ownerType: "meld", ownerId: null });

    const kit = await ledgerKit();
    const { tx, merchantProceedsKobo } = kit.buildCodCashCollectedPosting({
      accounts: { cashInTransit, merchantPayable, riderWallet, meldRevenue },
      deliveryId,
      cashAmountKobo: amountKobo,
      deliveryFeeKobo: Number(order.deliveryFeeKobo),
      riderPayoutKobo: Number(order.riderPayoutKobo),
    });
    await this.ledger.post(tx);

    await this.prisma.$transaction([
      this.prisma.delivery.update({
        where: { id: deliveryId },
        data: { cashCollected: true, cashAmountKobo: BigInt(amountKobo) },
      }),
      this.prisma.cashRemittance.create({
        data: {
          riderId: delivery.riderId,
          deliveryId,
          amountOwedKobo: BigInt(amountKobo),
          status: "pending",
        },
      }),
    ]);

    this.realtime.emitDeliveryUpdate(deliveryId, "delivery.cash_collected", { amountKobo });
    return { ok: true, merchantProceedsKobo };
  }
}
