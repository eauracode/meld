import { describe, expect, it, beforeEach } from "vitest";
import { MemoryLedgerStore } from "./memory-store";
import { postTransaction } from "./post";
import {
  buildCashRemittedPosting,
  buildCodCashCollectedPosting,
  buildPrepaidConfirmedPosting,
  buildWithdrawalPaidPosting,
} from "./postings";

/**
 * These tests assert the exact postings documented in 01_SHARED_FOUNDATIONS §4.
 * Amounts: order ₦20,000 (2,000,000 kobo), delivery fee ₦2,000 (200,000 kobo).
 */
describe("canonical postings (01_SHARED_FOUNDATIONS §4)", () => {
  let store: MemoryLedgerStore;
  let partnerFloat: string;
  let merchantPayable: string;
  let riderWallet: string;
  let meldRevenue: string;
  let cashInTransit: string;

  beforeEach(async () => {
    store = new MemoryLedgerStore();
    partnerFloat = await store.ensureAccount({ type: "partner_float", ownerType: "meld", ownerId: null });
    meldRevenue = await store.ensureAccount({ type: "meld_revenue", ownerType: "meld", ownerId: null });
    merchantPayable = await store.ensureAccount({ type: "merchant_payable", ownerType: "merchant", ownerId: "m1" });
    riderWallet = await store.ensureAccount({ type: "rider_wallet", ownerType: "rider", ownerId: "r1" });
    cashInTransit = await store.ensureAccount({ type: "cash_in_transit", ownerType: "rider", ownerId: "r1" });
  });

  it("prepaid, fee borne by customer: ₦22,000 collected → 20,000 / 1,600 / 400", async () => {
    const { tx, collectedKobo, merchantProceedsKobo } = buildPrepaidConfirmedPosting({
      accounts: { partnerFloat, merchantPayable, riderWallet, meldRevenue },
      deliveryId: "d1",
      orderValueKobo: 2_000_000,
      deliveryFeeKobo: 200_000,
      riderPayoutKobo: 160_000,
      feeBorneBy: "customer",
    });
    expect(collectedKobo).toBe(2_200_000);
    expect(merchantProceedsKobo).toBe(2_000_000);
    await postTransaction(store, tx);

    expect(await store.getNormalBalance(partnerFloat)).toBe(2_200_000);
    expect(await store.getBalance(merchantPayable)).toBe(2_000_000);
    expect(await store.getBalance(riderWallet)).toBe(160_000);
    expect(await store.getBalance(meldRevenue)).toBe(40_000);
  });

  it("prepaid, fee borne by merchant: ₦20,000 collected → merchant nets 18,000", async () => {
    const { tx, collectedKobo, merchantProceedsKobo } = buildPrepaidConfirmedPosting({
      accounts: { partnerFloat, merchantPayable, riderWallet, meldRevenue },
      deliveryId: "d1",
      orderValueKobo: 2_000_000,
      deliveryFeeKobo: 200_000,
      riderPayoutKobo: 160_000,
      feeBorneBy: "merchant",
    });
    expect(collectedKobo).toBe(2_000_000);
    expect(merchantProceedsKobo).toBe(1_800_000);
    await postTransaction(store, tx);
    expect(await store.getBalance(merchantPayable)).toBe(1_800_000);
    expect(await store.getBalance(riderWallet)).toBe(160_000);
    expect(await store.getBalance(meldRevenue)).toBe(40_000);
  });

  it("COD cash collected: merchant owed cash − fee; cash sits in transit", async () => {
    const { tx, merchantProceedsKobo } = buildCodCashCollectedPosting({
      accounts: { cashInTransit, merchantPayable, riderWallet, meldRevenue },
      deliveryId: "d2",
      cashAmountKobo: 2_000_000,
      deliveryFeeKobo: 200_000,
      riderPayoutKobo: 160_000,
    });
    expect(merchantProceedsKobo).toBe(1_800_000);
    await postTransaction(store, tx);

    expect(await store.getNormalBalance(cashInTransit)).toBe(2_000_000);
    expect(await store.getBalance(merchantPayable)).toBe(1_800_000);
    expect(await store.getBalance(riderWallet)).toBe(160_000);
    expect(await store.getBalance(meldRevenue)).toBe(40_000);
  });

  it("cash remitted moves cash in transit → partner float", async () => {
    const cod = buildCodCashCollectedPosting({
      accounts: { cashInTransit, merchantPayable, riderWallet, meldRevenue },
      deliveryId: "d2",
      cashAmountKobo: 2_000_000,
      deliveryFeeKobo: 200_000,
      riderPayoutKobo: 160_000,
    });
    await postTransaction(store, cod.tx);
    await postTransaction(
      store,
      buildCashRemittedPosting({
        accounts: { partnerFloat, cashInTransit },
        remittanceId: "rem1",
        amountKobo: 2_000_000,
      }),
    );
    expect(await store.getNormalBalance(cashInTransit)).toBe(0);
    expect(await store.getNormalBalance(partnerFloat)).toBe(2_000_000);
  });

  it("withdrawal draws down the owner account against partner float", async () => {
    const prepaid = buildPrepaidConfirmedPosting({
      accounts: { partnerFloat, merchantPayable, riderWallet, meldRevenue },
      deliveryId: "d1",
      orderValueKobo: 2_000_000,
      deliveryFeeKobo: 200_000,
      riderPayoutKobo: 160_000,
      feeBorneBy: "customer",
    });
    await postTransaction(store, prepaid.tx);
    await postTransaction(
      store,
      buildWithdrawalPaidPosting({
        accounts: { owner: riderWallet, partnerFloat },
        withdrawalId: "w1",
        amountKobo: 160_000,
      }),
    );
    expect(await store.getBalance(riderWallet)).toBe(0);
    expect(await store.getNormalBalance(partnerFloat)).toBe(2_040_000);
  });

  it("rejects COD where the fee exceeds cash collected", () => {
    expect(() =>
      buildCodCashCollectedPosting({
        accounts: { cashInTransit, merchantPayable, riderWallet, meldRevenue },
        deliveryId: "d3",
        cashAmountKobo: 100_000,
        deliveryFeeKobo: 200_000,
        riderPayoutKobo: 160_000,
      }),
    ).toThrow(/fee exceeds cash/i);
  });

  it("keeps system-wide debits === credits across every scenario", async () => {
    const prepaid = buildPrepaidConfirmedPosting({
      accounts: { partnerFloat, merchantPayable, riderWallet, meldRevenue },
      deliveryId: "d1",
      orderValueKobo: 2_000_000,
      deliveryFeeKobo: 200_000,
      riderPayoutKobo: 160_000,
      feeBorneBy: "customer",
    });
    await postTransaction(store, prepaid.tx);
    const cod = buildCodCashCollectedPosting({
      accounts: { cashInTransit, merchantPayable, riderWallet, meldRevenue },
      deliveryId: "d2",
      cashAmountKobo: 2_000_000,
      deliveryFeeKobo: 200_000,
      riderPayoutKobo: 160_000,
    });
    await postTransaction(store, cod.tx);
    const { debits, credits } = store.totals();
    expect(debits).toBe(credits);
  });
});
