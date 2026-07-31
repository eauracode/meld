import type { Kobo } from "@meld/types";
import { assertKobo, LedgerError } from "./money";

/**
 * The rider's share of every delivery fee, in basis points (80.00%).
 * A system constant per 01_SHARED_FOUNDATIONS §5 — held in config so it can
 * change without code edits; callers may override via the second argument.
 */
export const RIDER_SHARE_BPS = 8000;
export const BPS_DENOMINATOR = 10000;

export interface FeeSplit {
  riderKobo: Kobo;
  meldKobo: Kobo;
}

/**
 * Splits a delivery fee between rider and MELD.
 * Rounds the rider share down; MELD takes the remainder, so
 * riderKobo + meldKobo === feeKobo always (no kobo is ever lost or created).
 */
export function splitDeliveryFee(
  feeKobo: Kobo,
  riderShareBps: number = RIDER_SHARE_BPS,
): FeeSplit {
  assertKobo(feeKobo, "feeKobo");
  if (
    !Number.isSafeInteger(riderShareBps) ||
    riderShareBps < 0 ||
    riderShareBps > BPS_DENOMINATOR
  ) {
    throw new LedgerError(`riderShareBps must be an integer in [0, ${BPS_DENOMINATOR}]`);
  }
  const riderKobo = Math.floor((feeKobo * riderShareBps) / BPS_DENOMINATOR);
  return { riderKobo, meldKobo: feeKobo - riderKobo };
}
