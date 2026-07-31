// See ledger-kit.ts and dynamic-import.ts — @meld/notifications is
// multi-file with extensionless internal imports (core.ts + termii/resend
// transports + factory.ts), so the raw package fails under Node's real ESM
// loader; the bundled output + absolute file:// URL + a real,
// un-downleveled import() sidesteps it. Regenerate via `pnpm build:api-kits`.
import { bundleUrl } from "./bundle-url";
import { dynamicImport } from "./dynamic-import";

type NotificationsModule = typeof import("@meld/notifications");

let cached: Promise<NotificationsModule> | null = null;

export function notificationsKit(): Promise<NotificationsModule> {
  if (!cached) cached = dynamicImport<NotificationsModule>(bundleUrl("notifications"));
  return cached;
}
