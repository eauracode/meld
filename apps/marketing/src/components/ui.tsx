import type { ReactNode } from "react";

/**
 * Shared button variants per 09_UIUX_SPEC §1 (Button: limeSolid, limeOutline,
 * inkSolid, inkOutline, ghost). Applied to <Link>/<a>/<button> at each call
 * site rather than wrapped, so every CTA can be the right element for its
 * destination (internal route vs external app URL).
 */
export const buttonVariants = {
  limeSolid:
    "inline-flex items-center justify-center gap-2 rounded-lg bg-lime px-5 py-3 text-sm font-bold text-ink transition hover:brightness-95",
  limeOutline:
    "inline-flex items-center justify-center gap-2 rounded-lg border-2 border-lime px-5 py-3 text-sm font-bold text-lime transition hover:bg-lime hover:text-ink",
  inkSolid:
    "inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-5 py-3 text-sm font-bold text-white transition hover:bg-ink/90",
  inkOutline:
    "inline-flex items-center justify-center gap-2 rounded-lg border-2 border-ink px-5 py-3 text-sm font-bold text-ink transition hover:bg-ink hover:text-white",
  ghost: "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-ink transition hover:bg-mist",
} as const;

const iconCircleTone = {
  lime: "bg-ink text-lime",
  green: "bg-ink text-green",
} as const;

/** The convergence motif: an ink circle housing a lime/green icon (09_UIUX_SPEC §1). */
export function IconCircle({ children, tone = "lime" }: { children: ReactNode; tone?: keyof typeof iconCircleTone }) {
  return (
    <span className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${iconCircleTone[tone]}`} aria-hidden>
      {children}
    </span>
  );
}

export function Eyebrow({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <p className={`text-xs font-bold uppercase tracking-[0.14em] ${dark ? "text-lime" : "text-pine"}`}>{children}</p>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate">{children}</p>;
}
