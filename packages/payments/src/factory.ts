import type { PaymentProvider } from "./provider";
import { MockPaymentProvider } from "./mock-provider";
import { PaystackProvider } from "./paystack-provider";
import { FlutterwaveProvider } from "./flutterwave-provider";

/**
 * Picks the live provider when its keys are configured, otherwise falls back
 * to the mock — so every app keeps working in dev/CI with no keys set, and
 * flips to the real partner the moment PAYSTACK_SECRET_KEY or
 * FLUTTERWAVE_SECRET_KEY exists in the environment. Never throws for missing
 * config; only PAYMENT_PROVIDER=paystack|flutterwave with no matching key is
 * a hard error (a caller explicitly asked for a partner that isn't configured).
 */
export function createPaymentProvider(env: Record<string, string | undefined>): PaymentProvider {
  const requested = env.PAYMENT_PROVIDER?.toLowerCase();

  if (requested === "paystack" || (!requested && env.PAYSTACK_SECRET_KEY)) {
    if (!env.PAYSTACK_SECRET_KEY) {
      throw new Error("PAYMENT_PROVIDER=paystack but PAYSTACK_SECRET_KEY is not set");
    }
    return new PaystackProvider({
      secretKey: env.PAYSTACK_SECRET_KEY,
      preferredBank: env.PAYSTACK_PREFERRED_BANK,
    });
  }

  if (requested === "flutterwave" || (!requested && env.FLUTTERWAVE_SECRET_KEY)) {
    if (!env.FLUTTERWAVE_SECRET_KEY || !env.FLUTTERWAVE_WEBHOOK_SECRET_HASH) {
      throw new Error(
        "PAYMENT_PROVIDER=flutterwave but FLUTTERWAVE_SECRET_KEY / FLUTTERWAVE_WEBHOOK_SECRET_HASH is not set",
      );
    }
    return new FlutterwaveProvider({
      secretKey: env.FLUTTERWAVE_SECRET_KEY,
      webhookSecretHash: env.FLUTTERWAVE_WEBHOOK_SECRET_HASH,
    });
  }

  return new MockPaymentProvider();
}
