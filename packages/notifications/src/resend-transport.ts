import type { Recipient, RenderedMessage, Transport } from "./core";

/**
 * Resend email transport (https://resend.com/docs) — transactional email per
 * 01_SHARED_FOUNDATIONS §7. NOTE: matches Resend's documented API as of this
 * writing; reconfirm before going live. Not yet exercised against a live
 * account (10_IMPLEMENTATION_PLAN Phase 6).
 */

const BASE_URL = "https://api.resend.com";

export interface ResendConfig {
  apiKey: string;
  /** Verified sender, e.g. "MELD <notifications@meld.africa>". */
  fromAddress: string;
}

interface ResendSendResponse {
  id?: string;
  message?: string;
}

export class ResendTransport implements Transport {
  readonly channel = "email" as const;

  constructor(private config: ResendConfig) {}

  async send(recipient: Recipient, message: RenderedMessage): Promise<void> {
    if (!recipient.email) {
      throw new Error("ResendTransport requires recipient.email");
    }
    const res = await fetch(`${BASE_URL}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.config.fromAddress,
        to: [recipient.email],
        subject: message.title,
        html: `<p>${escapeHtml(message.body)}</p>`,
        text: message.body,
      }),
    });
    const body = (await res.json()) as ResendSendResponse;
    if (!res.ok || !body.id) {
      throw new Error(`Resend send failed: ${body.message ?? res.statusText}`);
    }
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
