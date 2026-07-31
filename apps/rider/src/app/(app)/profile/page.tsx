import { meldApi } from "@/lib/api";
import { logout } from "@/lib/auth-actions";
import { Badge, Card, PageHeader, btnOutline } from "@/components/ui";

export default async function Profile() {
  const me = await meldApi.me();

  return (
    <>
      <PageHeader title="Profile" sub="Your details." />
      <div className="flex flex-col gap-4">
        <Card title="Rider details" aside={<Badge value={me.status} />}>
          <dl className="grid gap-2 text-sm">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate">Name</dt>
              <dd className="text-ink">{me.user.fullName}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate">Phone</dt>
              <dd className="text-ink">{me.user.phone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate">Vehicle</dt>
              <dd className="text-ink">
                {me.vehicle} · {me.state ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate">Payout bank</dt>
              <dd className="text-ink">
                {me.bankName && me.bankAccountNo ? `${me.bankName} ···${me.bankAccountNo.slice(-4)}` : "Not set — contact MELD Ops"}
              </dd>
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
