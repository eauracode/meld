import { Injectable, OnModuleInit } from "@nestjs/common";
import type { AccountRef, TransactionInput } from "@meld/ledger";
import type { LedgerAccountType } from "@meld/types";
import { ledgerKit } from "../kits/ledger-kit";
import { PrismaLedgerStore } from "./prisma-ledger-store";

/**
 * Thin service wrapper so the rest of the app calls one injectable instead
 * of juggling the dynamic-import bridge (ledgerKit) directly everywhere.
 * Seeds the three MELD-owned accounts once on boot, mirroring the seed
 * insert at the bottom of the original 07_DATABASE_SCHEMA.sql.
 */
@Injectable()
export class LedgerService implements OnModuleInit {
  constructor(private store: PrismaLedgerStore) {}

  async onModuleInit(): Promise<void> {
    await this.ensureAccount({ type: "meld_revenue", ownerType: "meld", ownerId: null });
    await this.ensureAccount({ type: "partner_float", ownerType: "meld", ownerId: null });
    await this.ensureAccount({ type: "suspense", ownerType: "meld", ownerId: null });
  }

  async ensureAccount(ref: AccountRef): Promise<string> {
    return this.store.ensureAccount(ref);
  }

  /** Validates + posts a balanced transaction. Throws on any imbalance — see @meld/ledger's postTransaction. */
  async post(input: TransactionInput): Promise<string> {
    const kit = await ledgerKit();
    return kit.postTransaction(this.store, input);
  }

  /** Raw credit-minus-debit balance (packages/ledger's storage convention). */
  async getBalance(accountId: string): Promise<number> {
    return this.store.getBalance(accountId);
  }

  /** Balance with the intuitive sign for the account's type (assets read positive). */
  async getNormalBalance(accountId: string, type: LedgerAccountType): Promise<number> {
    const kit = await ledgerKit();
    return kit.normalBalance(type, await this.store.getBalance(accountId));
  }

  async splitDeliveryFee(feeKobo: number) {
    const kit = await ledgerKit();
    return kit.splitDeliveryFee(feeKobo);
  }
}
