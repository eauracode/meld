import Link from "next/link";
import { meldApi, orderRef } from "@/lib/api";
import { Badge, Card, EmptyRow, Money, Table, td } from "@/components/ui";

export default async function Today() {
  const [orders, balance] = await Promise.all([meldApi.assigned(), meldApi.balance()]);
  const active = orders.filter((o) => o.delivery && !["delivered", "failed"].includes(o.delivery.status));
  const deliveredToday = orders.filter((o) => o.delivery?.status === "delivered");

  return (
    <>
      <div className="mb-4 rounded-xl bg-ink p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-dark">Wallet balance</p>
        <p className="mt-1 font-heading text-2xl font-bold text-lime tabular-nums">
          <Money kobo={balance.available} />
        </p>
      </div>

      <h1 className="mb-3 font-heading text-xl font-bold text-ink">Today&apos;s deliveries</h1>
      <div className="flex flex-col gap-3">
        {active.length === 0 ? (
          <p className="rounded-xl border border-slate/20 bg-white p-4 text-center text-sm text-slate">
            Nothing assigned right now.
          </p>
        ) : (
          active.map((o) => (
            <Link
              key={o.id}
              href={`/deliveries/${o.id}`}
              className="block rounded-xl border border-slate/20 bg-white p-4 active:bg-mist"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-heading text-base font-bold text-ink">{orderRef(o.id)}</p>
                  <p className="text-sm text-slate">
                    {o.customerName} · {o.deliveryArea}, {o.deliveryState}
                  </p>
                </div>
                <Badge value={o.paymentType} />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Badge value={o.delivery?.status ?? "assigned"} />
                <Badge value={o.paymentType === "cod" ? (o.delivery?.cashCollected ? "paid" : "unpaid") : (o.delivery?.paymentStatus ?? "unpaid")} />
                <span className="ml-auto font-semibold tabular-nums text-ink">
                  <Money kobo={o.orderValueKobo} />
                </span>
              </div>
            </Link>
          ))
        )}
      </div>

      <div className="mt-6">
        <Card title="Delivered today">
          <Table head={["Order", "Customer", "Payment"]}>
            {deliveredToday.length === 0 ? (
              <EmptyRow span={3} text="No completed deliveries yet." />
            ) : (
              deliveredToday.map((o) => (
                <tr key={o.id}>
                  <td className={td}>{orderRef(o.id)}</td>
                  <td className={td}>{o.customerName}</td>
                  <td className={td}>
                    <Badge value={o.paymentType} />
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
