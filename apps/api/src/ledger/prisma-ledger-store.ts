import { Injectable } from "@nestjs/common";
import type { LedgerStore, AccountRef, TransactionInput } from "@meld/ledger";
import type { Kobo } from "@meld/types";
import { LedgerAccountType as PrismaLedgerAccountType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

/**
 * A LedgerStore (packages/ledger's storage interface) backed by real
 * Postgres via Prisma. `insertTransaction` runs inside a Prisma interactive
 * transaction — atomic all-or-nothing, replacing what the Postgres
 * `post_ledger_transaction` SECURITY DEFINER function did in the earlier
 * Supabase design. Balance is re-checked here as a second line of defence:
 * postTransaction() in @meld/ledger already calls validateTransaction()
 * before reaching this store, so this should never actually fire — it's
 * insurance against a caller bypassing that entry point.
 */
@Injectable()
export class PrismaLedgerStore implements LedgerStore {
  constructor(private prisma: PrismaService) {}

  async ensureAccount(ref: AccountRef): Promise<string> {
    const type = ref.type as PrismaLedgerAccountType;
    const existing = await this.prisma.ledgerAccount.findFirst({
      where: { type, ownerType: ref.ownerType, ownerId: ref.ownerId },
    });
    if (existing) return existing.id;

    const created = await this.prisma.ledgerAccount.create({
      data: { type, ownerType: ref.ownerType, ownerId: ref.ownerId },
    });
    return created.id;
  }

  async insertTransaction(input: TransactionInput): Promise<string> {
    let debits = 0n;
    let credits = 0n;
    for (const entry of input.entries) {
      debits += BigInt(entry.debitKobo ?? 0);
      credits += BigInt(entry.creditKobo ?? 0);
    }
    if (debits !== credits) {
      throw new Error(`Unbalanced ledger transaction: debit ${debits} <> credit ${credits}`);
    }

    const transactionId = await this.prisma.$transaction(async (tx) => {
      const created = await tx.ledgerTransaction.create({
        data: {
          sourceType: input.sourceType,
          sourceId: input.sourceId ?? null,
          memo: input.memo ?? null,
          createdById: input.createdBy ?? null,
        },
      });
      await tx.ledgerEntry.createMany({
        data: input.entries.map((entry) => ({
          transactionId: created.id,
          accountId: entry.accountId,
          debitKobo: BigInt(entry.debitKobo ?? 0),
          creditKobo: BigInt(entry.creditKobo ?? 0),
        })),
      });
      return created.id;
    });

    return transactionId;
  }

  async getBalance(accountId: string): Promise<Kobo> {
    const agg = await this.prisma.ledgerEntry.aggregate({
      where: { accountId },
      _sum: { debitKobo: true, creditKobo: true },
    });
    const debits = agg._sum.debitKobo ?? 0n;
    const credits = agg._sum.creditKobo ?? 0n;
    return Number(credits - debits);
  }
}
