"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PaymentType } from "@meld/types";
import { CSV_HEADER } from "./csv";
import { ApiError, apiPost, meldApi, nairaToKobo } from "./api";

export interface CreateOrderResult {
  error: string | null;
}

export async function createOrder(_prev: CreateOrderResult, formData: FormData): Promise<CreateOrderResult> {
  const customerName = String(formData.get("customerName") ?? "").trim();
  const customerPhone = String(formData.get("customerPhone") ?? "").trim();
  const deliveryAddress = String(formData.get("deliveryAddress") ?? "").trim();
  const deliveryState = String(formData.get("deliveryState") ?? "").trim();
  const deliveryArea = String(formData.get("deliveryArea") ?? "").trim();
  const paymentType = (formData.get("paymentType") === "cod" ? "cod" : "prepaid") as PaymentType;
  if (!customerName || !customerPhone || !deliveryAddress || !deliveryState) {
    return { error: "Customer name, phone, address and state are required." };
  }

  let orderValueKobo: number;
  try {
    orderValueKobo = nairaToKobo(String(formData.get("orderValueNaira") ?? ""), "Order value");
  } catch (e) {
    return { error: (e as Error).message };
  }
  if (orderValueKobo === 0) return { error: "Order value must be greater than zero." };

  const productIds = formData.getAll("itemProduct").map(String);
  const quantities = formData.getAll("itemQty").map((q) => Number(q));
  const items: { productId: string; quantity: number }[] = [];
  for (let i = 0; i < productIds.length; i++) {
    const productId = productIds[i] ?? "";
    const quantity = quantities[i] ?? 0;
    if (!productId || quantity <= 0) continue;
    if (!Number.isInteger(quantity)) return { error: `Item ${i + 1}: quantity must be a whole number.` };
    items.push({ productId, quantity });
  }
  if (items.length === 0) return { error: "Add at least one item from your inventory." };

  let orderId: string;
  try {
    const order = await apiPost<{ id: string }>("/orders", {
      customerName,
      customerPhone,
      deliveryAddress,
      deliveryState,
      deliveryArea: deliveryArea || undefined,
      orderValueKobo,
      paymentType,
      items,
    });
    orderId = order.id;
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Could not create the order. Try again." };
  }
  revalidatePath("/", "layout");
  redirect(`/orders/${orderId}`);
}

// ---------------------------------------------------------------------------
// CSV import (03_PRD FR-7: per-row errors, partial import allowed)
// ---------------------------------------------------------------------------

export interface CsvImportResult {
  done: boolean;
  imported: number;
  errors: { line: number; message: string }[];
}

export async function importOrdersCsv(_prev: CsvImportResult, formData: FormData): Promise<CsvImportResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { done: true, imported: 0, errors: [{ line: 0, message: "Choose a CSV file first." }] };
  }
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const header = (lines[0] ?? "").trim().toLowerCase();
  if (header !== CSV_HEADER) {
    return { done: true, imported: 0, errors: [{ line: 1, message: `Header must be exactly: ${CSV_HEADER}` }] };
  }

  const products = await meldApi.products();

  const errors: { line: number; message: string }[] = [];
  let imported = 0;
  for (let i = 1; i < lines.length; i++) {
    const lineNo = i + 1;
    const cols = (lines[i] ?? "").split(",").map((c) => c.trim());
    if (cols.length !== 9) {
      errors.push({ line: lineNo, message: `Expected 9 columns, got ${cols.length}.` });
      continue;
    }
    const [name, phone, address, state, area, payRaw, sku, qtyRaw, valueRaw] = cols as [
      string, string, string, string, string, string, string, string, string,
    ];
    if (!name || !phone || !address || !state) {
      errors.push({ line: lineNo, message: "customer_name, customer_phone, delivery_address and delivery_state are required." });
      continue;
    }
    const paymentType = payRaw.toLowerCase();
    if (paymentType !== "prepaid" && paymentType !== "cod") {
      errors.push({ line: lineNo, message: `payment_type must be "prepaid" or "cod", got "${payRaw}".` });
      continue;
    }
    const product = products.find((p) => (p.sku ?? "").toLowerCase() === sku.toLowerCase());
    if (!product) {
      errors.push({ line: lineNo, message: `Unknown SKU "${sku}".` });
      continue;
    }
    const quantity = Number(qtyRaw);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      errors.push({ line: lineNo, message: `quantity must be a positive whole number, got "${qtyRaw}".` });
      continue;
    }
    let valueKobo: number;
    try {
      valueKobo = nairaToKobo(valueRaw, "order_value_naira");
    } catch (e) {
      errors.push({ line: lineNo, message: (e as Error).message });
      continue;
    }
    if (valueKobo === 0) {
      errors.push({ line: lineNo, message: "order_value_naira must be greater than zero." });
      continue;
    }

    try {
      await apiPost("/orders", {
        customerName: name,
        customerPhone: phone,
        deliveryAddress: address,
        deliveryState: state,
        deliveryArea: area || undefined,
        orderValueKobo: valueKobo,
        paymentType,
        items: [{ productId: product.id, quantity }],
      });
      imported += 1;
    } catch (e) {
      errors.push({ line: lineNo, message: e instanceof ApiError ? e.message : "Could not create this order." });
    }
  }
  if (imported > 0) revalidatePath("/", "layout");
  return { done: true, imported, errors };
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export async function addProduct(formData: FormData): Promise<void> {
  const sku = String(formData.get("sku") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const reorderLevel = Number(formData.get("reorderLevel") ?? 0);
  if (!sku || !name) return;
  await apiPost("/products", {
    sku,
    name,
    reorderLevel: Number.isInteger(reorderLevel) && reorderLevel >= 0 ? reorderLevel : 0,
  });
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// Wallet
// ---------------------------------------------------------------------------

export interface WithdrawResult {
  error: string | null;
  ok: boolean;
}

export async function requestWithdrawal(_prev: WithdrawResult, formData: FormData): Promise<WithdrawResult> {
  let amountKobo: number;
  try {
    amountKobo = nairaToKobo(String(formData.get("amountNaira") ?? ""), "Amount");
  } catch (e) {
    return { error: (e as Error).message, ok: false };
  }
  if (amountKobo === 0) return { error: "Amount must be greater than zero.", ok: false };

  try {
    await apiPost("/withdrawals", { amountKobo });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Could not request the withdrawal.", ok: false };
  }
  revalidatePath("/", "layout");
  return { error: null, ok: true };
}
