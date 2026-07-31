import { meldApi, stockFor } from "@/lib/api";
import { addProduct } from "@/lib/actions";
import { Card, EmptyRow, PageHeader, Table, btnOutline, inputCls, td } from "@/components/ui";

export default async function Inventory() {
  const [products, inventory, movements] = await Promise.all([
    meldApi.products(),
    meldApi.inventory(),
    meldApi.movements(),
  ]);
  const productName = (id: string | null) => (id ? (products.find((p) => p.id === id)?.name ?? id) : "—");

  return (
    <>
      <PageHeader
        title="Inventory"
        sub="Your stock held in MELD warehouses. Physical receiving happens at the warehouse — levels update here as Ops receives it."
      />

      <div className="flex flex-col gap-4">
        <Card title="Stock levels">
          <Table head={["SKU", "Product", "Warehouse", "Qty", "Reorder at"]}>
            {inventory.length === 0 ? (
              <EmptyRow span={5} text="No stock held yet — deliver stock to a MELD warehouse to get started." />
            ) : (
              inventory.map((row) => {
                const product = products.find((p) => p.id === row.productId);
                const low = product ? stockFor(inventory, product.id) <= product.reorderLevel : false;
                return (
                  <tr key={row.id} className={low ? "bg-amber-50" : undefined}>
                    <td className={`${td} text-slate`}>{product?.sku}</td>
                    <td className={`${td} font-semibold`}>{product?.name}</td>
                    <td className={td}>{row.warehouse.name}</td>
                    <td className={`${td} tabular-nums ${low ? "font-bold text-amber-800" : ""}`}>
                      {row.quantity}
                      {low ? " ⚠" : ""}
                    </td>
                    <td className={`${td} tabular-nums`}>{product?.reorderLevel}</td>
                  </tr>
                );
              })
            )}
          </Table>
        </Card>

        <Card title="Add product">
          <form action={addProduct} className="grid gap-3 sm:grid-cols-3">
            <input name="sku" className={inputCls} placeholder="SKU (e.g. AFH-004)" required />
            <input name="name" className={inputCls} placeholder="Product name" required />
            <input name="reorderLevel" type="number" min={0} className={inputCls} placeholder="Reorder level" />
            <button type="submit" className={`${btnOutline} sm:col-span-3`}>
              Add product
            </button>
          </form>
        </Card>

        <Card title="Stock movements">
          <Table head={["When", "Product", "Change", "Reason"]}>
            {movements.length === 0 ? (
              <EmptyRow span={4} text="No stock movements yet." />
            ) : (
              movements.slice(0, 15).map((m) => (
                <tr key={m.id}>
                  <td className={td}>{new Date(m.createdAt).toLocaleDateString("en-NG")}</td>
                  <td className={td}>{productName(m.productId)}</td>
                  <td className={`${td} tabular-nums font-semibold ${m.change < 0 ? "text-red-700" : "text-pine"}`}>
                    {m.change > 0 ? `+${m.change}` : m.change}
                  </td>
                  <td className={td}>{m.reason}</td>
                </tr>
              ))
            )}
          </Table>
        </Card>
      </div>
    </>
  );
}
