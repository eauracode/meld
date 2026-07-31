import type { ReactNode } from "react";
import { formatKobo } from "@meld/ui";

export function Money({ kobo, className = "" }: { kobo: number; className?: string }) {
  return <span className={`tabular-nums ${className}`}>{formatKobo(kobo)}</span>;
}

const badgeStyles: Record<string, string> = {
  // waiting states
  pending_approval: "bg-amber-100 text-amber-900",
  applied: "bg-amber-100 text-amber-900",
  requested: "bg-amber-100 text-amber-900",
  pending: "bg-amber-100 text-amber-900",
  awaiting_assignment: "bg-amber-100 text-amber-900",
  // neutral
  created: "bg-gray-200 text-gray-700",
  unpaid: "bg-gray-200 text-gray-700",
  // good states
  approved: "bg-green-100 text-green-900",
  active: "bg-green-100 text-green-900",
  paid: "bg-green-100 text-green-900",
  delivered: "bg-green-100 text-green-900",
  reconciled: "bg-green-100 text-green-900",
  // bad states
  suspended: "bg-red-100 text-red-900",
  rejected: "bg-red-100 text-red-900",
  failed: "bg-red-100 text-red-900",
  flagged: "bg-red-100 text-red-900",
  // in-flight
  assigned: "bg-blue-100 text-blue-900",
  accepted: "bg-blue-100 text-blue-900",
  en_route: "bg-blue-100 text-blue-900",
  arrived: "bg-blue-100 text-blue-900",
  out_for_delivery: "bg-blue-100 text-blue-900",
  processing: "bg-blue-100 text-blue-900",
  remitted: "bg-blue-100 text-blue-900",
  // payment types
  prepaid: "bg-mist text-pine border border-pine/30",
  cod: "bg-pine/10 text-pine border border-pine/30",
};

export function Badge({ value }: { value: string }) {
  const style = badgeStyles[value] ?? "bg-gray-200 text-gray-700";
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${style}`}>
      {value.replaceAll("_", " ")}
    </span>
  );
}

export function StatCard({
  label,
  value,
  hero = false,
  sub,
}: {
  label: string;
  value: ReactNode;
  hero?: boolean;
  sub?: string;
}) {
  // Contrast rule: text colors set explicitly per surface, never inherited.
  if (hero) {
    return (
      <div className="rounded-xl bg-ink p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-dark">{label}</p>
        <p className="mt-2 font-heading text-2xl font-bold text-lime tabular-nums break-words">{value}</p>
        {sub ? <p className="mt-1 text-xs text-muted-dark">{sub}</p> : null}
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-slate/20 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate">{label}</p>
      <p className="mt-2 font-heading text-2xl font-bold text-ink tabular-nums break-words">{value}</p>
      {sub ? <p className="mt-1 text-xs text-slate">{sub}</p> : null}
    </div>
  );
}

export function Card({ title, children, aside }: { title?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate/20 bg-white p-5">
      {title ? (
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="font-heading text-lg font-bold text-ink">{title}</h2>
          {aside}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function PageHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <header className="mb-6">
      <h1 className="font-heading text-2xl font-bold text-ink">{title}</h1>
      {sub ? <p className="mt-1 text-sm text-slate">{sub}</p> : null}
    </header>
  );
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate/20 bg-white">
      <table className="w-full text-sm text-ink">
        <thead>
          <tr className="border-b border-slate/20 bg-mist/70 text-left text-xs uppercase tracking-wider text-slate">
            {head.map((h) => (
              <th key={h} className="px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate/10">{children}</tbody>
      </table>
    </div>
  );
}

export function EmptyRow({ span, text }: { span: number; text: string }) {
  return (
    <tr>
      <td colSpan={span} className="px-4 py-8 text-center text-sm text-slate">
        {text}
      </td>
    </tr>
  );
}

/** Shared class strings for form controls (kept as constants for consistency). */
export const td = "px-4 py-3 align-middle";
export const btnLime =
  "rounded-lg bg-lime px-3 py-1.5 text-sm font-bold text-ink hover:brightness-95 cursor-pointer";
export const btnOutline =
  "rounded-lg border border-slate/40 bg-white px-3 py-1.5 text-sm font-semibold text-ink hover:bg-mist cursor-pointer";
export const btnDanger =
  "rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50 cursor-pointer";
export const inputCls =
  "rounded-lg border border-slate/40 bg-white px-3 py-1.5 text-sm text-ink placeholder:text-slate/70 focus:outline-2 focus:outline-pine";
export const selectCls = inputCls;
