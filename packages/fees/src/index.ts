import type { FeeRule, Kobo } from "@meld/types";

/**
 * Delivery-fee resolution engine (01_SHARED_FOUNDATIONS §5).
 * Resolution order, first match wins:
 *   1. per-merchant override rule (Ops-negotiated custom rates)
 *   2. global zone/state rule (intrastate flat vs interstate by destination state)
 *   3. the matched rule's fallback fee, else the engine-level default
 * The fee is resolved once, at order creation, and stored on the order.
 */

export type FeeMatchSource =
  | "merchant_override"
  | "global_rule"
  | "fallback_default";

export interface ResolveFeeInput {
  merchantId: string;
  originState: string;
  destinationState: string;
  /** Candidate rules (typically all active rows from fee_rules). */
  rules: FeeRule[];
  /** Resolution instant — defaults to now. Rules outside their effective window are ignored. */
  at?: Date;
  /** Engine-level default when no rule matches at all (configured, not hardcoded). */
  defaultFeeKobo?: Kobo;
}

export interface ResolvedFee {
  feeKobo: Kobo;
  source: FeeMatchSource;
  ruleId: string | null;
  zone: "intrastate" | "interstate";
}

export class FeeResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FeeResolutionError";
  }
}

function isEffective(rule: FeeRule, at: Date): boolean {
  const from = new Date(rule.effectiveFrom).getTime();
  const to = rule.effectiveTo ? new Date(rule.effectiveTo).getTime() : Infinity;
  const t = at.getTime();
  return from <= t && t < to;
}

/** Applies one rule; returns null when the rule has no answer for this route. */
function applyRule(
  rule: FeeRule,
  zone: "intrastate" | "interstate",
  destinationState: string,
): Kobo | null {
  if (rule.type === "flat") {
    return rule.intrastateFeeKobo ?? rule.fallbackFeeKobo;
  }
  // by_state
  if (zone === "intrastate") {
    return rule.intrastateFeeKobo ?? rule.byState?.[destinationState] ?? rule.fallbackFeeKobo;
  }
  return rule.byState?.[destinationState] ?? rule.fallbackFeeKobo;
}

function assertFee(fee: Kobo, ruleId: string | null): void {
  if (!Number.isSafeInteger(fee) || fee < 0) {
    throw new FeeResolutionError(
      `Fee rule ${ruleId ?? "(default)"} produced an invalid kobo amount: ${fee}`,
    );
  }
}

export function resolveDeliveryFee(input: ResolveFeeInput): ResolvedFee {
  const at = input.at ?? new Date();
  const zone: "intrastate" | "interstate" =
    normalizeState(input.originState) === normalizeState(input.destinationState)
      ? "intrastate"
      : "interstate";
  const effective = input.rules.filter((r) => isEffective(r, at));
  // Newest effective_from wins within a scope (rules are versioned, never edited).
  const newestFirst = [...effective].sort(
    (a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime(),
  );

  const override = newestFirst.find(
    (r) => r.scope === "merchant" && r.merchantId === input.merchantId,
  );
  if (override) {
    const fee = applyRule(override, zone, input.destinationState);
    if (fee !== null) {
      assertFee(fee, override.id);
      return { feeKobo: fee, source: "merchant_override", ruleId: override.id, zone };
    }
  }

  const global = newestFirst.find((r) => r.scope === "global");
  if (global) {
    const fee = applyRule(global, zone, input.destinationState);
    if (fee !== null) {
      assertFee(fee, global.id);
      return { feeKobo: fee, source: "global_rule", ruleId: global.id, zone };
    }
  }

  if (input.defaultFeeKobo !== undefined) {
    assertFee(input.defaultFeeKobo, null);
    return { feeKobo: input.defaultFeeKobo, source: "fallback_default", ruleId: null, zone };
  }

  throw new FeeResolutionError(
    `No fee rule matches merchant ${input.merchantId} → ${input.destinationState} and no default is configured`,
  );
}

/** Case/whitespace-insensitive state comparison ("Lagos" === " lagos "). */
export function normalizeState(state: string): string {
  return state.trim().toLowerCase();
}
