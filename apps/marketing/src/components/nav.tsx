"use client";

import Link from "next/link";
import { useState } from "react";
import { config, riderCtaHref } from "@/config/site";
import { buttonVariants } from "@/components/ui";
import { MeldLogo } from "@/components/logo";

const links = [
  { href: "/#platform", label: "Platform" },
  { href: "/#services", label: "Solutions" },
  { href: "/pricing", label: "Pricing" },
];

export function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-ink">
      <nav className="mx-auto flex max-w-6xl items-center gap-6 px-5 py-4" aria-label="Primary">
        <Link href="/" className="shrink-0" aria-label="MELD home">
          <MeldLogo />
        </Link>

        <ul className="ml-4 hidden items-center gap-6 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="text-sm font-semibold text-muted-dark transition hover:text-white">
                {l.label}
              </Link>
            </li>
          ))}
          <li>
            <Link href={riderCtaHref()} className="text-sm font-semibold text-muted-dark transition hover:text-white">
              For riders
            </Link>
          </li>
        </ul>

        <div className="ml-auto hidden items-center gap-3 md:flex">
          <a href={config.MERCHANT_APP_SIGNIN_URL} className={buttonVariants.ghost + " !text-muted-dark hover:!bg-white/10 hover:!text-white"}>
            Sign in
          </a>
          <Link href="/demo" className={buttonVariants.limeSolid}>
            Book a demo
          </Link>
        </div>

        <button
          type="button"
          className="ml-auto rounded-md p-2 text-white md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? (
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </nav>

      {open ? (
        <div id="mobile-menu" className="border-t border-white/10 bg-ink px-5 pb-5 md:hidden">
          <ul className="flex flex-col gap-1 pt-3">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={() => setOpen(false)} className="block rounded-lg px-2 py-2.5 text-sm font-semibold text-muted-dark hover:bg-white/5 hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href={riderCtaHref()} onClick={() => setOpen(false)} className="block rounded-lg px-2 py-2.5 text-sm font-semibold text-muted-dark hover:bg-white/5 hover:text-white">
                For riders
              </Link>
            </li>
          </ul>
          <div className="mt-3 flex flex-col gap-2">
            <a href={config.MERCHANT_APP_SIGNIN_URL} className={buttonVariants.inkOutline + " !border-white/30 !text-white"}>
              Sign in
            </a>
            <Link href="/demo" className={buttonVariants.limeSolid} onClick={() => setOpen(false)}>
              Book a demo
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
