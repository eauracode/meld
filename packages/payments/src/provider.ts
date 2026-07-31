import type { Kobo, PaymentProviderName, VirtualAccountPurpose } from "@meld/types";

/**
 * Payment-partner abstraction (06_TRD §4). Paystack and Flutterwave adapters
 * implement this interface; MockPaymentProvider drives dev and tests.
 * Real money never moves outside an implementation of this interface.
 */

export interface VirtualAccountDetails {
  provider: PaymentProviderName;
  purpose: VirtualAccountPurpose;
  /** The delivery id or remittance id this account collects for. */
  referenceId: string;
  accountNo: string;
  bankName: string;
  /** Expected amount, when fixed (prepaid collection); null for open remittance. */
  amountKobo: Kobo | null;
}

export interface TransferRequest {
  amountKobo: Kobo;
  bankName: string;
  /** NIBSS bank code — required by both Paystack and Flutterwave transfer APIs. */
  bankCode: string;
  bankAccountNo: string;
  accountName: string;
  /** Our withdrawal/settlement id — used as the idempotency key with the partner. */
  reference: string;
}

export interface TransferResult {
  providerRef: string;
  status: "processing" | "paid" | "failed";
  failureReason?: string;
}

/** A payment event as normalized from a partner webhook. */
export interface PaymentEvent {
  provider: PaymentProviderName;
  /** Partner's unique event id — the idempotency key. */
  eventId: string;
  type: "payment.received";
  accountNo: string;
  referenceId: string;
  purpose: VirtualAccountPurpose;
  amountKobo: Kobo;
  raw?: unknown;
}

export interface PaymentProvider {
  readonly name: PaymentProviderName;
  /**
   * Creates (or returns the existing) virtual account for a reference.
   * MUST be idempotent per (purpose, referenceId) — a delivery never gets two
   * account numbers (04_PRD_Rider FR-3).
   */
  createVirtualAccount(input: {
    purpose: VirtualAccountPurpose;
    referenceId: string;
    amountKobo?: Kobo;
  }): Promise<VirtualAccountDetails>;
  /** Verifies a raw webhook payload's signature before anything is trusted. */
  verifyWebhookSignature(payload: string, signature: string): boolean;
  /** Executes a payout (merchant settlement / rider withdrawal). */
  initiateTransfer(input: TransferRequest): Promise<TransferResult>;
  /** Partner-held balance, for the daily float reconciliation job. */
  getBalance(): Promise<Kobo>;
}
