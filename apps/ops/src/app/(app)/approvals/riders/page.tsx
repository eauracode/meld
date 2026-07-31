import { meldApi } from "@/lib/api";
import { approveRiderApplication, rejectRiderApplication, setRiderState } from "@/lib/actions";
import { Badge, Card, EmptyRow, PageHeader, Table, btnDanger, btnLime, btnOutline, inputCls, td } from "@/components/ui";

export default async function RiderApprovals() {
  const [applications, riders] = await Promise.all([meldApi.riderApplications(), meldApi.ridersAll()]);
  const applied = applications.filter((a) => a.status === "applied");
  const decided = applications.filter((a) => a.status !== "applied");

  return (
    <>
      <PageHeader
        title="Rider approvals"
        sub="Applications from the marketing site. Check the licence manually before approving — approval creates the rider's login and sends the invite."
      />

      <Card title={`Applications to review (${applied.length})`}>
        {applied.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate">No applications waiting.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {applied.map((a) => (
              <div key={a.id} className="rounded-xl border border-slate/20 bg-mist/50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-heading text-base font-bold text-ink">{a.fullName}</p>
                    <p className="mt-1 text-sm text-slate">
                      {a.phone} · {a.city}, {a.state}
                    </p>
                    <p className="text-sm text-slate">
                      Vehicle: {a.vehicle} · Licence: {a.hasLicence ? "yes ✓" : "no — check!"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <form action={approveRiderApplication} className="flex items-center gap-2">
                      <input type="hidden" name="applicationId" value={a.id} />
                      <input name="email" type="email" placeholder="Login email" className={`${inputCls} w-48`} required />
                      <button type="submit" className={btnLime}>
                        Approve &amp; invite
                      </button>
                    </form>
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
        )}
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title="Active riders">
          <Table head={["Rider", "Phone", "State", "Vehicle", "Status", ""]}>
            {riders.length === 0 ? (
              <EmptyRow span={6} text="No riders yet." />
            ) : (
              riders.map((r) => (
                <tr key={r.id}>
                  <td className={`${td} font-semibold`}>{r.user.fullName}</td>
                  <td className={td}>{r.user.phone}</td>
                  <td className={td}>{r.state}</td>
                  <td className={td}>{r.vehicle}</td>
                  <td className={td}>
                    <Badge value={r.status} />
                  </td>
                  <td className={td}>
                    <form action={setRiderState}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="to" value={r.status === "active" ? "suspended" : "active"} />
                      <button type="submit" className={r.status === "active" ? btnDanger : btnOutline}>
                        {r.status === "active" ? "Suspend" : "Reactivate"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </Table>
        </Card>

        <Card title="Decided applications">
          <Table head={["Applicant", "Vehicle", "Status", "Reason"]}>
            {decided.length === 0 ? (
              <EmptyRow span={4} text="No decisions yet." />
            ) : (
              decided.map((a) => (
                <tr key={a.id}>
                  <td className={td}>{a.fullName}</td>
                  <td className={td}>{a.vehicle}</td>
                  <td className={td}>
                    <Badge value={a.status} />
                  </td>
                  <td className={td}>{a.rejectReason ?? "—"}</td>
                </tr>
              ))
            )}
          </Table>
        </Card>
      </div>
    </>
  );
}
