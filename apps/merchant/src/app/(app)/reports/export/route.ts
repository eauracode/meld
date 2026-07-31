import { breakdownRows, meldApi } from "@/lib/api";

/** CSV export of the per-delivery breakdown (03_PRD §3.5). */
export async function GET(): Promise<Response> {
  const orders = await meldApi.orders();
  const rows = breakdownRows(orders);
  const naira = (kobo: number | null) => (kobo == null ? "" : (kobo / 100).toFixed(2));
  const lines = [
    "order_ref,date,payment_type,method,customer_paid_naira,delivery_fee_naira,net_to_merchant_naira,status",
    ...rows.map((r) =>
      [r.ref, r.date, r.paymentType, r.method, naira(r.customerPaidKobo), naira(r.feeKobo), naira(r.netToMerchantKobo), r.status].join(","),
    ),
  ];
  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="meld-delivery-breakdown.csv"`,
    },
  });
}
