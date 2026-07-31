import { meldApi } from "@/lib/api";
import { logout } from "@/lib/auth-actions";
import { Badge, Card, PageHeader, btnOutline } from "@/components/ui";

export default async function More() {
  const me = await meldApi.me();

  return (
    <>
      <PageHeader title="More" sub="Profile and settings." />

      <div className="flex flex-col gap-4">
        <Card title="Business profile" aside={<Badge value={me.status} />}>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate">Business</dt>
              <dd className="text-ink">{me.businessName}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate">Contact</dt>
              <dd className="text-ink">
                {me.contactPerson ?? "—"} · {me.phone ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate">Pickup address</dt>
              <dd className="text-ink">
                {me.pickupAddress ?? "Not set"}{me.pickupState ? `, ${me.pickupState}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate">Settlement bank</dt>
              <dd className="text-ink">
                {me.bankName && me.bankAccountNo ? `${me.bankName} ···${me.bankAccountNo.slice(-4)}` : "Not set — contact MELD Ops"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate">Delivery fee borne by</dt>
              <dd className="text-ink">{me.feeBorneBy} (set by MELD Ops per your agreement)</dd>
            </div>
          </dl>
        </Card>

        <Card title="Session">
          <form action={logout}>
            <button type="submit" className={btnOutline}>
              Sign out
            </button>
          </form>
        </Card>
      </div>
    </>
  );
}
