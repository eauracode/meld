import type { Kobo, LedgerAccountType } from "@meld/types";
import type {
  AccountRef,
  EntryInput,
  LedgerStore,
  TransactionInput,
} from "./store";
import { normalBalance } from "./store";
import { LedgerError } from "./money";

interface StoredAccount extends AccountRef {
  id: string;
}

interface StoredTransaction {
  id: string;
  input: TransactionInput;
}

/**
 * In-memory LedgerStore for unit tests and the scripted end-to-end money
 * scenario. Mirrors the schema's semantics: append-only entries, balances
 * derived by summation (credits − debits), never a mutable balance column.
 */
export class MemoryLedgerStore implements LedgerStore {
  readonly accounts: StoredAccount[] = [];
  readonly transactions: StoredTransaction[] = [];
  private seq = 0;

  private nextId(prefix: string): string {
    this.seq += 1;
    return `${prefix}_${this.seq.toString().padStart(4, "0")}`;
  }

  async ensureAccount(ref: AccountRef): Promise<string> {
    const existing = this.accounts.find(
      (a) =>
        a.type === ref.type &&
        a.ownerType === ref.ownerType &&
        a.ownerId === ref.ownerId,
    );
    if (existing) return existing.id;
    const account: StoredAccount = { id: this.nextId("acct"), ...ref };
    this.accounts.push(account);
    return account.id;
  }

  async insertTransaction(input: TransactionInput): Promise<string> {
    for (const entry of input.entries) {
      if (!this.accounts.some((a) => a.id === entry.accountId)) {
        throw new LedgerError(`Unknown ledger account: ${entry.accountId}`);
      }
    }
    const id = this.nextId("tx");
    this.transactions.push({ id, input });
    return id;
  }

  async getBalance(accountId: string): Promise<Kobo> {
    let credits = 0;
    let debits = 0;
    for (const entry of this.allEntries()) {
      if (entry.accountId !== accountId) continue;
      credits += entry.creditKobo ?? 0;
      debits += entry.debitKobo ?? 0;
    }
    return credits - debits;
  }

  /** Balance with intuitive sign for the account's type (assets read positive). */
  async getNormalBalance(accountId: string): Promise<Kobo> {
    const account = this.accounts.find((a) => a.id === accountId);
    if (!account) throw new LedgerError(`Unknown ledger account: ${accountId}`);
    return normalBalance(account.type, await this.getBalance(accountId));
  }

  /** System-wide integrity check: total debits must equal total credits. */
  totals(): { debits: Kobo; credits: Kobo } {
    let debits = 0;
    let credits = 0;
    for (const entry of this.allEntries()) {
      debits += entry.debitKobo ?? 0;
      credits += entry.creditKobo ?? 0;
    }
    return { debits, credits };
  }

  balanceByType(type: LedgerAccountType): Promise<Kobo[]> {
    return Promise.all(
      this.accounts.filter((a) => a.type === type).map((a) => this.getBalance(a.id)),
    );
  }

  private *allEntries(): Iterable<EntryInput> {
    for (const tx of this.transactions) {
      yield* tx.input.entries;
    }
  }
}
