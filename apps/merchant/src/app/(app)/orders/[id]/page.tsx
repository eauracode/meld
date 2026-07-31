import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiError, meldApi, orderRef } from "@/lib/api";
import { Badge, Card, Money, PageHeader } from "@/components/ui";

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const order = await meldApi.order(id).catch((e) => {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  });
  const delivery = order.delivery;

  const customerPays = order.orderValueKobo + (order.feeBorneBy === "customer" ? order.deliveryFeeKobo : 0);
  const merchantNets = customerPays - order.deliveryFeeKobo;
  const settled = delivery?.paymentStatus === "paid";
  const method = order.paymentType === "cod" ? "cash (COD)" : "bank transfer";

  return (
    <>
      <PageHeader title={orderRef(order.id)} sub={`Created ${new Date(order.createdAt).toLocaleString("en-NG")}`} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge value={order.status} />
        <Badge value={order.paymentType} />
        <Badge value={delivery?.paymentStatus ?? "unpaid"} />
      </div>

      <div className="flex flex-col gap-4">
        <Card title="Customer & destination">
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate">Customer</dt>
              <dd className="text-ink">
                {order.customerName} · {order.customerPhone}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate">Deliver to</dt>
              <dd className="text-ink">
                {order.deliveryAddress}, {order.deliveryArea ? `${order.deliveryArea}, ` : ""}
                {order.deliveryState}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate">Rider</dt>
              <dd className="text-ink">
                {delivery?.rider ? `${delivery.rider.user.fullName} · ${delivery.rider.user.phone ?? ""}` : "Not assigned yet"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate">Delivery status</dt>
              <dd>{delivery?.status ? <Badge value={delivery.status} /> : <span className="text-slate">awaiting assignment</span>}</dd>
            </div>
          </dl>
        </Card>

        <Card title="Items">
          <ul className="flex flex-col gap-1.5 text-sm text-ink">
            {order.items.map((item, i) => (
              <li key={i} className="flex justify-between">
                <span>{item.nameSnapshot}</span>
                <span className="tabular-nums text-slate">× {item.quantity}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Money breakdown">
          <dl className="flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate">Order value (goods)</dt>
              <dd className="font-semibold text-ink tabular-nums">
                <Money kobo={order.orderValueKobo} />
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate">Delivery fee (borne by {order.feeBorneBy})</dt>
              <dd className="font-semibold text-ink tabular-nums">
                <Money kobo={order.deliveryFeeKobo} />
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate">
                {order.paymentType === "cod" ? "Cash the rider collects" : "Customer transfers"}
              </dt>
              <dd className="font-semibold text-ink tabular-nums">
                <Money kobo={customerPays} />
              </dd>
            </div>
            <div className="mt-1 flex justify-between border-t border-slate/20 pt-2">
              <dt className="font-semibold text-ink">{settled ? "Credited to your balance" : "You are owed after delivery"}</dt>
              <dd className="font-bold text-pine tabular-nums">
                <Money kobo={merchantNets} />
              </dd>
            </div>
            {settled ? <p className="text-xs text-slate">Paid by {method} ✓</p> : null}
          </dl>
        </Card>

        <Link href="/orders" className="text-sm font-semibold text-pine hover:underline">
          ← Back to orders
        </Link>
      </div>
    </>
  );
}
