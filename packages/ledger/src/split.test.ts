import { describe, expect, it } from "vitest";
import { RIDER_SHARE_BPS, splitDeliveryFee } from "./split";

describe("splitDeliveryFee (80/20)", () => {
  it("splits ₦2,000 fee into ₦1,600 rider / ₦400 MELD (doc example)", () => {
    expect(splitDeliveryFee(200_000)).toEqual({ riderKobo: 160_000, meldKobo: 40_000 });
  });

  it("never loses or creates a kobo, rounding rider share down", () => {
    // 8000 bps of 33 kobo = 26.4 → rider 26, MELD 7; 26 + 7 = 33.
    expect(splitDeliveryFee(33)).toEqual({ riderKobo: 26, meldKobo: 7 });
    for (const fee of [0, 1, 7, 99, 101, 12_345, 987_654_321]) {
      const { riderKobo, meldKobo } = splitDeliveryFee(fee);
      expect(riderKobo + meldKobo).toBe(fee);
      expect(riderKobo).toBeGreaterThanOrEqual(0);
      expect(meldKobo).toBeGreaterThanOrEqual(0);
    }
  });

  it("respects a configured share other than the default", () => {
    expect(RIDER_SHARE_BPS).toBe(8000);
    expect(splitDeliveryFee(200_000, 7500)).toEqual({
      riderKobo: 150_000,
      meldKobo: 50_000,
    });
  });

  it("rejects floats and negative amounts", () => {
    expect(() => splitDeliveryFee(100.5)).toThrow(/integer kobo/);
    expect(() => splitDeliveryFee(-1)).toThrow(/>= 0/);
    expect(() => splitDeliveryFee(1000, 10_001)).toThrow(/riderShareBps/);
  });
});
