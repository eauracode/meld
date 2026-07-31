import type { Transport } from "./core";
import { MockTransport } from "./core";
import { TermiiTransport } from "./termii-transport";
import { ResendTransport } from "./resend-transport";

/**
 * Builds the transport list from environment config. Each channel falls back
 * to a MockTransport independently when its keys are absent, so a Notifier
 * built from this always has both an "sms" and "email" entry — dev/CI never
 * needs real keys, and each channel flips to the real provider the moment
 * its keys exist (mirrors packages/payments' createPaymentProvider).
 */
export function createTransports(env: Record<string, string | undefined>): Transport[] {
  const sms: Transport =
    env.TERMII_API_KEY && env.TERMII_SENDER_ID
      ? new TermiiTransport({ apiKey: env.TERMII_API_KEY, senderId: env.TERMII_SENDER_ID })
      : new MockTransport("sms");

  const email: Transport =
    env.RESEND_API_KEY && env.RESEND_FROM_EMAIL
      ? new ResendTransport({ apiKey: env.RESEND_API_KEY, fromAddress: env.RESEND_FROM_EMAIL })
      : new MockTransport("email");

  return [sms, email];
}
