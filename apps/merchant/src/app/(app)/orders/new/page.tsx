import { meldApi, stockFor } from "@/lib/api";
import { Card, PageHeader } from "@/components/ui";
import { OrderForm } from "@/components/order-form";

export default async function NewOrder() {
  const [me, feeRules, products, inventory] = await Promise.all([
    meldApi.me(),
    meldApi.feeRules(),
    meldApi.products(),
    meldApi.inventory(),
  ]);
  const disabled = me.status !== "approved";

  return (
    <>
      <PageHeader
        title="Create order"
        sub="The delivery fee and money breakdown resolve as you type — what you see is what the ledger will post."
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
          feeRules={feeRules}
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
