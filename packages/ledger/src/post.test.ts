import { describe, expect, it } from "vitest";
import { MemoryLedgerStore } from "./memory-store";
import { credit, debit, postTransaction } from "./post";
import { UnbalancedTransactionError } from "./money";

async function seededStore() {
  const store = new MemoryLedgerStore();
  const a = await store.ensureAccount({ type: "partner_float", ownerType: "meld", ownerId: null });
  const b = await store.ensureAccount({ type: "meld_revenue", ownerType: "meld", ownerId: null });
  return { store, a, b };
}

describe("postTransaction", () => {
  it("accepts a balanced transaction and derives balances from entries", async () => {
    const { store, a, b } = await seededStore();
    await postTransaction(store, {
      sourceType: "adjustment",
      entries: [debit(a, 5_000), credit(b, 5_000)],
    });
    expect(await store.getBalance(a)).toBe(-5_000); // credits − debits convention
    expect(await store.getNormalBalance(a)).toBe(5_000); // partner_float is debit-normal
    expect(await store.getBalance(b)).toBe(5_000);
  });

  it("rejects unbalanced transactions", async () => {
    const { store, a, b } = await seededStore();
    await expect(
      postTransaction(store, {
        sourceType: "adjustment",
        entries: [debit(a, 5_000), credit(b, 4_999)],
      }),
    ).rejects.toThrow(UnbalancedTransactionError);
    expect(store.transactions).toHaveLength(0); // nothing reached storage
  });

  it("rejects an entry that is both debit and credit, or neither", async () => {
    const { store, a, b } = await seededStore();
    await expect(
      postTransaction(store, {
        sourceType: "adjustment",
        entries: [{ accountId: a, debitKobo: 100, creditKobo: 100 }, credit(b, 0)],
      }),
    ).rejects.toThrow(/either a debit or a credit/);
    await expect(
      postTransaction(store, {
        sourceType: "adjustment",
        entries: [{ accountId: a }, credit(b, 0)],
      }),
    ).rejects.toThrow(/positive debit or credit/);
  });

  it("rejects single-entry and float-amount transactions", async () => {
    const { store, a, b } = await seededStore();
    await expect(
      postTransaction(store, { sourceType: "adjustment", entries: [debit(a, 100)] }),
    ).rejects.toThrow(/at least two entries/);
    await expect(
      postTransaction(store, {
        sourceType: "adjustment",
        entries: [debit(a, 10.5), credit(b, 10.5)],
      }),
    ).rejects.toThrow(/integer kobo/);
  });
});
