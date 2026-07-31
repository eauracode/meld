import type { Recipient, RenderedMessage, Transport } from "./core";

/**
 * Termii SMS transport (https://developers.termii.com) — Nigeria-focused SMS
 * per 01_SHARED_FOUNDATIONS §7. NOTE: matches Termii's documented v1 API as
 * of this writing; reconfirm before going live. Not yet exercised against a
 * live account (10_IMPLEMENTATION_PLAN Phase 6).
 */

const BASE_URL = "https://api.ng.termii.com/api";

export interface TermiiConfig {
  apiKey: string;
  /** Registered sender ID shown as the SMS "from" (e.g. "MELD"). */
  senderId: string;
}

interface TermiiSendResponse {
  message_id?: string;
  message: string;
  balance?: number;
}

export class TermiiTransport implements Transport {
  readonly channel = "sms" as const;

  constructor(private config: TermiiConfig) {}

  async send(recipient: Recipient, message: RenderedMessage): Promise<void> {
    if (!recipient.phone) {
      throw new Error("TermiiTransport requires recipient.phone");
    }
    const res = await fetch(`${BASE_URL}/sms/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: this.config.apiKey,
        to: normalizePhone(recipient.phone),
        from: this.config.senderId,
        sms: `${message.title}: ${message.body}`,
        type: "plain",
        channel: "generic",
      }),
    });
    const body = (await res.json()) as TermiiSendResponse;
    if (!res.ok || !body.message_id) {
      throw new Error(`Termii send failed: ${body.message}`);
    }
  }
}

/** Termii expects international format without a leading "+" (e.g. 2348011122233). */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.startsWith("0")) return `234${digits.slice(1)}`;
  return digits;
}
