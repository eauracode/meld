"use client";

import { useActionState, useMemo, useState } from "react";
import { resolveDeliveryFee } from "@meld/fees";
import { formatKobo } from "@meld/ui";
import type { FeeBorneBy, FeeRule, PaymentType } from "@meld/types";
import { createOrder, type CreateOrderResult } from "@/lib/actions";
import { btnLime, inputCls, selectCls } from "@/components/ui";

interface ProductOption {
  id: string;
  sku: string;
  name: string;
  inStock: number;
}

interface ItemRow {
  productId: string;
  qty: number;
}

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo", "Jigawa",
  "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger",
  "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe",
  "Zamfara", "Abuja",
];

/**
 * Order creation with the money breakdown resolved LIVE as the merchant types
 * (03_PRD FR-3/FR-4). Fee resolution runs the real @meld/fees engine
 * client-side with the same rules the backend will apply at creation.
 */
export function OrderForm(props: {
  merchantId: string;
  originState: string;
  feeBorneBy: FeeBorneBy;
  feeRules: FeeRule[];
  products: ProductOption[];
  disabled: boolean;
}) {
  const [state, formAction, pending] = useActionState<CreateOrderResult, FormData>(createOrder, {
    error: null,
  });
  const [destinationState, setDestinationState] = useState("Lagos");
  const [paymentType, setPaymentType] = useState<PaymentType>("prepaid");
  const [valueNaira, setValueNaira] = useState("");
  const [items, setItems] = useState<ItemRow[]>([{ productId: props.products[0]?.id ?? "", qty: 1 }]);

  const feeKobo = useMemo(() => {
    try {
      return resolveDeliveryFee({
        merchantId: props.merchantId,
        originState: props.originState,
        destinationState: destinationState || props.originState,
        rules: props.feeRules,
        defaultFeeKobo: 250_000,
      }).feeKobo;
    } catch {
      return null;
    }
  }, [props.merchantId, props.originState, props.feeRules, destinationState]);

  const valueKobo = Math.round((Number(valueNaira) || 0) * 100);
  const customerPays = feeKobo != null ? valueKobo + (props.feeBorneBy === "customer" ? feeKobo : 0) : null;
  const merchantNets = feeKobo != null ? valueKobo - (props.feeBorneBy === "merchant" ? feeKobo : 0) : null;
  const codNets = feeKobo != null && customerPays != null ? customerPays - feeKobo : null;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate">
          Customer name
          <input name="customerName" className={inputCls} required disabled={props.disabled} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate">
          Customer phone
          <input name="customerPhone" className={inputCls} inputMode="tel" required disabled={props.disabled} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate sm:col-span-2">
          Delivery address
          <input name="deliveryAddress" className={inputCls} required disabled={props.disabled} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate">
          State
          <select
            name="deliveryState"
            className={selectCls}
            value={destinationState}
            onChange={(e) => setDestinationState(e.target.value)}
            disabled={props.disabled}
          >
            {NIGERIAN_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate">
          Area
          <input name="deliveryArea" className={inputCls} placeholder="e.g. Lekki Phase 1" disabled={props.disabled} />
        </label>
      </div>

      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate">Items (from your MELD inventory)</p>
        <div className="flex flex-col gap-2">
          {items.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                name="itemProduct"
                className={`${selectCls} flex-1`}
                value={row.productId}
                onChange={(e) =>
                  setItems((prev) => prev.map((r, j) => (j === i ? { ...r, productId: e.target.value } : r)))
                }
                disabled={props.disabled}
              >
                {props.products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} — {p.name} ({p.inStock} in stock)
                  </option>
                ))}
              </select>
              <input
                name="itemQty"
                type="number"
                min={1}
                className={`${inputCls} w-20`}
                value={row.qty}
                onChange={(e) =>
                  setItems((prev) => prev.map((r, j) => (j === i ? { ...r, qty: Number(e.target.value) } : r)))
                }
                disabled={props.disabled}
              />
              {items.length > 1 ? (
                <button
                  type="button"
                  aria-label="Remove item"
                  className="rounded-lg border border-red-300 px-2 py-1 text-sm font-bold text-red-700"
                  onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))}
                >
                  ×
                </button>
              ) : null}
            </div>
          ))}
        </div>
        <button
          type="button"
          className="mt-2 text-sm font-semibold text-pine hover:underline"
          onClick={() => setItems((prev) => [...prev, { productId: props.products[0]?.id ?? "", qty: 1 }])}
          disabled={props.disabled}
        >
          + Add another item
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate">
          Order value (₦, goods only)
          <input
            name="orderValueNaira"
            className={inputCls}
            inputMode="decimal"
            value={valueNaira}
            onChange={(e) => setValueNaira(e.target.value)}
            required
            disabled={props.disabled}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate">
          Payment type
          <select
            name="paymentType"
            className={selectCls}
            value={paymentType}
            onChange={(e) => setPaymentType(e.target.value as PaymentType)}
            disabled={props.disabled}
          >
            <option value="prepaid">Prepaid (transfer on delivery)</option>
            <option value="cod">Cash on delivery</option>
          </select>
        </label>
      </div>

      {/* Money breakdown — resolved by the fee engine, shown before submitting. */}
      <div className="rounded-xl bg-ink p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-dark">Money breakdown</p>
        <dl className="mt-2 flex flex-col gap-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-dark">Delivery fee ({props.feeBorneBy === "customer" ? "customer pays" : "you pay"})</dt>
            <dd className="font-bold text-lime tabular-nums">{feeKobo != null ? formatKobo(feeKobo) : "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-dark">{paymentType === "cod" ? "Cash the rider collects" : "Customer transfers"}</dt>
            <dd className="font-semibold text-white tabular-nums">{customerPays != null ? formatKobo(customerPays) : "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-dark">You are owed after delivery</dt>
            <dd className="font-semibold text-white tabular-nums">
              {paymentType === "cod"
                ? codNets != null
                  ? formatKobo(codNets)
                  : "—"
                : merchantNets != null
                  ? formatKobo(merchantNets)
                  : "—"}
            </dd>
          </div>
        </dl>
      </div>

      {state.error ? (
        <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {state.error}
        </p>
      ) : null}
      <button type="submit" className={`${btnLime} py-2.5`} disabled={props.disabled || pending}>
        {pending ? "Creating…" : "Create order"}
      </button>
    </form>
  );
}
