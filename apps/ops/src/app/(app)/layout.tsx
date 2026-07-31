import type { ReactNode } from "react";
import { Nav } from "@/components/nav";
import { meldApi } from "@/lib/api";
import { logout } from "@/lib/auth-actions";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const me = await meldApi.me();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 shrink-0 flex-col bg-ink">
        <div className="flex items-center gap-2 px-6 py-6">
          <span className="inline-block h-3 w-3 rounded-full bg-lime" aria-hidden />
          <span className="font-heading text-xl font-bold tracking-tight text-white">MELD</span>
          <span className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-muted-dark">Ops</span>
        </div>
        <Nav />
        <div className="mt-auto border-t border-white/10 px-6 py-4">
          <p className="text-xs text-muted-dark">Signed in as</p>
          <p className="text-sm font-semibold text-white">{me.fullName}</p>
          <p className="text-xs text-muted-dark">{me.role}</p>
          <form action={logout} className="mt-2">
            <button type="submit" className="text-xs font-semibold text-muted-dark hover:text-white">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-8">{children}</main>
    </div>
  );
}
