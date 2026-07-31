/**
 * Ambient declaration for the generated bundles in ./_bundled/*.mjs
 * (produced by `pnpm build:api-kits` — see scripts/bundle-api-kits.mjs).
 * Each kit file (ledger-kit.ts etc.) immediately casts the dynamic import
 * result to its real package's type via `as Promise<X>`, so this only needs
 * to satisfy TS that the specifier resolves at all — the meaningful typing
 * happens at the cast, not here.
 */
declare module "*.mjs";
