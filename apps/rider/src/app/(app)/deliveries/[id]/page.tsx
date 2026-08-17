import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiError, customerOwesKobo, meldApi, orderRef } from "@/lib/api";
import { acceptDelivery, failDelivery, markArrived, markCashCollected, startEnRoute } from "@/lib/actions";
import { Badge, Card, Money, inputCls } from "@/components/ui";
import { CashCollectForm, PaymentActions } from "@/components/payment-actions";
import { CompleteButton } from "@/components/complete-button";

export default async function DeliveryDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id: orderId } = await params;

  const order = await meldApi.order(orderId).catch((e) => {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  });
  const d = order.delivery;
  if (!d) notFound();

  const va = order.paymentType === "prepaid" ? await meldApi.virtualAccount("delivery_payment", d.id) : null;

  const customerPays = customerOwesKobo(order);
  const gatePassed = d.paymentStatus === "paid" || d.cashCollected === true;

  return (
    <>
      <Link href="/" className="mb-3 inline-block text-sm font-semibold text-pine hover:underline">
        ← Today
      </Link>
      <div className="mb-4 flex items-center gap-2">
        <h1 className="font-heading text-xl font-bold text-ink">{orderRef(order.id)}</h1>
        <Badge value={d.status} />
        <Badge value={order.paymentType} />
      </div>

      <div className="flex flex-col gap-4">
        <Card title="Customer & destination">
          <dl className="grid gap-2 text-sm">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate">Customer</dt>
              <dd className="text-ink">
                {order.customerName} · {order.customerPhone}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate">Address</dt>
              <dd className="text-ink">
                {order.deliveryAddress}, {order.deliveryArea ? `${order.deliveryArea}, ` : ""}
                {order.deliveryState}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate">Items</dt>
              <dd className="text-ink">{order.items.map((i) => `${i.quantity} × ${i.nameSnapshot}`).join(", ")}</dd>
            </div>
          </dl>
        </Card>

        <Card title="Money">
          <dl className="flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate">Order value</dt>
              <dd className="tabular-nums font-semibold text-ink">
                <Money kobo={order.orderValueKobo} />
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate">Delivery fee</dt>
              <dd className="tabular-nums font-semibold text-ink">
                {order.deliveryFeeKobo != null ? <Money kobo={order.deliveryFeeKobo} /> : "Calculating"}
              </dd>
            </div>
            <div className="flex justify-between border-t border-slate/20 pt-1.5">
              <dt className="font-semibold text-ink">{order.paymentType === "cod" ? "Cash to collect" : "Customer transfers"}</dt>
              <dd className="tabular-nums font-bold text-pine">
                <Money kobo={customerPays} />
              </dd>
            </div>
            <div className="flex justify-between border-t border-slate/20 pt-1.5">
              <dt className="text-slate">Your earning (expected)</dt>
              <dd className="tabular-nums font-bold text-pine">
                {order.riderPayoutKobo != null ? <Money kobo={order.riderPayoutKobo} /> : "—"}
              </dd>
            </div>
            {order.riderPayoutKobo != null ? (
              <p className="text-xs text-slate">Lands in your wallet once this delivery is paid for and completed.</p>
            ) : null}
          </dl>
        </Card>

        {d.status === "assigned" || d.status === "accepted" || d.status === "en_route" ? (
          <Card title="Progress">
            <div className="flex flex-col gap-2">
              {d.status === "assigned" ? (
                <form action={acceptDelivery}>
                  <input type="hidden" name="deliveryId" value={d.id} />
                  <button type="submit" className="w-full rounded-lg bg-lime px-3 py-2 text-sm font-bold text-ink">
                    Accept delivery
                  </button>
                </form>
              ) : null}
              {d.status === "accepted" ? (
                <form action={startEnRoute}>
                  <input type="hidden" name="deliveryId" value={d.id} />
                  <button type="submit" className="w-full rounded-lg bg-lime px-3 py-2 text-sm font-bold text-ink">
                    Start en route
                  </button>
                </form>
              ) : null}
              {d.status === "en_route" ? (
                <form action={markArrived}>
                  <input type="hidden" name="deliveryId" value={d.id} />
                  <button type="submit" className="w-full rounded-lg bg-lime px-3 py-2 text-sm font-bold text-ink">
                    Mark arrived at customer
                  </button>
                </form>
              ) : null}
            </div>
          </Card>
        ) : null}

        {d.status === "arrived" || d.status === "delivered" ? (
          <Card title={order.paymentType === "prepaid" ? "Prepaid collection" : "Cash on delivery"}>
            {order.paymentType === "prepaid" ? (
              <PaymentActions
                deliveryId={d.id}
                orderId={order.id}
                hasVirtualAccount={!!va}
                virtualAccountNo={va?.accountNo ?? null}
                virtualAccountBank={va?.bankName ?? null}
                paid={d.paymentStatus === "paid"}
              />
            ) : (
              <CashCollectForm deliveryId={d.id} action={markCashCollected} collected={d.cashCollected} amountKobo={d.cashAmountKobo} />
            )}
          </Card>
        ) : null}

        {d.status === "arrived" ? (
          <Card title="Complete delivery">
            <CompleteButton deliveryId={d.id} gatePassed={gatePassed} />
            <form action={failDelivery} className="mt-2 flex flex-col gap-2">
              <input type="hidden" name="deliveryId" value={d.id} />
              <input name="reason" className={inputCls} placeholder="Reason (required)" required />
              <button type="submit" className="w-full rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-700">
                Could not deliver — mark failed
              </button>
            </form>
          </Card>
        ) : null}

        {d.status === "delivered" ? (
          <p className="rounded-xl border border-green-300 bg-green-50 p-3 text-center text-sm font-semibold text-green-900">
            ✓ Delivered
          </p>
        ) : null}
      </div>
    </>
  );
}
