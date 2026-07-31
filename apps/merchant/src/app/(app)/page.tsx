import Link from "next/link";
import { meldApi, orderRef, stockFor } from "@/lib/api";
import { Badge, Card, EmptyRow, Money, StatCard, Table, td } from "@/components/ui";

export default async function Dashboard() {
  const [balance, orders, products, inventory] = await Promise.all([
    meldApi.balance(),
    meldApi.orders(),
    meldApi.products(),
    meldApi.inventory(),
  ]);

  const now = Date.now();
  const dayMs = 86_400_000;
  const ordersToday = orders.filter((o) => now - new Date(o.createdAt).getTime() < dayMs).length;
  const ordersWeek = orders.filter((o) => now - new Date(o.createdAt).getTime() < 7 * dayMs).length;
  const inProgress = orders.filter((o) => ["awaiting_assignment", "assigned", "out_for_delivery"].includes(o.status));
  const lowStock = products.filter((p) => stockFor(inventory, p.id) <= p.reorderLevel);

  return (
    <>
      <StatCard hero label="Available balance" value={<Money kobo={balance.available} />} sub="Withdraw anytime from Wallet" />

      <div className="mt-4 grid grid-cols-3 gap-3">
        <StatCard label="Orders today" value={ordersToday} />
        <StatCard label="This week" value={ordersWeek} />
        <StatCard label="In progress" value={inProgress.length} />
      </div>

      {lowStock.length > 0 ? (
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <span className="font-bold">Low stock:</span>{" "}
          {lowStock.map((p) => `${p.name} (${stockFor(inventory, p.id)} left)`).join(" · ")} —{" "}
          <Link href="/inventory" className="font-semibold underline">
            view inventory
          </Link>
        </div>
      ) : null}

      <div className="mt-5">
        <Card
          title="Deliveries in progress"
          aside={
            <Link href="/orders" className="text-sm font-semibold text-pine hover:underline">
              All orders →
            </Link>
          }
        >
          <Table head={["Order", "Customer", "Status", "Payment"]}>
            {inProgress.length === 0 ? (
              <EmptyRow span={4} text="Nothing in flight — create an order to get moving." />
            ) : (
              inProgress.map((o) => (
                <tr key={o.id}>
                  <td className={td}>
                    <Link href={`/orders/${o.id}`} className="font-semibold text-pine hover:underline">
                      {orderRef(o.id)}
                    </Link>
                  </td>
                  <td className={td}>{o.customerName}</td>
                  <td className={td}>
                    <Badge value={o.status} />
                  </td>
                  <td className={td}>
                    <Badge value={o.delivery?.paymentStatus ?? "unpaid"} />
                  </td>
                </tr>
              ))
            )}
          </Table>
        </Card>
      </div>

      <div className="mt-4 flex gap-3">
        <Link href="/orders/new" className="flex-1 rounded-xl bg-lime px-4 py-3 text-center font-bold text-ink">
          Create order
        </Link>
        <Link
          href="/orders/import"
          className="flex-1 rounded-xl border border-slate/40 bg-white px-4 py-3 text-center font-semibold text-ink"
        >
          Import CSV
        </Link>
      </div>
    </>
  );
}
