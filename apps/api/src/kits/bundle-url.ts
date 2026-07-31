import { join } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Builds an absolute file:// URL for a generated bundle in ./_bundled/.
 * A plain relative specifier (e.g. "./_bundled/ledger.mjs") resolved
 * inconsistently under NestJS's webpack-based `nest start --watch`
 * compiler versus a plain `tsc`/`nest build` — found via a live test (the
 * dev server threw "Cannot find module './_bundled/fees.mjs'" even though
 * the file existed on disk). An absolute path built from __dirname and
 * converted to a file:// URL (required by Node's ESM loader for absolute
 * paths on Windows — a bare `C:\...` string throws
 * ERR_UNSUPPORTED_ESM_URL_SCHEME) is robust regardless of how any given
 * compiler lays things out.
 */
export function bundleUrl(name: string): string {
  return pathToFileURL(join(__dirname, "_bundled", `${name}.mjs`)).href;
}
