import type { Kobo } from "@meld/types";

export class LedgerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LedgerError";
  }
}

export class UnbalancedTransactionError extends LedgerError {
  constructor(debits: Kobo, credits: Kobo) {
    super(`Unbalanced ledger transaction: debits ${debits} <> credits ${credits}`);
    this.name = "UnbalancedTransactionError";
  }
}

/** Asserts an amount is a non-negative safe integer (kobo). Floats are never money. */
export function assertKobo(amount: number, label = "amount"): asserts amount is Kobo {
  if (!Number.isSafeInteger(amount)) {
    throw new LedgerError(`${label} must be an integer kobo value, got ${amount}`);
  }
  if (amount < 0) {
    throw new LedgerError(`${label} must be >= 0, got ${amount}`);
  }
}

/** Asserts a strictly positive integer kobo amount. */
export function assertPositiveKobo(amount: number, label = "amount"): asserts amount is Kobo {
  assertKobo(amount, label);
  if (amount === 0) {
    throw new LedgerError(`${label} must be > 0`);
  }
}

/** Formats kobo as a naira string for memos/logs (display only — never arithmetic). */
export function formatNaira(kobo: Kobo): string {
  assertKobo(kobo);
  const naira = Math.floor(kobo / 100);
  const rem = kobo % 100;
  return `₦${naira.toLocaleString("en-NG")}.${rem.toString().padStart(2, "0")}`;
}
