import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { PaystackProvider } from "./paystack-provider";
import { FlutterwaveProvider } from "./flutterwave-provider";

describe("PaystackProvider.verifyWebhookSignature", () => {
  const secretKey = "sk_test_abc123";
  const provider = new PaystackProvider({ secretKey });

  it("accepts a correctly signed payload (HMAC-SHA512 hex)", () => {
    const payload = JSON.stringify({ event: "charge.success", data: { amount: 220000 } });
    const signature = createHmac("sha512", secretKey).update(payload).digest("hex");
    expect(provider.verifyWebhookSignature(payload, signature)).toBe(true);
  });

  it("rejects a tampered payload", () => {
    const payload = JSON.stringify({ event: "charge.success", data: { amount: 220000 } });
    const signature = createHmac("sha512", secretKey).update(payload).digest("hex");
    const tampered = JSON.stringify({ event: "charge.success", data: { amount: 999999999 } });
    expect(provider.verifyWebhookSignature(tampered, signature)).toBe(false);
  });

  it("rejects a signature signed with the wrong secret", () => {
    const payload = JSON.stringify({ event: "charge.success" });
    const wrongSignature = createHmac("sha512", "sk_test_wrong").update(payload).digest("hex");
    expect(provider.verifyWebhookSignature(payload, wrongSignature)).toBe(false);
  });

  it("rejects a garbage signature without throwing", () => {
    expect(provider.verifyWebhookSignature("{}", "not-hex-at-all")).toBe(false);
    expect(provider.verifyWebhookSignature("{}", "")).toBe(false);
  });
});

describe("FlutterwaveProvider.verifyWebhookSignature", () => {
  const webhookSecretHash = "my-dashboard-configured-secret";
  const provider = new FlutterwaveProvider({ secretKey: "FLWSECK_TEST", webhookSecretHash });

  it("accepts the exact configured shared secret regardless of payload", () => {
    expect(provider.verifyWebhookSignature('{"anything":"here"}', webhookSecretHash)).toBe(true);
  });

  it("rejects any other value", () => {
    expect(provider.verifyWebhookSignature("{}", "wrong-secret")).toBe(false);
    expect(provider.verifyWebhookSignature("{}", "")).toBe(false);
    expect(provider.verifyWebhookSignature("{}", webhookSecretHash + "x")).toBe(false);
  });
});
