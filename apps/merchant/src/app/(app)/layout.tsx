import type { ReactNode } from "react";
import { BottomNav } from "@/components/nav";
import { meldApi } from "@/lib/api";
import { logout } from "@/lib/auth-actions";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const me = await meldApi.me();

  return (
    <div className="pb-20">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-ink">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-lime" aria-hidden />
          <span className="font-heading text-lg font-bold tracking-tight text-white">MELD</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-dark">Merchant</span>
          <span className="ml-auto truncate text-xs text-muted-dark">{me.businessName}</span>
          <form action={logout}>
            <button type="submit" className="text-xs font-semibold text-muted-dark hover:text-white">
              Sign out
            </button>
          </form>
        </div>
      </header>
      {me.status === "pending_approval" ? (
        <div className="border-b border-amber-300 bg-amber-50">
          <p className="mx-auto max-w-3xl px-4 py-2 text-xs font-semibold text-amber-900">
            Your account is pending MELD approval — you can explore, but creating live orders is disabled until Ops
            approves you.
          </p>
        </div>
      ) : null}
      {me.status === "suspended" ? (
        <div className="border-b border-red-300 bg-red-50">
          <p className="mx-auto max-w-3xl px-4 py-2 text-xs font-semibold text-red-900">
            Your account has been suspended by MELD Ops. Contact support to resolve this.
          </p>
        </div>
      ) : null}
      <main className="mx-auto max-w-3xl px-4 py-5">{children}</main>
      <BottomNav />
    </div>
  );
}
