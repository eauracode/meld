import type {
  Kobo,
  LedgerAccountType,
  LedgerOwnerType,
  LedgerSourceType,
} from "@meld/types";

/** Identifies a ledger account by type + owner (e.g. rider_wallet for rider X). */
export interface AccountRef {
  type: LedgerAccountType;
  ownerType: LedgerOwnerType | null;
  ownerId: string | null;
}

/** One side of a posting. Exactly one of debitKobo/creditKobo must be > 0. */
export interface EntryInput {
  accountId: string;
  debitKobo?: Kobo;
  creditKobo?: Kobo;
}

export interface TransactionInput {
  sourceType: LedgerSourceType;
  sourceId?: string | null;
  memo?: string;
  createdBy?: string | null;
  entries: EntryInput[];
}

/**
 * Storage boundary for the ledger. Production implementation calls the
 * `post_ledger_transaction` Postgres function (SECURITY DEFINER) via @meld/db;
 * tests use MemoryLedgerStore. Either way, postings only enter storage through
 * postTransaction(), which enforces balance before insert.
 */
export interface LedgerStore {
  /** Finds or creates the account for a ref; returns its id. */
  ensureAccount(ref: AccountRef): Promise<string>;
  /** Inserts an already-validated transaction atomically; returns transaction id. */
  insertTransaction(input: TransactionInput): Promise<string>;
  /**
   * Balance in the schema's `ledger_balances` convention: credits − debits.
   * Liability-style accounts (merchant_payable, rider_wallet, meld_revenue)
   * read positive; asset-style accounts (partner_float, cash_in_transit) read
   * negative here — use normalBalance() for the intuitive sign.
   */
  getBalance(accountId: string): Promise<Kobo>;
}

/** Account types whose intuitive balance is debit-normal (assets MELD holds/awaits). */
const DEBIT_NORMAL: ReadonlySet<LedgerAccountType> = new Set([
  "partner_float",
  "cash_in_transit",
]);

/** Flips asset-account signs so every account reads positive in the intuitive direction. */
export function normalBalance(type: LedgerAccountType, creditMinusDebit: Kobo): Kobo {
  if (!DEBIT_NORMAL.has(type)) return creditMinusDebit;
  // `+ 0` folds JavaScript's negative zero back to 0 for settled accounts.
  return -creditMinusDebit + 0;
}
