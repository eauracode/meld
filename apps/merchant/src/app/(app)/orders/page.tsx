import Link from "next/link";
import { meldApi, orderRef } from "@/lib/api";
import { Badge, Card, EmptyRow, Money, PageHeader, Table, td } from "@/components/ui";

export default async function Orders() {
  const orders = await meldApi.orders();

  return (
    <>
      <PageHeader title="Orders" sub="Everything you've asked MELD to fulfil." />
      <div className="mb-4 flex gap-3">
        <Link href="/orders/new" className="flex-1 rounded-xl bg-lime px-4 py-2.5 text-center font-bold text-ink">
          Create order
        </Link>
        <Link
          href="/orders/import"
          className="flex-1 rounded-xl border border-slate/40 bg-white px-4 py-2.5 text-center font-semibold text-ink"
        >
          Import CSV
        </Link>
      </div>

      <Card>
        <Table head={["Order", "Customer", "Destination", "Value", "Fee", "Type", "Status"]}>
          {orders.length === 0 ? (
            <EmptyRow span={7} text="No orders yet." />
          ) : (
            orders.map((o) => (
              <tr key={o.id}>
                <td className={td}>
                  <Link href={`/orders/${o.id}`} className="font-semibold text-pine hover:underline">
                    {orderRef(o.id)}
                  </Link>
                </td>
                <td className={td}>{o.customerName}</td>
                <td className={td}>
                  {o.deliveryArea ? `${o.deliveryArea}, ` : ""}
                  {o.deliveryState}
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
                  <Badge value={o.status} />
                </td>
              </tr>
            ))
          )}
        </Table>
      </Card>
    </>
  );
}
