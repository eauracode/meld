import { meldApi, orderRef } from "@/lib/api";
import { assignRider } from "@/lib/actions";
import { Badge, Card, EmptyRow, Money, PageHeader, Table, btnLime, inputCls, selectCls, td } from "@/components/ui";

export default async function Dispatch() {
  const [orders, riders] = await Promise.all([meldApi.ordersAll(), meldApi.ridersAll()]);
  const activeRiders = riders.filter((r) => r.status === "active");
  const queue = orders.filter((o) => o.status === "awaiting_assignment");
  const others = orders.filter((o) => o.status !== "awaiting_assignment");

  return (
    <>
      <PageHeader
        title="Orders & dispatch"
        sub="Manual dispatch (v1): set the delivery fee and rider payout, then pick an active rider — for every order awaiting assignment. No fee is resolved automatically. Rider, merchant, and customer are notified."
      />

      <Card title={`Awaiting assignment (${queue.length})`}>
        <Table head={["Order", "Merchant", "Customer", "Destination", "Value", "Type", "Set fee, payout & assign"]}>
          {queue.length === 0 ? (
            <EmptyRow span={7} text="Dispatch queue is clear." />
          ) : (
            queue.map((o) => (
              <tr key={o.id}>
                <td className={`${td} font-semibold`}>{orderRef(o.id)}</td>
                <td className={td}>{o.merchant?.businessName ?? "—"}</td>
                <td className={td}>{o.customerName}</td>
                <td className={td}>
                  {o.deliveryArea}, {o.deliveryState}
                </td>
                <td className={td}>
                  <Money kobo={o.orderValueKobo} />
                </td>
                <td className={td}>
                  <Badge value={o.paymentType} />
                </td>
                <td className={td}>
                  <form action={assignRider} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="orderId" value={o.id} />
                    <label className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate">
                      Fee (₦, merchant)
                      <input
                        name="deliveryFeeNaira"
                        type="number"
                        min={1}
                        step="0.01"
                        className={`${inputCls} w-24`}
                        required
                      />
                    </label>
                    <label className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate">
                      Rider payout (₦)
                      <input
                        name="riderPayoutNaira"
                        type="number"
                        min={0}
                        step="0.01"
                        className={`${inputCls} w-24`}
                        required
                      />
                    </label>
                    <select name="riderId" className={selectCls} required>
                      {activeRiders.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.user.fullName} ({r.vehicle}, {r.state})
                        </option>
                      ))}
                    </select>
                    <button type="submit" className={btnLime} disabled={activeRiders.length === 0}>
                      Assign
                    </button>
                  </form>
                </td>
              </tr>
            ))
          )}
        </Table>
        {activeRiders.length === 0 ? (
          <p className="mt-3 text-sm font-semibold text-red-700">No active riders available — approve or reactivate a rider first.</p>
        ) : null}
      </Card>

      <div className="mt-6">
        <Card title="All other orders">
          <Table head={["Order", "Merchant", "Customer", "Destination", "Value", "Type", "Order status", "Rider", "Payment"]}>
            {others.length === 0 ? (
              <EmptyRow span={9} text="No orders." />
            ) : (
              others.map((o) => (
                <tr key={o.id}>
                  <td className={`${td} font-semibold`}>{orderRef(o.id)}</td>
                  <td className={td}>{o.merchant?.businessName ?? "—"}</td>
                  <td className={td}>{o.customerName}</td>
                  <td className={td}>
                    {o.deliveryArea}, {o.deliveryState}
                  </td>
                  <td className={td}>
                    <Money kobo={o.orderValueKobo} />
                  </td>
                  <td className={td}>
                    <Badge value={o.paymentType} />
                  </td>
                  <td className={td}>
                    <Badge value={o.status} />
                  </td>
                  <td className={td}>{o.delivery?.rider?.user.fullName ?? "—"}</td>
                  <td className={td}>{o.delivery ? <Badge value={o.delivery.paymentStatus} /> : "—"}</td>
                </tr>
              ))
            )}
          </Table>
        </Card>
      </div>
    </>
  );
}
