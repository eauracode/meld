import { meldApi, orderRef } from "@/lib/api";
import { assignRider } from "@/lib/actions";
import { Badge, Card, EmptyRow, Money, PageHeader, Table, btnLime, selectCls, td } from "@/components/ui";

export default async function Dispatch() {
  const [orders, riders] = await Promise.all([meldApi.ordersAll(), meldApi.ridersAll()]);
  const activeRiders = riders.filter((r) => r.status === "active");
  const queue = orders.filter((o) => o.status === "awaiting_assignment");
  const others = orders.filter((o) => o.status !== "awaiting_assignment");

  return (
    <>
      <PageHeader
        title="Orders & dispatch"
        sub="Manual dispatch (v1): pick an active rider for every order awaiting assignment. Rider, merchant, and customer are notified."
      />

      <Card title={`Awaiting assignment (${queue.length})`}>
        <Table head={["Order", "Merchant", "Customer", "Destination", "Value", "Fee", "Type", "Assign to"]}>
          {queue.length === 0 ? (
            <EmptyRow span={8} text="Dispatch queue is clear." />
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
                  <Money kobo={o.deliveryFeeKobo} />
                </td>
                <td className={td}>
                  <Badge value={o.paymentType} />
                </td>
                <td className={td}>
                  <form action={assignRider} className="flex items-center gap-2">
                    <input type="hidden" name="orderId" value={o.id} />
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
