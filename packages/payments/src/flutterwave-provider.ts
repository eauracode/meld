import { timingSafeEqual } from "node:crypto";
import type { Kobo, VirtualAccountPurpose } from "@meld/types";
import type {
  PaymentProvider,
  TransferRequest,
  TransferResult,
  VirtualAccountDetails,
} from "./provider";

/**
 * Flutterwave adapter (https://developer.flutterwave.com). Implements
 * PaymentProvider against Flutterwave's Virtual Account + Transfer APIs.
 *
 * NOTE: field names below match Flutterwave's documented v3 API as of this
 * writing — reconfirm against current docs before going live. Not yet
 * exercised against a live account (10_IMPLEMENTATION_PLAN Phase 6).
 * Flutterwave quotes money in whole naira, not kobo — every amount is
 * converted at the API boundary so the rest of the system stays kobo-only.
 */

const BASE_URL = "https://api.flutterwave.com/v3";

export interface FlutterwaveConfig {
  secretKey: string;
  /** Shared secret configured in the Flutterwave dashboard for webhook verification. */
  webhookSecretHash: string;
}

interface FlutterwaveResponse<T> {
  status: "success" | "error";
  message: string;
  data: T;
}

function koboToNaira(kobo: Kobo): number {
  return kobo / 100;
}
function nairaToKobo(naira: number): Kobo {
  return Math.round(naira * 100);
}

export class FlutterwaveProvider implements PaymentProvider {
  readonly name = "flutterwave" as const;

  constructor(private config: FlutterwaveConfig) {}

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.config.secretKey}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
    const body = (await res.json()) as FlutterwaveResponse<T>;
    if (!res.ok || body.status !== "success") {
      throw new Error(`Flutterwave API error (${res.status}): ${body.message}`);
    }
    return body.data;
  }

  /** Dynamic (non-permanent) virtual account tied to a specific reference + amount. */
  async createVirtualAccount(input: {
    purpose: VirtualAccountPurpose;
    referenceId: string;
    amountKobo?: Kobo;
  }): Promise<VirtualAccountDetails> {
    const va = await this.request<{ account_number: string; bank_name: string }>(
      "/virtual-account-numbers",
      {
        method: "POST",
        body: JSON.stringify({
          email: `${input.purpose}-${input.referenceId}@collections.meld.africa`,
          tx_ref: `${input.purpose}_${input.referenceId}`,
          is_permanent: false,
          narration: `MELD ${input.purpose === "delivery_payment" ? "delivery" : "remittance"} ${input.referenceId}`,
          ...(input.amountKobo ? { amount: koboToNaira(input.amountKobo) } : {}),
        }),
      },
    );

    return {
      provider: this.name,
      purpose: input.purpose,
      referenceId: input.referenceId,
      accountNo: va.account_number,
      bankName: va.bank_name,
      amountKobo: input.amountKobo ?? null,
    };
  }

  /**
   * Flutterwave webhooks are verified with a flat shared-secret compare
   * against the `verif-hash` header — NOT an HMAC of the payload. The
   * `payload` argument is accepted for interface symmetry with Paystack but
   * unused here (kept so callers don't need provider-specific branching).
   */
  verifyWebhookSignature(_payload: string, signature: string): boolean {
    const expected = Buffer.from(this.config.webhookSecretHash);
    const received = Buffer.from(signature);
    if (expected.length !== received.length) return false;
    return timingSafeEqual(expected, received);
  }

  async initiateTransfer(input: TransferRequest): Promise<TransferResult> {
    try {
      const transfer = await this.request<{ id: number; status: string }>("/transfers", {
        method: "POST",
        body: JSON.stringify({
          account_bank: input.bankCode,
          account_number: input.bankAccountNo,
          amount: koboToNaira(input.amountKobo),
          currency: "NGN",
          narration: `MELD payout ${input.reference}`,
          reference: input.reference,
        }),
      });
      return {
        providerRef: String(transfer.id),
        status: transfer.status === "SUCCESSFUL" ? "paid" : "processing",
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
    const balances = await this.request<{ currency: string; available_balance: number }[]>(
      "/balances",
    );
    const ngn = balances.find((b) => b.currency === "NGN");
    return nairaToKobo(ngn?.available_balance ?? 0);
  }
}
