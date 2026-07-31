/**
 * Seeds the three MELD-owned ledger accounts (meld_revenue, partner_float,
 * suspense) — mirrors the seed insert at the bottom of the earlier
 * 07_DATABASE_SCHEMA.sql. Per-merchant/per-rider accounts are created on
 * approval (see MerchantsService.approve / RidersService.approve), not here.
 * Run via `npx prisma db seed` (wired in package.json's `prisma.seed` field)
 * after the first migration.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const meldAccounts: { type: "meld_revenue" | "partner_float" | "suspense" }[] = [
    { type: "meld_revenue" },
    { type: "partner_float" },
    { type: "suspense" },
  ];
  for (const account of meldAccounts) {
    // Prisma's compound-unique shorthand (upsert/findUnique on
    // type_ownerType_ownerId) rejects a literal `null` for ownerId even
    // though the column itself is nullable — a Prisma Client API
    // limitation, not a schema issue. findFirst + conditional create works
    // around it (PrismaLedgerStore.ensureAccount already does this).
    const existing = await prisma.ledgerAccount.findFirst({
      where: { type: account.type, ownerType: "meld", ownerId: null },
    });
    if (!existing) {
      await prisma.ledgerAccount.create({ data: { type: account.type, ownerType: "meld", ownerId: null } });
    }
  }
  console.log("Seeded MELD ledger accounts (meld_revenue, partner_float, suspense).");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
