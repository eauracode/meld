import Link from "next/link";
import { meldApi, orderRef } from "@/lib/api";
import { Badge, Card, EmptyRow, Money, PageHeader, StatCard, Table, td } from "@/components/ui";

export default async function Dashboard() {
  const [orders, merchantsPending, riderApps, withdrawals, remittances, ledgerAccounts] = await Promise.all([
    meldApi.ordersAll(),
    meldApi.merchantsPending(),
    meldApi.riderApplications(),
    meldApi.withdrawalsAll(),
    meldApi.cashRemittances(),
    meldApi.ledgerAccounts(),
  ]);

  const inProgress = orders.filter((o) => o.delivery && !["delivered", "failed"].includes(o.delivery.status));
  const dispatchQueue = orders.filter((o) => o.status === "awaiting_assignment");
  const failedPayouts = withdrawals.filter((w) => w.status === "failed");
  const unreconciled = remittances.filter((r) => r.status !== "reconciled");
  const unremittedKobo = unreconciled.reduce((sum, r) => sum + r.amountOwedKobo, 0);
  const meldRevenue = ledgerAccounts.find((a) => a.type === "meld_revenue");

  return (
    <>
      <PageHeader title="Operations dashboard" sub="Everything in flight, and everything waiting on you." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard hero label="MELD revenue" value={<Money kobo={meldRevenue?.balanceKobo ?? 0} />} sub="20% of every delivery fee" />
        <StatCard label="Deliveries in progress" value={inProgress.length} />
        <StatCard label="Unremitted cash" value={<Money kobo={unremittedKobo} />} sub="COD cash held by riders" />
        <StatCard
          label="Pending approvals"
          value={merchantsPending.length + riderApps.filter((a) => a.status === "applied").length}
          sub={`${merchantsPending.length} merchants · ${riderApps.filter((a) => a.status === "applied").length} riders`}
        />
        <StatCard label="Failed payouts" value={failedPayouts.length} sub="Need retry" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card
          title="Dispatch queue"
          aside={
            <Link href="/dispatch" className="text-sm font-semibold text-pine hover:underline">
              Open dispatch →
            </Link>
          }
        >
          <Table head={["Order", "Merchant", "Destination", "Value", "Type"]}>
            {dispatchQueue.length === 0 ? (
              <EmptyRow span={5} text="Nothing awaiting assignment." />
            ) : (
              dispatchQueue.map((o) => (
                <tr key={o.id}>
                  <td className={td}>{orderRef(o.id)}</td>
                  <td className={td}>{o.merchant?.businessName ?? "—"}</td>
                  <td className={td}>
                    {o.deliveryArea}, {o.deliveryState}
                  </td>
                  <td className={td}>
                    <Money kobo={o.orderValueKobo} />
                  </td>
                  <td className={td}>
                    <Badge value={o.paymentType} />
                  </td>
                </tr>
              ))
            )}
          </Table>
        </Card>

        <Card
          title="Cash awaiting remittance"
          aside={
            <Link href="/cash" className="text-sm font-semibold text-pine hover:underline">
              Reconciliation →
            </Link>
          }
        >
          <Table head={["Rider", "Delivery", "Owed", "Status"]}>
            {unreconciled.length === 0 ? (
              <EmptyRow span={4} text="All COD cash reconciled." />
            ) : (
              unreconciled.map((r) => (
                <tr key={r.id}>
                  <td className={td}>{r.rider.user.fullName}</td>
                  <td className={td}>{orderRef(r.deliveryId)}</td>
                  <td className={td}>
                    <Money kobo={r.amountOwedKobo} />
                  </td>
                  <td className={td}>
                    <Badge value={r.status} />
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
