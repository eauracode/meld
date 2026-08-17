import { breakdownRows, meldApi } from "@/lib/api";
import { Badge, Card, EmptyRow, Money, PageHeader, Table, td } from "@/components/ui";

export default async function Reports() {
  const orders = await meldApi.orders();
  const rows = breakdownRows(orders);

  return (
    <>
      <PageHeader
        title="Delivery breakdown"
        sub="Per delivery: the fee charged, what the customer paid and how, and what you net after the fee."
      />
      <div className="mb-4">
        <a
          href="/reports/export"
          download
          className="inline-block rounded-xl border border-slate/40 bg-white px-4 py-2 text-sm font-semibold text-ink"
        >
          Export CSV
        </a>
      </div>

      <Card>
        <Table head={["Order", "Date", "Type", "Method", "Customer paid", "Delivery fee", "Net to you", "Status"]}>
          {rows.length === 0 ? (
            <EmptyRow span={8} text="No deliveries yet." />
          ) : (
            rows.map((r) => (
              <tr key={r.ref}>
                <td className={`${td} font-semibold`}>{r.ref}</td>
                <td className={td}>{r.date}</td>
                <td className={td}>
                  <Badge value={r.paymentType} />
                </td>
                <td className={td}>{r.method}</td>
                <td className={`${td} tabular-nums`}>{r.customerPaidKobo != null ? <Money kobo={r.customerPaidKobo} /> : "—"}</td>
                <td className={`${td} tabular-nums`}>{r.feeKobo != null ? <Money kobo={r.feeKobo} /> : "Calculating"}</td>
                <td className={`${td} tabular-nums font-semibold text-pine`}>
                  {r.netToMerchantKobo != null ? <Money kobo={r.netToMerchantKobo} /> : "—"}
                </td>
                <td className={td}>
                  <Badge value={r.status} />
                </td>
              </tr>
            ))
          )}
        </Table>
      </Card>
    </>
  );
}
