import { describe, expect, it } from "vitest";
import type { FeeRule } from "@meld/types";
import { FeeResolutionError, resolveDeliveryFee } from "./index";

const NOW = new Date("2026-07-01T00:00:00Z");

const globalRule: FeeRule = {
  id: "rule_global",
  scope: "global",
  merchantId: null,
  type: "by_state",
  intrastateFeeKobo: 150_000, // ₦1,500 intrastate
  byState: { Lagos: 250_000, Kano: 350_000 },
  fallbackFeeKobo: 300_000,
  effectiveFrom: "2026-01-01T00:00:00Z",
  effectiveTo: null,
};

const merchantOverride: FeeRule = {
  id: "rule_m1_flat",
  scope: "merchant",
  merchantId: "m1",
  type: "flat",
  intrastateFeeKobo: 100_000, // negotiated flat ₦1,000
  byState: null,
  fallbackFeeKobo: 100_000,
  effectiveFrom: "2026-03-01T00:00:00Z",
  effectiveTo: null,
};

describe("resolveDeliveryFee", () => {
  it("path 1: per-merchant override wins over the global rule", () => {
    const result = resolveDeliveryFee({
      merchantId: "m1",
      originState: "Lagos",
      destinationState: "Kano",
      rules: [globalRule, merchantOverride],
      at: NOW,
    });
    expect(result).toMatchObject({
      feeKobo: 100_000,
      source: "merchant_override",
      ruleId: "rule_m1_flat",
      zone: "interstate",
    });
  });

  it("path 2a: global intrastate flat fee when origin === destination", () => {
    const result = resolveDeliveryFee({
      merchantId: "m2",
      originState: "Lagos",
      destinationState: "lagos ", // normalization check
      rules: [globalRule, merchantOverride],
      at: NOW,
    });
    expect(result).toMatchObject({
      feeKobo: 150_000,
      source: "global_rule",
      zone: "intrastate",
    });
  });

  it("path 2b: global interstate fee by destination state", () => {
    const result = resolveDeliveryFee({
      merchantId: "m2",
      originState: "Lagos",
      destinationState: "Kano",
      rules: [globalRule],
      at: NOW,
    });
    expect(result).toMatchObject({ feeKobo: 350_000, source: "global_rule", zone: "interstate" });
  });

  it("path 2c: unlisted destination falls back to the rule's fallback fee", () => {
    const result = resolveDeliveryFee({
      merchantId: "m2",
      originState: "Lagos",
      destinationState: "Enugu",
      rules: [globalRule],
      at: NOW,
    });
    expect(result).toMatchObject({ feeKobo: 300_000, source: "global_rule" });
  });

  it("path 3: engine default when no rules exist", () => {
    const result = resolveDeliveryFee({
      merchantId: "m2",
      originState: "Lagos",
      destinationState: "Kano",
      rules: [],
      at: NOW,
      defaultFeeKobo: 200_000,
    });
    expect(result).toMatchObject({ feeKobo: 200_000, source: "fallback_default", ruleId: null });
  });

  it("throws when nothing matches and no default is configured", () => {
    expect(() =>
      resolveDeliveryFee({
        merchantId: "m2",
        originState: "Lagos",
        destinationState: "Kano",
        rules: [],
        at: NOW,
      }),
    ).toThrow(FeeResolutionError);
  });

  it("ignores rules outside their effective window (versioned fees)", () => {
    const expired: FeeRule = {
      ...merchantOverride,
      id: "rule_m1_old",
      intrastateFeeKobo: 50_000,
      fallbackFeeKobo: 50_000,
      effectiveFrom: "2025-01-01T00:00:00Z",
      effectiveTo: "2026-03-01T00:00:00Z",
    };
    const result = resolveDeliveryFee({
      merchantId: "m1",
      originState: "Lagos",
      destinationState: "Kano",
      rules: [expired, merchantOverride, globalRule],
      at: NOW,
    });
    expect(result.ruleId).toBe("rule_m1_flat");
    expect(result.feeKobo).toBe(100_000);

    const before = resolveDeliveryFee({
      merchantId: "m1",
      originState: "Lagos",
      destinationState: "Kano",
      rules: [expired, merchantOverride, globalRule],
      at: new Date("2026-02-01T00:00:00Z"),
    });
    expect(before.ruleId).toBe("rule_m1_old");
    expect(before.feeKobo).toBe(50_000);
  });

  it("newest effective rule wins within a scope", () => {
    const newer: FeeRule = {
      ...merchantOverride,
      id: "rule_m1_newer",
      intrastateFeeKobo: 120_000,
      fallbackFeeKobo: 120_000,
      effectiveFrom: "2026-06-01T00:00:00Z",
    };
    const result = resolveDeliveryFee({
      merchantId: "m1",
      originState: "Lagos",
      destinationState: "Kano",
      rules: [merchantOverride, newer, globalRule],
      at: NOW,
    });
    expect(result.ruleId).toBe("rule_m1_newer");
    expect(result.feeKobo).toBe(120_000);
  });
});
