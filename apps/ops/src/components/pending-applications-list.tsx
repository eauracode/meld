"use client";

import { useEffect, useState } from "react";
import type { RiderApplicationRow } from "@/lib/api";
import { rejectRiderApplication } from "@/lib/actions";
import { btnDanger, inputCls } from "@/components/ui";
import { ApproveRiderForm } from "./approve-rider-form";

/**
 * Owns its own copy of the "applied" list so that approving a card doesn't
 * make it disappear (and lose its ApproveRiderForm success banner) the
 * moment the server-side approve action revalidates the page and the
 * application's status flips away from "applied". New applications that
 * show up on a fresh server render are merged in; nothing already shown is
 * ever removed here — the real status change is reflected elsewhere on the
 * page (Decided applications / Active riders) via the normal server refetch.
 */
export function PendingApplicationsList({ applications }: { applications: RiderApplicationRow[] }) {
  const [items, setItems] = useState(applications);

  useEffect(() => {
    setItems((prev) => {
      const seen = new Set(prev.map((p) => p.id));
      const additions = applications.filter((a) => !seen.has(a.id));
      return additions.length > 0 ? [...prev, ...additions] : prev;
    });
  }, [applications]);

  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-slate">No applications waiting.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {items.map((a) => (
        <div key={a.id} className="rounded-xl border border-slate/20 bg-mist/50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-heading text-base font-bold text-ink">{a.fullName}</p>
              <p className="mt-1 text-sm text-slate">
                {a.phone} · {a.city}, {a.state}
              </p>
              <p className="text-sm text-slate">Email: {a.email ?? "—"}</p>
              <p className="text-sm text-slate">
                Vehicle: {a.vehicle} · Licence: {a.hasLicence ? "yes ✓" : "no — check!"}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <ApproveRiderForm applicationId={a.id} />
              <form action={rejectRiderApplication} className="flex items-center gap-2">
                <input type="hidden" name="applicationId" value={a.id} />
                <input name="reason" placeholder="Reject reason" className={`${inputCls} w-40`} />
                <button type="submit" className={btnDanger}>
                  Reject
                </button>
              </form>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
