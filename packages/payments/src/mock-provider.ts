import type { Kobo, VirtualAccountPurpose } from "@meld/types";
import type {
  PaymentEvent,
  PaymentProvider,
  TransferRequest,
  TransferResult,
  VirtualAccountDetails,
} from "./provider";

/**
 * Deterministic in-memory partner for dev and tests. Simulates the partner's
 * side of the flow: virtual accounts, inbound payments (emitting webhook-shaped
 * events), payouts, and a float balance.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock" as const;
  private accounts = new Map<string, VirtualAccountDetails>();
  private transfers = new Map<string, TransferResult>();
  private balanceKobo: Kobo = 0;
  private eventSeq = 0;

  static readonly WEBHOOK_SECRET = "mock-webhook-secret";

  async createVirtualAccount(input: {
    purpose: VirtualAccountPurpose;
    referenceId: string;
    amountKobo?: Kobo;
  }): Promise<VirtualAccountDetails> {
    const key = `${input.purpose}:${input.referenceId}`;
    const existing = this.accounts.get(key);
    if (existing) return existing; // idempotent per reference
    const account: VirtualAccountDetails = {
      provider: this.name,
      purpose: input.purpose,
      referenceId: input.referenceId,
      accountNo: `90${(this.accounts.size + 1).toString().padStart(8, "0")}`,
      bankName: "Mock Microfinance Bank",
      amountKobo: input.amountKobo ?? null,
    };
    this.accounts.set(key, account);
    return account;
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    // Real adapters compute an HMAC of the payload with the partner secret.
    return signature === `${MockPaymentProvider.WEBHOOK_SECRET}:${payload.length}`;
  }

  /** Test-side helper matching verifyWebhookSignature's expectation. */
  signPayload(payload: string): string {
    return `${MockPaymentProvider.WEBHOOK_SECRET}:${payload.length}`;
  }

  async initiateTransfer(input: TransferRequest): Promise<TransferResult> {
    const existing = this.transfers.get(input.reference);
    if (existing) return existing; // idempotent per our reference
    if (input.amountKobo > this.balanceKobo) {
      const failed: TransferResult = {
        providerRef: `mock_tr_${input.reference}`,
        status: "failed",
        failureReason: "insufficient partner balance",
      };
      this.transfers.set(input.reference, failed);
      return failed;
    }
    this.balanceKobo -= input.amountKobo;
    const result: TransferResult = {
      providerRef: `mock_tr_${input.reference}`,
      status: "paid",
    };
    this.transfers.set(input.reference, result);
    return result;
  }

  async getBalance(): Promise<Kobo> {
    return this.balanceKobo;
  }

  /**
   * Simulates a customer/rider paying into a virtual account. Returns the
   * webhook event the partner would deliver (feed it to handlePaymentEvent).
   */
  simulateInboundPayment(accountNo: string, amountKobo: Kobo): PaymentEvent {
    const account = [...this.accounts.values()].find((a) => a.accountNo === accountNo);
    if (!account) throw new Error(`No mock virtual account ${accountNo}`);
    this.balanceKobo += amountKobo;
    this.eventSeq += 1;
    return {
      provider: this.name,
      eventId: `evt_${this.eventSeq.toString().padStart(6, "0")}`,
      type: "payment.received",
      accountNo,
      referenceId: account.referenceId,
      purpose: account.purpose,
      amountKobo,
    };
  }
}
