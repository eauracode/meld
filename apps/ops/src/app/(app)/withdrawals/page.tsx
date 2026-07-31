import { meldApi } from "@/lib/api";
import { failWithdrawal, processWithdrawal, retryWithdrawal } from "@/lib/actions";
import { Badge, Card, EmptyRow, Money, PageHeader, Table, btnDanger, btnLime, btnOutline, inputCls, td } from "@/components/ui";

export default async function Withdrawals() {
  const [me, withdrawals, merchants, riders] = await Promise.all([
    meldApi.me(),
    meldApi.withdrawalsAll(),
    meldApi.merchantsAll(),
    meldApi.ridersAll(),
  ]);
  const isAdmin = me.role === "ops_admin";

  const ownerLabel = (w: (typeof withdrawals)[number]) =>
    w.ownerType === "merchant"
      ? (merchants.find((m) => m.id === w.ownerId)?.businessName ?? w.ownerId)
      : (riders.find((r) => r.id === w.ownerId)?.user.fullName ?? w.ownerId);

  return (
    <>
      <PageHeader
        title="Withdrawals & settlements"
        sub="Merchant settlements and rider payouts, executed via the payment partner. Paying out posts the ledger movement; balance checks are enforced."
      />

      <Card title="All withdrawals">
        <Table head={["Requested", "Owner", "Type", "Amount", "Status", "Failure reason", ""]}>
          {withdrawals.length === 0 ? (
            <EmptyRow span={7} text="No withdrawals." />
          ) : (
            withdrawals.map((w) => (
              <tr key={w.id}>
                <td className={td}>{new Date(w.createdAt).toLocaleDateString("en-NG")}</td>
                <td className={`${td} font-semibold`}>{ownerLabel(w)}</td>
                <td className={td}>{w.ownerType}</td>
                <td className={td}>
                  <Money kobo={w.amountKobo} />
                </td>
                <td className={td}>
                  <Badge value={w.status} />
                </td>
                <td className={`${td} text-slate`}>{w.failureReason ?? "—"}</td>
                <td className={td}>
                  {w.status === "requested" && isAdmin ? (
                    <div className="flex items-center gap-2">
                      <form action={processWithdrawal}>
                        <input type="hidden" name="withdrawalId" value={w.id} />
                        <button type="submit" className={btnLime}>
                          Pay out
                        </button>
                      </form>
                      <form action={failWithdrawal} className="flex items-center gap-2">
                        <input type="hidden" name="withdrawalId" value={w.id} />
                        <input name="reason" placeholder="Failure reason" className={`${inputCls} w-36`} />
                        <button type="submit" className={btnDanger}>
                          Mark failed
                        </button>
                      </form>
                    </div>
                  ) : w.status === "failed" ? (
                    <form action={retryWithdrawal}>
                      <input type="hidden" name="withdrawalId" value={w.id} />
                      <button type="submit" className={btnOutline}>
                        Retry
                      </button>
                    </form>
                  ) : w.status === "requested" ? (
                    <span className="text-xs text-slate">ops_admin pays out</span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))
          )}
        </Table>
      </Card>
    </>
  );
}
