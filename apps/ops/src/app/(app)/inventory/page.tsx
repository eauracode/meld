import { meldApi } from "@/lib/api";
import { addWarehouse, adjustStock, receiveInventory } from "@/lib/actions";
import { Card, EmptyRow, PageHeader, Table, btnLime, btnOutline, inputCls, selectCls, td } from "@/components/ui";

export default async function Inventory() {
  const [products, inventory, warehouses, movements] = await Promise.all([
    meldApi.productsAll(),
    meldApi.inventoryAll(),
    meldApi.warehouses(),
    meldApi.movementsAll(),
  ]);
  const productName = (id: string) => products.find((p) => p.id === id)?.name ?? id;
  const warehouseName = (id: string) => warehouses.find((w) => w.id === id)?.name ?? id;

  return (
    <>
      <PageHeader
        title="Warehouses & inventory"
        sub="Receive merchant stock into MELD warehouses; merchants see the resulting levels in their app. Every movement is logged."
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Receive inventory">
          <form action={receiveInventory} className="flex flex-col gap-3">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate">Product</label>
            <select name="productId" className={selectCls} required>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {p.name} ({p.merchant.businessName})
                </option>
              ))}
            </select>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate">Warehouse</label>
            <select name="warehouseId" className={selectCls} required>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.state})
                </option>
              ))}
            </select>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate">Quantity received</label>
            <input name="quantity" type="number" min={1} className={inputCls} required />
            <button type="submit" className={btnLime}>
              Receive stock
            </button>
          </form>
        </Card>

        <Card title="Adjust stock (corrections, damages)">
          <form action={adjustStock} className="flex flex-col gap-3">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate">Product</label>
            <select name="productId" className={selectCls} required>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {p.name}
                </option>
              ))}
            </select>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate">Warehouse</label>
            <select name="warehouseId" className={selectCls} required>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate">Change (e.g. -2)</label>
            <input name="change" type="number" className={inputCls} required />
            <label className="text-xs font-semibold uppercase tracking-wide text-slate">Reason (required, audited)</label>
            <input name="reason" className={inputCls} placeholder="e.g. damaged in transit" required />
            <button type="submit" className={btnOutline}>
              Apply adjustment
            </button>
          </form>
        </Card>

        <Card title="Register warehouse">
          <form action={addWarehouse} className="flex flex-col gap-3">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate">Name</label>
            <input name="name" className={inputCls} placeholder="e.g. Port Harcourt Hub" required />
            <label className="text-xs font-semibold uppercase tracking-wide text-slate">State</label>
            <input name="state" className={inputCls} placeholder="e.g. Rivers" required />
            <button type="submit" className={btnOutline}>
              Register
            </button>
          </form>
          <div className="mt-4 border-t border-slate/10 pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate">Warehouses</p>
            <ul className="mt-2 flex flex-col gap-1 text-sm text-ink">
              {warehouses.map((w) => (
                <li key={w.id}>
                  {w.name} <span className="text-slate">({w.state})</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title="Stock levels">
          <Table head={["Product", "Merchant", "Warehouse", "Qty", "Reorder level"]}>
            {inventory.length === 0 ? (
              <EmptyRow span={5} text="No stock held." />
            ) : (
              inventory.map((row) => {
                const low = row.quantity <= row.product.reorderLevel;
                return (
                  <tr key={row.id} className={low ? "bg-amber-50" : undefined}>
                    <td className={`${td} font-semibold`}>{row.product.name}</td>
                    <td className={td}>{row.product.merchant.businessName}</td>
                    <td className={td}>{row.warehouse.name}</td>
                    <td className={`${td} tabular-nums ${low ? "font-bold text-amber-800" : ""}`}>
                      {row.quantity}
                      {low ? " ⚠ low" : ""}
                    </td>
                    <td className={`${td} tabular-nums`}>{row.product.reorderLevel}</td>
                  </tr>
                );
              })
            )}
          </Table>
        </Card>

        <Card title="Recent stock movements">
          <Table head={["When", "Product", "Warehouse", "Change", "Reason"]}>
            {movements.slice(0, 12).map((m) => (
              <tr key={m.id}>
                <td className={td}>{new Date(m.createdAt).toLocaleDateString("en-NG")}</td>
                <td className={td}>{productName(m.productId)}</td>
                <td className={td}>{warehouseName(m.warehouseId)}</td>
                <td className={`${td} tabular-nums font-semibold ${m.change < 0 ? "text-red-700" : "text-pine"}`}>
                  {m.change > 0 ? `+${m.change}` : m.change}
                </td>
                <td className={td}>{m.reason}</td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
    </>
  );
}
