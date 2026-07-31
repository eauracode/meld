import { meldApi, orderRef } from "@/lib/api";
import { confirmRemittance, flagRemittance } from "@/lib/actions";
import { Badge, Card, EmptyRow, Money, PageHeader, StatCard, Table, btnDanger, btnLime, td } from "@/components/ui";

export default async function CashReconciliation() {
  const remittances = await meldApi.cashRemittances();

  const perRider = new Map<string, { name: string; outstandingKobo: number }>();
  for (const r of remittances) {
    if (r.status === "reconciled") continue;
    const existing = perRider.get(r.riderId) ?? { name: r.rider.user.fullName, outstandingKobo: 0 };
    existing.outstandingKobo += r.amountOwedKobo - r.amountRemittedKobo;
    perRider.set(r.riderId, existing);
  }
  const totalOutstanding = [...perRider.values()].reduce((sum, x) => sum + x.outstandingKobo, 0);
  const flagged = remittances.filter((r) => r.status === "flagged").length;

  return (
    <>
      <PageHeader
        title="Cash reconciliation"
        sub="COD cash collected vs remitted per rider. Confirming a remittance posts cash in transit → partner float and reconciles it."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard hero label="Total unremitted cash" value={<Money kobo={totalOutstanding} />} sub="Ledger: cash in transit" />
        <StatCard label="Open remittances" value={remittances.filter((r) => r.status === "pending").length} />
        <StatCard label="Flagged" value={flagged} sub="Owed ≠ remitted" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title="Outstanding cash per rider">
          <Table head={["Rider", "Cash in transit"]}>
            {perRider.size === 0 ? (
              <EmptyRow span={2} text="Nothing outstanding." />
            ) : (
              [...perRider.entries()].map(([riderId, x]) => (
                <tr key={riderId} className={x.outstandingKobo > 0 ? "bg-amber-50" : undefined}>
                  <td className={`${td} font-semibold`}>{x.name}</td>
                  <td className={`${td} font-semibold`}>
                    <Money kobo={x.outstandingKobo} />
                  </td>
                </tr>
              ))
            )}
          </Table>
        </Card>

        <Card title="Remittances">
          <Table head={["Rider", "Delivery", "Owed", "Remitted", "Status", ""]}>
            {remittances.length === 0 ? (
              <EmptyRow span={6} text="No remittances." />
            ) : (
              remittances.map((rem) => (
                <tr key={rem.id}>
                  <td className={td}>{rem.rider.user.fullName}</td>
                  <td className={td}>{orderRef(rem.deliveryId)}</td>
                  <td className={td}>
                    <Money kobo={rem.amountOwedKobo} />
                  </td>
                  <td className={td}>
                    <Money kobo={rem.amountRemittedKobo} />
                  </td>
                  <td className={td}>
                    <Badge value={rem.status} />
                  </td>
                  <td className={td}>
                    {rem.status === "pending" || rem.status === "flagged" ? (
                      <div className="flex gap-2">
                        <form action={confirmRemittance}>
                          <input type="hidden" name="remittanceId" value={rem.id} />
                          <button type="submit" className={btnLime}>
                            Confirm receipt
                          </button>
                        </form>
                        {rem.status === "pending" ? (
                          <form action={flagRemittance}>
                            <input type="hidden" name="remittanceId" value={rem.id} />
                            <button type="submit" className={btnDanger}>
                              Flag
                            </button>
                          </form>
                        ) : null}
                      </div>
                    ) : (
                      "—"
                    )}
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
