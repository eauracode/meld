/**
 * @meld/ui — shared brand system for all four surfaces.
 * Phase 1 ships the design tokens; React components (Button, MeldLogo,
 * StatCard, StatusBadge, DataTable, MoneyText, IconCircle, AppShell, form
 * primitives) are built in Phase 2+ alongside the first app that needs them.
 */
export * from "./tokens";

/** Formats integer kobo for display (₦, thousands separators). Display only. */
export function formatKobo(kobo: number): string {
  if (!Number.isSafeInteger(kobo)) {
    throw new Error("formatKobo expects integer kobo — money is never a float");
  }
  const sign = kobo < 0 ? "-" : "";
  const abs = Math.abs(kobo);
  const naira = Math.floor(abs / 100);
  const rem = abs % 100;
  const base = `${sign}₦${naira.toLocaleString("en-NG")}`;
  return rem === 0 ? base : `${base}.${rem.toString().padStart(2, "0")}`;
}
