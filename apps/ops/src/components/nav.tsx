"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Dashboard" },
  { href: "/approvals/merchants", label: "Merchant approvals" },
  { href: "/approvals/riders", label: "Rider approvals" },
  { href: "/dispatch", label: "Orders & dispatch" },
  { href: "/inventory", label: "Warehouses & inventory" },
  { href: "/fees", label: "Fee management" },
  { href: "/cash", label: "Cash reconciliation" },
  { href: "/ledger", label: "Ledger" },
  { href: "/withdrawals", label: "Withdrawals" },
  { href: "/audit", label: "Audit log" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5 px-3">
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              active ? "bg-white/10 text-lime" : "text-muted-dark hover:bg-white/5 hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
