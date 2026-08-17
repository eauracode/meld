import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { LedgerService } from "../ledger/ledger.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { paymentsKit } from "../kits/payments-kit";
import { ledgerKit } from "../kits/ledger-kit";

// Mirrors MockPaymentProvider.WEBHOOK_SECRET (@meld/payments) — duplicated
// as a literal rather than imported so this file doesn't need to know
// whether the mock provider class is even reachable at runtime; the value
// only ever matters when createPaymentProvider() has actually resolved to
// the mock provider (checked in simulatePayment() before this is used).
const MOCK_WEBHOOK_SECRET = "mock-webhook-secret";

/**
 * Ported from supabase/functions/payment-webhook/index.ts. Signature
 * verification and idempotency mechanics unchanged; storage swapped from
 * the Supabase-backed LedgerStore to PrismaLedgerStore via LedgerService.
 * NOTE: field paths in normalizeEvent() match each partner's documented
 * payload shape as of writing — verify against a real webhook delivery
 * before relying on this in production (unchanged caveat from the earlier
 * design; still not exercised against a live partner).
 */
@Injectable()
export class WebhooksService {
  constructor(
    private prisma: PrismaService,
    private ledger: LedgerService,
    private realtime: RealtimeGateway,
  ) {}

  /**
   * Dev/demo only — stands in for the customer transferring funds (or the
   * rider paying cash into a remittance VA) plus the partner's webhook
   * firing, for environments with no real Paystack/Flutterwave keys. Builds
   * the exact payload+signature shape `handlePaymentWebhook` expects and
   * runs it through the SAME code path a real webhook would, so nothing
   * about the confirmation logic is duplicated or bypassed. Refuses to run
   * if a real provider is actually configured — this must never be reachable
   * against real money.
   */
  async simulatePayment(input: { purpose: "delivery_payment" | "cash_remittance"; referenceId: string; amountKobo: number }) {
    const paymentsMod = await paymentsKit();
    const provider = paymentsMod.createPaymentProvider(process.env as Record<string, string | undefined>);
    if (provider.name !== "mock") {
      throw new BadRequestException("Simulated payments are only available when the mock payment provider is active");
    }

    const payload = JSON.stringify({
      event: "mock.payment",
      data: { reference: `${input.purpose}-${input.referenceId}`, amountKobo: input.amountKobo, id: `sim_${Date.now()}` },
    });
    const signature = `${MOCK_WEBHOOK_SECRET}:${payload.length}`;
    return this.handlePaymentWebhook(payload, signature);
  }

  async handlePaymentWebhook(rawBody: string, signature: string): Promise<{ ok: boolean; outcome?: string }> {
    const paymentsMod = await paymentsKit();
    const provider = paymentsMod.createPaymentProvider(process.env as Record<string, string | undefined>);

    if (!provider.verifyWebhookSignature(rawBody, signature)) {
      throw new UnauthorizedException("Invalid signature");
    }

    const payload = JSON.parse(rawBody) as Record<string, unknown>;
    const event = this.normalizeEvent(provider.name, payload);
    if (!event) return { ok: true, outcome: "ignored" };

    const processed = {
      recordIfNew: async (providerName: string, eventId: string): Promise<boolean> => {
        try {
          await this.prisma.processedEvent.create({ data: { provider: providerName, eventId } });
          return true;
        } catch (err) {
          if ((err as { code?: string }).code === "P2002") return false; // unique constraint = duplicate
          throw err;
        }
      },
    };

    const outcome = await paymentsMod.handlePaymentEvent(event, {
      processed,
      onPayment: async (e) => {
        if (e.purpose === "delivery_payment") await this.confirmDeliveryPayment(e);
        else await this.confirmRemittancePayment(e);
      },
    });

    return { ok: true, outcome };
  }

