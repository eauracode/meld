import { createHmac, timingSafeEqual } from "node:crypto";
import type { Kobo, VirtualAccountPurpose } from "@meld/types";
import type {
  PaymentProvider,
  TransferRequest,
  TransferResult,
  VirtualAccountDetails,
} from "./provider";

/**
 * Paystack adapter (https://paystack.com/docs). Implements PaymentProvider
 * against Paystack's Dedicated Virtual Account + Transfer APIs.
 *
 * NOTE: field names below match Paystack's documented API as of this
 * writing — reconfirm against current docs before going live, API surfaces
 * do drift. Nothing here has been exercised against a live account (no keys
 * available at build time); this is a from-spec implementation pending a
 * real smoke test once PAYSTACK_SECRET_KEY exists (10_IMPLEMENTATION_PLAN
 * Phase 6).
 */

const BASE_URL = "https://api.paystack.co";

export interface PaystackConfig {
  secretKey: string;
  /** Preferred DVA-issuing bank, e.g. "wema-bank" or "titan-paystack". */
  preferredBank?: string;
}

interface PaystackResponse<T> {
  status: boolean;
  message: string;
  data: T;
}

export class PaystackProvider implements PaymentProvider {
  readonly name = "paystack" as const;

  constructor(private config: PaystackConfig) {}

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.config.secretKey}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
    const body = (await res.json()) as PaystackResponse<T>;
    if (!res.ok || !body.status) {
      throw new Error(`Paystack API error (${res.status}): ${body.message}`);
    }
    return body.data;
  }

  /**
   * A one-time virtual account requires a Paystack customer first. We create
   * a customer scoped to the reference id (delivery or remittance) so the
   * account is effectively single-purpose, then issue a Dedicated Virtual
   * Account against it.
   */
  async createVirtualAccount(input: {
    purpose: VirtualAccountPurpose;
    referenceId: string;
    amountKobo?: Kobo;
  }): Promise<VirtualAccountDetails> {
    const customer = await this.request<{ customer_code: string }>("/customer", {
      method: "POST",
      body: JSON.stringify({
        email: `${input.purpose}-${input.referenceId}@collections.meld.africa`,
        first_name: "MELD",
        last_name: input.purpose === "delivery_payment" ? "Delivery" : "Remittance",
      }),
    });

    const dva = await this.request<{ account_number: string; bank: { name: string } }>(
      "/dedicated_account",
      {
        method: "POST",
        body: JSON.stringify({
          customer: customer.customer_code,
          preferred_bank: this.config.preferredBank ?? "wema-bank",
        }),
      },
    );

    return {
      provider: this.name,
      purpose: input.purpose,
      referenceId: input.referenceId,
      accountNo: dva.account_number,
      bankName: dva.bank.name,
      amountKobo: input.amountKobo ?? null,
    };
  }

  /**
   * Paystack signs webhooks with HMAC-SHA512 of the raw body using the
   * secret key, sent as a lowercase hex digest in `x-paystack-signature`.
   * Constant-time comparison — never use === on secrets/signatures.
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    const expected = createHmac("sha512", this.config.secretKey).update(payload).digest("hex");
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(signature, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }

  async initiateTransfer(input: TransferRequest): Promise<TransferResult> {
    const recipient = await this.request<{ recipient_code: string }>("/transferrecipient", {
      method: "POST",
      body: JSON.stringify({
        type: "nuban",
        name: input.accountName,
        account_number: input.bankAccountNo,
        bank_code: input.bankCode,
        currency: "NGN",
      }),
    });

    try {
      const transfer = await this.request<{ reference: string; status: string }>("/transfer", {
        method: "POST",
        body: JSON.stringify({
          source: "balance",
          amount: input.amountKobo,
          recipient: recipient.recipient_code,
          reason: `MELD payout ${input.reference}`,
          reference: input.reference,
        }),
      });
      return {
        providerRef: transfer.reference,
        status: transfer.status === "success" ? "paid" : "processing",
      };
    } catch (error) {
      return {
        providerRef: input.reference,
        status: "failed",
        failureReason: error instanceof Error ? error.message : "Transfer failed",
      };
    }
  }

  async getBalance(): Promise<Kobo> {
    const balances = await this.request<{ currency: string; balance: number }[]>("/balance");
    const ngn = balances.find((b) => b.currency === "NGN");
    return ngn?.balance ?? 0; // Paystack reports balance in kobo already
  }
}
