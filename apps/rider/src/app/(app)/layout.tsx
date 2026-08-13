import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { BottomNav } from "@/components/nav";
import { meldApi } from "@/lib/api";
import { logout } from "@/lib/auth-actions";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const me = await meldApi.me();

  if (me.user.mustChangePassword) {
    redirect("/change-password");
  }

  return (
    <div className="pb-20">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-ink">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-lime" aria-hidden />
          <span className="font-heading text-lg font-bold tracking-tight text-white">MELD</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-dark">Rider</span>
          <span className="ml-auto truncate text-xs text-muted-dark">{me.user.fullName}</span>
          <form action={logout}>
            <button type="submit" className="text-xs font-semibold text-muted-dark hover:text-white">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-5">{children}</main>
      <BottomNav />
    </div>
  );
}