  // deno-lint-ignore no-explicit-any
  private async confirmDeliveryPayment(event: { referenceId: string; amountKobo: number; provider: string; eventId: string; raw?: unknown }) {
    const delivery = await this.prisma.delivery.findUnique({ where: { id: event.referenceId } });
    if (!delivery) throw new Error(`Delivery ${event.referenceId} not found`);
    if (delivery.paymentStatus === "paid") return; // already confirmed

    const order = await this.prisma.order.findUnique({ where: { id: delivery.orderId } });
    if (!order) throw new Error(`Order for delivery ${delivery.id} not found`);
    if (order.deliveryFeeKobo == null || order.riderPayoutKobo == null) {
      throw new Error(`Order ${order.id} has no dispatcher-set delivery fee — cannot confirm payment`);
    }

    const partnerFloat = await this.ledger.ensureAccount({ type: "partner_float", ownerType: "meld", ownerId: null });
    const meldRevenue = await this.ledger.ensureAccount({ type: "meld_revenue", ownerType: "meld", ownerId: null });
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

    const kit = await ledgerKit();
    const { tx } = kit.buildPrepaidConfirmedPosting({
      accounts: { partnerFloat, merchantPayable, riderWallet, meldRevenue },
      deliveryId: delivery.id,
      orderValueKobo: Number(order.orderValueKobo),
      deliveryFeeKobo: Number(order.deliveryFeeKobo),
      riderPayoutKobo: Number(order.riderPayoutKobo),
      feeBorneBy: order.feeBorneBy,
    });
    await this.ledger.post(tx);

    await this.prisma.payment.create({
      data: {
        deliveryId: delivery.id,
        provider: event.provider,
        providerRef: event.eventId,
        amountKobo: BigInt(event.amountKobo),
        method: "transfer",
        status: "paid",
        // Prisma's nullable-Json input type doesn't accept a plain `null` —
        // omit the field entirely (undefined) when there's nothing to store.
        raw: event.raw as object | undefined,
      },
    });
    await this.prisma.delivery.update({ where: { id: delivery.id }, data: { paymentStatus: "paid" } });
    this.realtime.emitDeliveryUpdate(delivery.id, "delivery.payment_confirmed", { paymentStatus: "paid" });
  }

  private async confirmRemittancePayment(event: { referenceId: string; amountKobo: number }) {
    const remittance = await this.prisma.cashRemittance.findUnique({ where: { id: event.referenceId } });
    if (!remittance) throw new Error(`Remittance ${event.referenceId} not found`);
    if (remittance.status !== "pending") return;

    const partnerFloat = await this.ledger.ensureAccount({ type: "partner_float", ownerType: "meld", ownerId: null });
    const cashInTransit = await this.ledger.ensureAccount({
      type: "cash_in_transit",
      ownerType: "rider",
      ownerId: remittance.riderId,
    });

    const kit = await ledgerKit();
    await this.ledger.post(
      kit.buildCashRemittedPosting({
        accounts: { partnerFloat, cashInTransit },
        remittanceId: remittance.id,
        amountKobo: event.amountKobo,
      }),
    );

    await this.prisma.cashRemittance.update({
      where: { id: remittance.id },
      data: { amountRemittedKobo: BigInt(event.amountKobo), status: "remitted" },
    });
  }

  private normalizeEvent(providerName: string, payload: Record<string, unknown>) {
    const referencePattern = /^(delivery_payment|cash_remittance)[-_](.+)$/;

    if (providerName === "mock") {
      if (payload.event !== "mock.payment") return null;
      const d = payload.data as Record<string, any>;
      const reference: string = d?.reference ?? "";
      const match = reference.match(referencePattern);
      if (!match) return null;
      return {
        provider: "mock" as const,
        eventId: String(d.id),
        type: "payment.received" as const,
        accountNo: "",
        referenceId: match[2]!,
        purpose: match[1] as "delivery_payment" | "cash_remittance",
        amountKobo: Number(d.amountKobo),
        raw: payload,
      };
    }

    if (providerName === "paystack") {
      if (payload.event !== "charge.success") return null;
      const d = payload.data as Record<string, any>;
      const email: string = d?.customer?.email ?? "";
      const match = email.match(referencePattern);
      if (!match) return null;
      return {
        provider: "paystack" as const,
        eventId: String(d.id ?? d.reference),
        type: "payment.received" as const,
        accountNo: d?.authorization?.receiver_bank_account_number ?? "",
        referenceId: match[2]!,
        purpose: match[1] as "delivery_payment" | "cash_remittance",
        amountKobo: Number(d.amount),
        raw: payload,
      };
    }

    if (providerName === "flutterwave") {
      const d = payload.data as Record<string, any>;
      if (payload.event !== "charge.completed" || d?.status !== "successful") return null;
      const txRef: string = d?.tx_ref ?? "";
      const match = txRef.match(referencePattern);
      if (!match) return null;
      return {
        provider: "flutterwave" as const,
        eventId: String(d.id),
        type: "payment.received" as const,
        accountNo: d?.account_number ?? "",
        referenceId: match[2]!,
        purpose: match[1] as "delivery_payment" | "cash_remittance",
        amountKobo: Math.round(Number(d.amount ?? 0) * 100),
        raw: payload,
      };
    }

    return null;
  }
}
