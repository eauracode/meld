import type { Kobo } from "@meld/types";
import { assertKobo, LedgerError, UnbalancedTransactionError } from "./money";
import type { EntryInput, LedgerStore, TransactionInput } from "./store";

/**
 * Validates a transaction (without touching storage). Rules:
 * - at least two entries;
 * - every entry names an account and carries exactly one positive side;
 * - total debits === total credits.
 */
export function validateTransaction(input: TransactionInput): void {
  if (!input.entries || input.entries.length < 2) {
    throw new LedgerError("A ledger transaction needs at least two entries");
  }
  let debits: Kobo = 0;
  let credits: Kobo = 0;
  for (const entry of input.entries) {
    if (!entry.accountId) {
      throw new LedgerError("Every ledger entry must reference an account");
    }
    const debit = entry.debitKobo ?? 0;
    const credit = entry.creditKobo ?? 0;
    assertKobo(debit, "debitKobo");
    assertKobo(credit, "creditKobo");
    if (debit > 0 && credit > 0) {
      throw new LedgerError("An entry is either a debit or a credit, never both");
    }
    if (debit === 0 && credit === 0) {
      throw new LedgerError("An entry must carry a positive debit or credit");
    }
    debits += debit;
    credits += credit;
  }
  if (debits !== credits) {
    throw new UnbalancedTransactionError(debits, credits);
  }
}

/**
 * The single entry point for writing to the ledger. Rejects unbalanced or
 * malformed transactions before they reach storage; the database function
 * `post_ledger_transaction` re-checks balance as the last line of defence.
 */
export async function postTransaction(
  store: LedgerStore,
  input: TransactionInput,
): Promise<string> {
  validateTransaction(input);
  return store.insertTransaction(input);
}

/** Convenience constructors for readable posting definitions. */
export const debit = (accountId: string, amountKobo: Kobo): EntryInput => ({
  accountId,
  debitKobo: amountKobo,
});
export const credit = (accountId: string, amountKobo: Kobo): EntryInput => ({
  accountId,
  creditKobo: amountKobo,
});
