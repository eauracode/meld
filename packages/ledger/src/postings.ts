import type { FeeBorneBy, Kobo } from "@meld/types";
import { assertKobo, assertPositiveKobo, LedgerError } from "./money";
import { splitDeliveryFee } from "./split";
import { credit, debit } from "./post";
import type { TransactionInput } from "./store";

/**
 * Posting builders — the canonical money movements from 01_SHARED_FOUNDATIONS §4.
 * Each returns a TransactionInput to feed postTransaction(). Builders take
 * resolved account ids; account lookup/creation is the caller's concern
 * (LedgerStore.ensureAccount).
 */

export interface DeliveryPostingAccounts {
  partnerFloat: string;
  merchantPayable: string;
  riderWallet: string;
  meldRevenue: string;
}

export interface PrepaidConfirmedInput {
  accounts: DeliveryPostingAccounts;
  deliveryId: string;
  orderValueKobo: Kobo;
  deliveryFeeKobo: Kobo;
  /** Who bears the fee (per-merchant setting). Affects what the customer pays
   *  and what the merchant nets — never the 80/20 split itself. */
  feeBorneBy: FeeBorneBy;
  riderShareBps?: number;
  createdBy?: string | null;
}

/**
 * Prepaid delivery: customer paid into the delivery's virtual account.
 *   Dr partner float (total collected)
 *     Cr merchant payable (merchant's proceeds)
 *     Cr rider wallet (80% of fee)  /  Cr MELD revenue (20% of fee)
 *
 * fee borne by customer → customer pays value + fee; merchant nets full value.
 * fee borne by merchant → customer pays value; merchant nets value − fee.
 */
export function buildPrepaidConfirmedPosting(input: PrepaidConfirmedInput): {
  tx: TransactionInput;
  collectedKobo: Kobo;
  merchantProceedsKobo: Kobo;
} {
  const { accounts, orderValueKobo, deliveryFeeKobo, feeBorneBy } = input;
  assertKobo(orderValueKobo, "orderValueKobo");
  assertKobo(deliveryFeeKobo, "deliveryFeeKobo");

  const { riderKobo, meldKobo } = splitDeliveryFee(deliveryFeeKobo, input.riderShareBps);
  const collectedKobo =
    feeBorneBy === "customer" ? orderValueKobo + deliveryFeeKobo : orderValueKobo;
  const merchantProceedsKobo =
    feeBorneBy === "customer" ? orderValueKobo : orderValueKobo - deliveryFeeKobo;
  if (merchantProceedsKobo < 0) {
    throw new LedgerError("Delivery fee exceeds order value with fee borne by merchant");
  }

  const tx: TransactionInput = {
    sourceType: "delivery",
    sourceId: input.deliveryId,
    memo: "Prepaid delivery payment confirmed",
    createdBy: input.createdBy ?? null,
    entries: [
      debit(accounts.partnerFloat, collectedKobo),
      credit(accounts.merchantPayable, merchantProceedsKobo),
      credit(accounts.riderWallet, riderKobo),
      credit(accounts.meldRevenue, meldKobo),
    ].filter((e) => (e.debitKobo ?? 0) > 0 || (e.creditKobo ?? 0) > 0),
  };
  return { tx, collectedKobo, merchantProceedsKobo };
}

export interface CodCashCollectedInput {
  accounts: Omit<DeliveryPostingAccounts, "partnerFloat"> & { cashInTransit: string };
  deliveryId: string;
  /** Cash the customer handed to the rider. */
  cashAmountKobo: Kobo;
  deliveryFeeKobo: Kobo;
  riderShareBps?: number;
  createdBy?: string | null;
}

/**
 * COD: rider marked cash collected. MELD nets its fee from COD proceeds —
 * the merchant is owed cash − fee (00_MASTER_PRD §4 Scenario B).
 *   Dr cash in transit (cash held by rider)
 *     Cr merchant payable (cash − fee)
 *     Cr rider wallet (80%)  /  Cr MELD revenue (20%)
 */
export function buildCodCashCollectedPosting(input: CodCashCollectedInput): {
  tx: TransactionInput;
  merchantProceedsKobo: Kobo;
} {
  const { accounts, cashAmountKobo, deliveryFeeKobo } = input;
  assertPositiveKobo(cashAmountKobo, "cashAmountKobo");
  assertKobo(deliveryFeeKobo, "deliveryFeeKobo");
  const merchantProceedsKobo = cashAmountKobo - deliveryFeeKobo;
  if (merchantProceedsKobo < 0) {
    throw new LedgerError("Delivery fee exceeds cash collected on COD delivery");
  }
  const { riderKobo, meldKobo } = splitDeliveryFee(deliveryFeeKobo, input.riderShareBps);

  const tx: TransactionInput = {
    sourceType: "delivery",
    sourceId: input.deliveryId,
    memo: "COD cash collected",
    createdBy: input.createdBy ?? null,
    entries: [
      debit(accounts.cashInTransit, cashAmountKobo),
      credit(accounts.merchantPayable, merchantProceedsKobo),
      credit(accounts.riderWallet, riderKobo),
      credit(accounts.meldRevenue, meldKobo),
    ].filter((e) => (e.debitKobo ?? 0) > 0 || (e.creditKobo ?? 0) > 0),
  };
  return { tx, merchantProceedsKobo };
}

export interface CashRemittedInput {
  accounts: { partnerFloat: string; cashInTransit: string };
  remittanceId: string;
  amountKobo: Kobo;
  createdBy?: string | null;
}

/** Rider paid collected cash into MELD's remittance virtual account:
 *  Dr partner float / Cr cash in transit. */
export function buildCashRemittedPosting(input: CashRemittedInput): TransactionInput {
  assertPositiveKobo(input.amountKobo, "amountKobo");
  return {
    sourceType: "remittance",
    sourceId: input.remittanceId,
    memo: "COD cash remitted",
    createdBy: input.createdBy ?? null,
    entries: [
      debit(input.accounts.partnerFloat, input.amountKobo),
      credit(input.accounts.cashInTransit, input.amountKobo),
    ],
  };
}

export interface WithdrawalPaidInput {
  accounts: {
    /** merchant_payable or rider_wallet account being drawn down. */
    owner: string;
    partnerFloat: string;
  };
  withdrawalId: string;
  amountKobo: Kobo;
  createdBy?: string | null;
}

/** Payout executed via partner: Dr owner account / Cr partner float.
 *  Callers must have verified amount ≤ available balance before requesting. */
export function buildWithdrawalPaidPosting(input: WithdrawalPaidInput): TransactionInput {
  assertPositiveKobo(input.amountKobo, "amountKobo");
  return {
    sourceType: "withdrawal",
    sourceId: input.withdrawalId,
    memo: "Withdrawal paid out via partner",
    createdBy: input.createdBy ?? null,
    entries: [
      debit(input.accounts.owner, input.amountKobo),
      credit(input.accounts.partnerFloat, input.amountKobo),
    ],
  };
}
