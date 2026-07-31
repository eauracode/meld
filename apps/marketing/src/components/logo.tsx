/** Four strands converging to a lime node — the MELD mark (01_SHARED_FOUNDATIONS §8). */
export function MeldMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <path
        d="M6 22 L14 15 M6 10 L14 15 M26 6 L14 15 M26 26 L14 15"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="text-green"
      />
      <circle cx="14" cy="15" r="5" className="fill-lime" />
    </svg>
  );
}

export function MeldLogo({ dark = true }: { dark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <MeldMark />
      <span className={`font-heading text-lg font-bold tracking-tight ${dark ? "text-white" : "text-ink"}`}>MELD</span>
    </span>
  );
}
