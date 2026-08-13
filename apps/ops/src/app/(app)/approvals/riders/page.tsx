import { meldApi } from "@/lib/api";
import { setRiderState } from "@/lib/actions";
import { Badge, Card, EmptyRow, PageHeader, Table, btnDanger, btnOutline, td } from "@/components/ui";
import { PendingApplicationsList } from "@/components/pending-applications-list";

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
        <PendingApplicationsList applications={applied} />
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
