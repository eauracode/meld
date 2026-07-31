import { describe, expect, it } from "vitest";
import { MockPaymentProvider } from "./mock-provider";
import { handlePaymentEvent, MemoryProcessedEventStore } from "./webhook";

describe("MockPaymentProvider", () => {
  it("virtual account creation is idempotent per (purpose, reference) — FR-3", async () => {
    const provider = new MockPaymentProvider();
    const first = await provider.createVirtualAccount({
      purpose: "delivery_payment",
      referenceId: "d1",
      amountKobo: 2_200_000,
    });
    const second = await provider.createVirtualAccount({
      purpose: "delivery_payment",
      referenceId: "d1",
    });
    expect(second.accountNo).toBe(first.accountNo);

    const other = await provider.createVirtualAccount({
      purpose: "cash_remittance",
      referenceId: "rem1",
    });
    expect(other.accountNo).not.toBe(first.accountNo);
  });

  it("verifies webhook signatures", () => {
    const provider = new MockPaymentProvider();
    const payload = JSON.stringify({ hello: "world" });
    expect(provider.verifyWebhookSignature(payload, provider.signPayload(payload))).toBe(true);
    expect(provider.verifyWebhookSignature(payload, "bad-signature")).toBe(false);
  });

  it("inbound payments raise the partner balance and emit a normalized event", async () => {
    const provider = new MockPaymentProvider();
    const va = await provider.createVirtualAccount({
      purpose: "delivery_payment",
      referenceId: "d1",
    });
    const event = provider.simulateInboundPayment(va.accountNo, 2_200_000);
    expect(event).toMatchObject({
      type: "payment.received",
      referenceId: "d1",
      purpose: "delivery_payment",
      amountKobo: 2_200_000,
    });
    expect(await provider.getBalance()).toBe(2_200_000);
  });

  it("transfers are idempotent per reference and fail on insufficient float", async () => {
    const provider = new MockPaymentProvider();
    const va = await provider.createVirtualAccount({
      purpose: "delivery_payment",
      referenceId: "d1",
    });
    provider.simulateInboundPayment(va.accountNo, 100_000);

    const tooMuch = await provider.initiateTransfer({
      amountKobo: 500_000,
      bankName: "GTB",
      bankCode: "058",
      bankAccountNo: "0123456789",
      accountName: "Tunde Rider",
      reference: "w_too_much",
    });
    expect(tooMuch.status).toBe("failed");

    const ok = await provider.initiateTransfer({
      amountKobo: 60_000,
      bankName: "GTB",
      bankCode: "058",
      bankAccountNo: "0123456789",
      accountName: "Tunde Rider",
      reference: "w1",
    });
    expect(ok.status).toBe("paid");
    expect(await provider.getBalance()).toBe(40_000);

    // Same reference retried → same result, money moves once.
    const retry = await provider.initiateTransfer({
      amountKobo: 60_000,
      bankName: "GTB",
      bankCode: "058",
      bankAccountNo: "0123456789",
      accountName: "Tunde Rider",
      reference: "w1",
    });
    expect(retry).toEqual(ok);
    expect(await provider.getBalance()).toBe(40_000);
  });
});

describe("handlePaymentEvent (webhook idempotency)", () => {
  it("processes a first-time event once and ignores redelivery", async () => {
    const provider = new MockPaymentProvider();
    const processed = new MemoryProcessedEventStore();
    const va = await provider.createVirtualAccount({
      purpose: "delivery_payment",
      referenceId: "d1",
    });
    const event = provider.simulateInboundPayment(va.accountNo, 2_200_000);

    let postings = 0;
    const deps = { processed, onPayment: async () => void (postings += 1) };

    expect(await handlePaymentEvent(event, deps)).toBe("processed");
    expect(await handlePaymentEvent(event, deps)).toBe("duplicate");
    expect(await handlePaymentEvent(event, deps)).toBe("duplicate");
    expect(postings).toBe(1); // the same event never double-posts to the ledger
  });

  it("distinct events from the same provider both process", async () => {
    const provider = new MockPaymentProvider();
    const processed = new MemoryProcessedEventStore();
    const va = await provider.createVirtualAccount({
      purpose: "delivery_payment",
      referenceId: "d1",
    });
    const e1 = provider.simulateInboundPayment(va.accountNo, 1_000_000);
    const e2 = provider.simulateInboundPayment(va.accountNo, 1_200_000);
    let postings = 0;
    const deps = { processed, onPayment: async () => void (postings += 1) };
    expect(await handlePaymentEvent(e1, deps)).toBe("processed");
    expect(await handlePaymentEvent(e2, deps)).toBe("processed");
    expect(postings).toBe(2);
  });
});
