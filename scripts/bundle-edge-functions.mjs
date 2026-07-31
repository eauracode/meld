// Bundles the money-core workspace packages into single-file ESM modules
// that Supabase Edge Functions (Deno) can import directly.
//
// Why this exists: packages/ledger and packages/payments use extensionless
// relative imports (required for Turbopack in the Next.js apps — see
// apps/*/next.config.ts history). Deno requires explicit extensions for
// relative imports and can't resolve pnpm workspace packages by specifier,
// so Edge Functions can't `import` them directly. Bundling is the standard
// fix — and it's the one that keeps the golden rule intact: money logic
// still lives ONLY in packages/ledger and packages/payments; this step
// copies compiled output, it does not re-implement anything.
//
// Run via `pnpm build:functions`. Re-run after any change to
// packages/ledger or packages/payments before deploying/serving functions.

import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync } from "node:fs";

const root = dirname(fileURLToPath(import.meta.url)) + "/..";
const outDir = join(root, "supabase/functions/_shared");
mkdirSync(outDir, { recursive: true });

const targets = [
  { name: "ledger", entry: join(root, "packages/ledger/src/index.ts") },
  { name: "payments", entry: join(root, "packages/payments/src/index.ts") },
];

for (const { name, entry } of targets) {
  await build({
    entryPoints: [entry],
    outfile: join(outDir, `${name}.js`),
    bundle: true,
    format: "esm",
    platform: "neutral",
    target: "es2022",
    // node:crypto etc. are provided natively by Deno's Node compat layer —
    // pass them through rather than trying to bundle a Node built-in.
    external: ["node:*"],
    logLevel: "info",
  });
  console.log(`bundled ${name} -> supabase/functions/_shared/${name}.js`);
}
