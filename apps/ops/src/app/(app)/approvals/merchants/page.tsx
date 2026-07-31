import { meldApi } from "@/lib/api";
import { approveMerchant, rejectMerchant, setMerchantState } from "@/lib/actions";
import { Badge, Card, EmptyRow, PageHeader, Table, btnDanger, btnLime, btnOutline, inputCls, selectCls, td } from "@/components/ui";

export default async function MerchantApprovals() {
  const merchants = await meldApi.merchantsAll();
  const pending = merchants.filter((m) => m.status === "pending_approval");
  const rest = merchants.filter((m) => m.status !== "pending_approval");

  return (
    <>
      <PageHeader
        title="Merchant approvals"
        sub="Review new merchants; on approval, set who bears the delivery fee and any negotiated override."
      />

      <Card title={`Pending review (${pending.length})`}>
        {pending.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate">No merchants waiting.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {pending.map((m) => (
              <div key={m.id} className="rounded-xl border border-slate/20 bg-mist/50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-heading text-base font-bold text-ink">{m.businessName}</p>
                    <p className="mt-1 text-sm text-slate">
                      {m.contactPerson} · {m.phone} · {m.email}
                    </p>
                    <p className="text-sm text-slate">Pickup: {m.pickupState}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <form action={approveMerchant} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="merchantId" value={m.id} />
                      <label className="text-xs font-semibold text-slate">Fee borne by</label>
                      <select name="feeBorneBy" defaultValue="merchant" className={selectCls}>
                        <option value="merchant">merchant</option>
                        <option value="customer">customer</option>
                      </select>
                      <input
                        name="overrideFeeNaira"
                        placeholder="Override fee ₦ (optional)"
                        className={`${inputCls} w-44`}
                        inputMode="decimal"
                      />
                      <button type="submit" className={btnLime}>
                        Approve
                      </button>
                    </form>
                    <form action={rejectMerchant}>
                      <input type="hidden" name="merchantId" value={m.id} />
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

      <div className="mt-6">
        <Card title="All merchants">
          <Table head={["Business", "Contact", "State", "Fee borne by", "Status", ""]}>
            {rest.length === 0 ? (
              <EmptyRow span={6} text="No merchants yet." />
            ) : (
              rest.map((m) => (
                <tr key={m.id}>
                  <td className={`${td} font-semibold`}>{m.businessName}</td>
                  <td className={td}>{m.contactPerson}</td>
                  <td className={td}>{m.pickupState}</td>
                  <td className={td}>{m.feeBorneBy}</td>
                  <td className={td}>
                    <Badge value={m.status} />
                  </td>
                  <td className={td}>
                    <form action={setMerchantState}>
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="to" value={m.status === "approved" ? "suspended" : "approved"} />
                      <button type="submit" className={m.status === "approved" ? btnDanger : btnOutline}>
                        {m.status === "approved" ? "Suspend" : "Reactivate"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </Table>
        </Card>
      </div>
    </>
  );
}
