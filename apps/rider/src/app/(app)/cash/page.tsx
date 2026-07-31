import { meldApi, orderRef } from "@/lib/api";
import { generateRemittanceAccount } from "@/lib/actions";
import { Badge, Card, EmptyRow, Money, PageHeader, StatCard, Table, btnLime, td } from "@/components/ui";

export default async function Cash() {
  const remittances = await meldApi.remittances();
  const outstanding = remittances.filter((r) => r.status !== "reconciled");
  const outstandingKobo = outstanding.reduce((sum, r) => sum + (r.amountOwedKobo - r.amountRemittedKobo), 0);

  return (
    <>
      <PageHeader title="Cash to remit" sub="COD cash you're holding — remit it to clear your balance. Ops confirms receipt on their end." />

      <StatCard hero label="Cash you're holding" value={<Money kobo={outstandingKobo} />} />

      <div className="mt-4 flex flex-col gap-4">
        <Card title="Outstanding remittances">
          {outstanding.length === 0 ? (
            <p className="text-sm text-slate">No collected cash waiting to be remitted right now.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {outstanding.map((r) => (
                <RemittanceCard key={r.id} remittance={r} />
              ))}
            </div>
          )}
        </Card>

        <Card title="Remittance history">
          <Table head={["Delivery", "Requested", "Owed", "Status"]}>
            {remittances.length === 0 ? (
              <EmptyRow span={4} text="No remittances yet." />
            ) : (
              remittances.map((r) => (
                <tr key={r.id}>
                  <td className={td}>{orderRef(r.deliveryId)}</td>
                  <td className={td}>{new Date(r.createdAt).toLocaleDateString("en-NG")}</td>
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

function RemittanceCard({
  remittance,
}: {
  remittance: { id: string; deliveryId: string; amountOwedKobo: number; status: string };
}) {
  return (
    <div className="rounded-xl border border-slate/20 p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-semibold text-ink">{orderRef(remittance.deliveryId)}</p>
        <Badge value={remittance.status} />
      </div>
      <RemittanceAccount remittanceId={remittance.id} amountOwedKobo={remittance.amountOwedKobo} />
    </div>
  );
}

async function RemittanceAccount({ remittanceId, amountOwedKobo }: { remittanceId: string; amountOwedKobo: number }) {
  const va = await meldApi.virtualAccount("cash_remittance", remittanceId);
  if (!va) {
    return (
      <form action={generateRemittanceAccount}>
        <input type="hidden" name="remittanceId" value={remittanceId} />
        <button type="submit" className={btnLime}>
          Generate remittance account
        </button>
      </form>
    );
  }
  return (
    <div className="rounded-xl bg-ink p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-dark">Pay this amount into</p>
      <p className="mt-1 font-heading text-lg font-bold tabular-nums text-lime">{va.accountNo}</p>
      <p className="text-sm text-muted-dark">{va.bankName}</p>
      <p className="mt-2 text-sm font-semibold text-white">
        <Money kobo={amountOwedKobo} />
      </p>
    </div>
  );
}
