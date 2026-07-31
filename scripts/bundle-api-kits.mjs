// Bundles the money-core workspace packages into single-file ESM modules
// apps/api's dynamic-import kit bridge (src/kits/*.ts) can load at runtime.
//
// Why: apps/api compiles to CommonJS (NestJS's stable default);
// @meld/ledger, @meld/payments, and @meld/notifications are ESM-only and
// split across multiple files with EXTENSIONLESS internal imports (required
// for Turbopack in the four Next.js apps). Node's real ESM loader — what
// actually executes when the kit files' `await import("@meld/ledger")` runs
// at request time — requires explicit extensions for relative specifiers,
// unlike Turbopack's bundler resolution. @meld/fees happens to be a single
// file so it never hit this; the other three fail the moment any code path
// actually exercises them (discovered via a live end-to-end test, not by
// inspection). Bundling sidesteps the conflict entirely — a single compiled
// file has no internal imports left to resolve — same fix already proven
// for the Supabase Edge Functions (see bundle-edge-functions.mjs); this is
// the apps/api equivalent, output as .mjs so Node treats it as ESM
// unambiguously regardless of apps/api's own CommonJS package.json.
//
// Run via `pnpm build:api-kits`. Re-run after any change to
// packages/ledger, packages/fees, packages/payments, or packages/notifications.

import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync } from "node:fs";

const root = dirname(fileURLToPath(import.meta.url)) + "/..";
const outDir = join(root, "apps/api/src/kits/_bundled");
mkdirSync(outDir, { recursive: true });

const targets = [
  { name: "ledger", entry: join(root, "packages/ledger/src/index.ts") },
  { name: "fees", entry: join(root, "packages/fees/src/index.ts") },
  { name: "payments", entry: join(root, "packages/payments/src/index.ts") },
  { name: "notifications", entry: join(root, "packages/notifications/src/index.ts") },
];

for (const { name, entry } of targets) {
  await build({
    entryPoints: [entry],
    outfile: join(outDir, `${name}.mjs`),
    bundle: true,
    format: "esm",
    platform: "node",
    target: "es2022",
    external: ["node:*"],
    logLevel: "info",
  });
  console.log(`bundled ${name} -> apps/api/src/kits/_bundled/${name}.mjs`);
}
