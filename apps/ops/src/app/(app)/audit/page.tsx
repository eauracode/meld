import { meldApi } from "@/lib/api";
import { Card, EmptyRow, PageHeader, Table, td } from "@/components/ui";

export default async function Audit() {
  const entries = await meldApi.auditLog();

  return (
    <>
      <PageHeader
        title="Audit log"
        sub="The trail of every sensitive action — approvals, fee changes, assignments, adjustments, suspensions."
      />

      <Card title={`Audit log (${entries.length})`}>
        <Table head={["When", "Actor", "Action", "Detail"]}>
          {entries.length === 0 ? (
            <EmptyRow span={4} text="No audited actions yet." />
          ) : (
            entries.map((a) => (
              <tr key={a.id}>
                <td className={`${td} whitespace-nowrap`}>
                  {new Date(a.createdAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
                </td>
                <td className={`${td} font-semibold`}>{a.actor?.fullName ?? "system"}</td>
                <td className={td}>
                  <code className="rounded bg-mist px-1.5 py-0.5 text-xs text-pine">{a.action}</code>
                </td>
                <td className={`${td} max-w-md truncate text-xs text-slate`}>
                  {a.detail ? JSON.stringify(a.detail) : "—"}
                </td>
              </tr>
            ))
          )}
        </Table>
      </Card>
    </>
  );
}
