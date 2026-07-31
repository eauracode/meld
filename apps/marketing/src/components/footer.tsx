import Link from "next/link";
import { config, riderCtaHref } from "@/config/site";
import { MeldLogo } from "@/components/logo";
import { SITE } from "@/config/site";

const columns: { title: string; links: { label: string; href: string; external?: boolean }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Platform", href: "/#platform" },
      { label: "Solutions", href: "/#services" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Book a demo", href: "/demo" },
      { label: "Sign in", href: config.MERCHANT_APP_SIGNIN_URL, external: true },
    ],
  },
  {
    title: "For riders",
    links: [{ label: "Become a rider partner", href: riderCtaHref() }],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms", href: "/terms" },
      { label: "Privacy", href: "/privacy" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-ink">
      <div className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid gap-10 md:grid-cols-[1.3fr_repeat(4,1fr)]">
          <div>
            <MeldLogo />
            <p className="mt-3 max-w-xs text-sm text-muted-dark">{SITE.tagline}</p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-dark">{col.title}</p>
              <ul className="mt-3 flex flex-col gap-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.external ? (
                      <a href={l.href} className="text-sm text-white/80 transition hover:text-lime">
                        {l.label}
                      </a>
                    ) : (
                      <Link href={l.href} className="text-sm text-white/80 transition hover:text-lime">
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-muted-dark sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} MELD. All rights reserved.</p>
          <p>Lagos, Nigeria</p>
        </div>
      </div>
    </footer>
  );
}
