import { describe, expect, it } from "vitest";
import { MemoryLedgerStore } from "./memory-store";
import { postTransaction } from "./post";
import {
  buildCashRemittedPosting,
  buildCodCashCollectedPosting,
  buildPrepaidConfirmedPosting,
  buildWithdrawalPaidPosting,
} from "./postings";

/**
 * Phase 1 definition-of-done: a scripted end-to-end money scenario
 * (prepaid + COD) posts correct balances (10_IMPLEMENTATION_PLAN Phase 1).
 * MemoryLedgerStore stands in for the test DB until the Supabase project
 * exists; the same postings will then flow through post_ledger_transaction.
 *
 * Story: merchant Amara, rider Tunde.
 *  1. Prepaid order  ₦20,000 goods + ₦2,000 fee (customer pays ₦22,000).
 *  2. COD order      ₦20,000 cash, ₦2,000 fee (merchant nets ₦18,000).
 *  3. Tunde remits the ₦20,000 COD cash.
 *  4. Tunde withdraws his full wallet (₦3,200 = 2 × ₦1,600).
 *  5. Amara withdraws her full balance (₦38,000).
 * End state: MELD keeps ₦800 revenue backed by ₦800 of partner float.
 */
describe("end-to-end money scenario (prepaid + COD)", () => {
  it("settles everyone to the exact kobo", async () => {
    const store = new MemoryLedgerStore();
    const partnerFloat = await store.ensureAccount({ type: "partner_float", ownerType: "meld", ownerId: null });
    const meldRevenue = await store.ensureAccount({ type: "meld_revenue", ownerType: "meld", ownerId: null });
    const amara = await store.ensureAccount({ type: "merchant_payable", ownerType: "merchant", ownerId: "amara" });
    const tundeWallet = await store.ensureAccount({ type: "rider_wallet", ownerType: "rider", ownerId: "tunde" });
    const tundeCash = await store.ensureAccount({ type: "cash_in_transit", ownerType: "rider", ownerId: "tunde" });

    // 1. Prepaid delivery: customer transfers ₦22,000 into the delivery VA.
    const prepaid = buildPrepaidConfirmedPosting({
      accounts: { partnerFloat, merchantPayable: amara, riderWallet: tundeWallet, meldRevenue },
      deliveryId: "delivery_prepaid",
      orderValueKobo: 2_000_000,
      deliveryFeeKobo: 200_000,
      riderPayoutKobo: 160_000,
      feeBorneBy: "customer",
    });
    await postTransaction(store, prepaid.tx);

    // 2. COD delivery: customer hands Tunde ₦20,000 cash.
    const cod = buildCodCashCollectedPosting({
      accounts: { cashInTransit: tundeCash, merchantPayable: amara, riderWallet: tundeWallet, meldRevenue },
      deliveryId: "delivery_cod",
      cashAmountKobo: 2_000_000,
      deliveryFeeKobo: 200_000,
      riderPayoutKobo: 160_000,
    });
    await postTransaction(store, cod.tx);

    // Mid-flight checks.
    expect(await store.getBalance(amara)).toBe(3_800_000); // 20,000 + 18,000
    expect(await store.getBalance(tundeWallet)).toBe(320_000); // 2 × 1,600
    expect(await store.getBalance(meldRevenue)).toBe(80_000); // 2 × 400
    expect(await store.getNormalBalance(tundeCash)).toBe(2_000_000); // cash in Tunde's hands
    expect(await store.getNormalBalance(partnerFloat)).toBe(2_200_000);

    // 3. Tunde remits the COD cash into MELD's remittance VA.
    await postTransaction(
      store,
      buildCashRemittedPosting({
        accounts: { partnerFloat, cashInTransit: tundeCash },
        remittanceId: "rem_1",
        amountKobo: 2_000_000,
      }),
    );
    expect(await store.getNormalBalance(tundeCash)).toBe(0); // fully reconciled
    expect(await store.getNormalBalance(partnerFloat)).toBe(4_200_000);

    // 4 & 5. Withdrawals (validated ≤ balance before posting).
    const tundeBalance = await store.getBalance(tundeWallet);
    expect(tundeBalance).toBe(320_000);
    await postTransaction(
      store,
      buildWithdrawalPaidPosting({
        accounts: { owner: tundeWallet, partnerFloat },
        withdrawalId: "w_tunde",
        amountKobo: tundeBalance,
      }),
    );
    const amaraBalance = await store.getBalance(amara);
    expect(amaraBalance).toBe(3_800_000);
    await postTransaction(
      store,
      buildWithdrawalPaidPosting({
        accounts: { owner: amara, partnerFloat },
        withdrawalId: "w_amara",
        amountKobo: amaraBalance,
      }),
    );

    // End state: everyone settled, MELD's ₦800 revenue backed 1:1 by float.
    expect(await store.getBalance(tundeWallet)).toBe(0);
    expect(await store.getBalance(amara)).toBe(0);
    expect(await store.getBalance(meldRevenue)).toBe(80_000);
    expect(await store.getNormalBalance(partnerFloat)).toBe(80_000);

    // Ledger integrity: debits === credits across the whole system, always.
    const { debits, credits } = store.totals();
    expect(debits).toBe(credits);
  });
});
