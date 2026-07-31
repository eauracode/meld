import type { PaymentEvent } from "./provider";

/**
 * Webhook idempotency (06_TRD §3): every partner event id is recorded in
 * `processed_events`; a re-delivered event is acknowledged but never re-posted
 * to the ledger. Production store writes to Postgres; tests use memory.
 */
export interface ProcessedEventStore {
  /** Records (provider, eventId). Returns false when it was already recorded. */
  recordIfNew(provider: string, eventId: string): Promise<boolean>;
}

export class MemoryProcessedEventStore implements ProcessedEventStore {
  private seen = new Set<string>();
  async recordIfNew(provider: string, eventId: string): Promise<boolean> {
    const key = `${provider}:${eventId}`;
    if (this.seen.has(key)) return false;
    this.seen.add(key);
    return true;
  }
}

export type WebhookOutcome = "processed" | "duplicate";

/**
 * Handles a verified, normalized payment event exactly once.
 * `onPayment` performs the business reaction (post to ledger, flip
 * payment_status, notify) and runs only for first-time events.
 * Signature verification happens BEFORE this — never pass unverified events.
 */
export async function handlePaymentEvent(
  event: PaymentEvent,
  deps: {
    processed: ProcessedEventStore;
    onPayment: (event: PaymentEvent) => Promise<void>;
  },
): Promise<WebhookOutcome> {
  const isNew = await deps.processed.recordIfNew(event.provider, event.eventId);
  if (!isNew) return "duplicate";
  await deps.onPayment(event);
  return "processed";
}
