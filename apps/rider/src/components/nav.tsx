"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Today", icon: "▤" },
  { href: "/cash", label: "Cash", icon: "$" },
  { href: "/wallet", label: "Wallet", icon: "₦" },
  { href: "/profile", label: "Profile", icon: "◉" },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-ink pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-3xl items-stretch justify-around">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-16 flex-col items-center gap-0.5 px-3 py-2.5 text-[11px] font-semibold ${
                active ? "text-lime" : "text-muted-dark hover:text-white"
              }`}
            >
              <span aria-hidden className="text-base leading-none">
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
