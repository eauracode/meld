// See ledger-kit.ts and dynamic-import.ts — @meld/payments is multi-file
// with extensionless internal imports, so the raw package fails under
// Node's real ESM loader; the bundled output + absolute file:// URL + a
// real, un-downleveled import() sidesteps it. Regenerate via
// `pnpm build:api-kits`.
import { bundleUrl } from "./bundle-url";
import { dynamicImport } from "./dynamic-import";

type PaymentsModule = typeof import("@meld/payments");

let cached: Promise<PaymentsModule> | null = null;

export function paymentsKit(): Promise<PaymentsModule> {
  if (!cached) cached = dynamicImport<PaymentsModule>(bundleUrl("payments"));
  return cached;
}
