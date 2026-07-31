# MELD

Powering every step of e-commerce. Four connected web apps (marketing, merchant,
rider, ops) on one Supabase backend, with a double-entry ledger money core.

Full product & engineering documentation lives in [docs/](docs/) — start with
`docs/README.md`, then `00_MASTER_PRD.md` and `01_SHARED_FOUNDATIONS.md`.

## Layout

```
apps/           marketing | merchant | rider | ops   (Next.js — built in Phases 2–5)
packages/
  types/        shared domain types (enums, entities) mirroring the DB schema
  db/           Supabase client factory
  ledger/       double-entry ledger core: postings, 80/20 split, balances
  fees/         delivery-fee resolution engine (override → zone/state → fallback)
  payments/     payment-partner interface + mock adapter + idempotent webhooks
  notifications/ SMS / email / in-app dispatch (mock transports in dev)
  auth/         role guards
  ui/           brand tokens + shared components ("Bold Tech" design system)
supabase/
  migrations/   SQL migrations (source of truth: docs/07_DATABASE_SCHEMA.sql)
  functions/    Edge Functions (webhooks, payouts) — Phase 6
```

## Commands

```sh
pnpm install
pnpm test        # all package unit tests + the end-to-end money scenario
pnpm typecheck
```

## Golden rule

Money logic lives ONLY in `packages/ledger` and `packages/payments`. Apps never
write ledger rows or compute splits themselves. Money is integer kobo — never floats.
