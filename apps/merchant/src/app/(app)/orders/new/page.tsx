import { meldApi, stockFor } from "@/lib/api";
import { Card, PageHeader } from "@/components/ui";
import { OrderForm } from "@/components/order-form";

export default async function NewOrder() {
  const [me, products, inventory] = await Promise.all([meldApi.me(), meldApi.products(), meldApi.inventory()]);
  const disabled = me.status !== "approved";

  return (
    <>
      <PageHeader
        title="Create order"
        sub="MELD dispatch sets your delivery fee once the order is assigned to a rider — the money breakdown below shows the final numbers as soon as that happens."
      />
      {disabled ? (
        <p className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
          Order creation is disabled while your account is pending approval.
        </p>
      ) : null}
      <Card>
        <OrderForm
          merchantId={me.id}
          originState={me.pickupState ?? ""}
          feeBorneBy={me.feeBorneBy}
          products={products.map((p) => ({
            id: p.id,
            sku: p.sku ?? "",
            name: p.name,
            inStock: stockFor(inventory, p.id),
          }))}
          disabled={disabled}
        />
      </Card>
    </>
  );
}
