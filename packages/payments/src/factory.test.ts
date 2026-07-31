import { describe, expect, it } from "vitest";
import { createPaymentProvider } from "./factory";
import { PaystackProvider } from "./paystack-provider";
import { FlutterwaveProvider } from "./flutterwave-provider";
import { MockPaymentProvider } from "./mock-provider";

describe("createPaymentProvider", () => {
  it("defaults to the mock provider when nothing is configured", () => {
    expect(createPaymentProvider({})).toBeInstanceOf(MockPaymentProvider);
  });

  it("auto-selects Paystack when its key is present, no explicit choice needed", () => {
    const provider = createPaymentProvider({ PAYSTACK_SECRET_KEY: "sk_test_x" });
    expect(provider).toBeInstanceOf(PaystackProvider);
  });

  it("auto-selects Flutterwave when its keys are present", () => {
    const provider = createPaymentProvider({
      FLUTTERWAVE_SECRET_KEY: "FLWSECK_TEST",
      FLUTTERWAVE_WEBHOOK_SECRET_HASH: "hash",
    });
    expect(provider).toBeInstanceOf(FlutterwaveProvider);
  });

  it("honors an explicit PAYMENT_PROVIDER selection", () => {
    const provider = createPaymentProvider({
      PAYMENT_PROVIDER: "paystack",
      PAYSTACK_SECRET_KEY: "sk_test_x",
      FLUTTERWAVE_SECRET_KEY: "FLWSECK_TEST", // present but should be ignored
      FLUTTERWAVE_WEBHOOK_SECRET_HASH: "hash",
    });
    expect(provider).toBeInstanceOf(PaystackProvider);
  });

  it("throws when explicitly asked for a provider whose key is missing", () => {
    expect(() => createPaymentProvider({ PAYMENT_PROVIDER: "paystack" })).toThrow(
      /PAYSTACK_SECRET_KEY/,
    );
    expect(() => createPaymentProvider({ PAYMENT_PROVIDER: "flutterwave" })).toThrow(
      /FLUTTERWAVE_SECRET_KEY/,
    );
  });
});
