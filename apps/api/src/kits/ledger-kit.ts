/**
 * apps/api compiles to CommonJS (NestJS's default, most-supported mode);
 * @meld/ledger is ESM-only (required for the Next.js apps' bundlers — see
 * 01_SHARED_FOUNDATIONS §1 history) and split across multiple files with
 * EXTENSIONLESS internal imports (also for the Next.js bundlers). Node's
 * real ESM loader — what actually runs a dynamic `import()` at request time
 * — requires explicit extensions for relative specifiers, so importing the
 * raw package directly fails the moment it's exercised (found via a live
 * end-to-end test, not by inspection: `Cannot find module '.../src/core'`).
 * Importing the esbuild-bundled single-file output instead sidesteps the
 * conflict — nothing left to resolve internally. Regenerate the bundle via
 * `pnpm build:api-kits` after any change to packages/ledger.
 */
import { bundleUrl } from "./bundle-url";
import { dynamicImport } from "./dynamic-import";

type LedgerModule = typeof import("@meld/ledger");

let cached: Promise<LedgerModule> | null = null;

export function ledgerKit(): Promise<LedgerModule> {
  if (!cached) cached = dynamicImport<LedgerModule>(bundleUrl("ledger"));
  return cached;
}
