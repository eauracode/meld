// Bundled for consistency with the other kits, even though @meld/fees is
// currently single-file (see ledger-kit.ts and dynamic-import.ts for why
// bundling + absolute file:// URL + a real, un-downleveled import() are all
// necessary). Regenerate via `pnpm build:api-kits`.
import { bundleUrl } from "./bundle-url";
import { dynamicImport } from "./dynamic-import";

type FeesModule = typeof import("@meld/fees");

let cached: Promise<FeesModule> | null = null;

export function feesKit(): Promise<FeesModule> {
  if (!cached) cached = dynamicImport<FeesModule>(bundleUrl("fees"));
  return cached;
}
