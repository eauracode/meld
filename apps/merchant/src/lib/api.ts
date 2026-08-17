import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { FeeBorneBy, FeeRule, Kobo, MerchantStatus, OrderStatus, PaymentStatus, PaymentType } from "@meld/types";
import { TOKEN_COOKIE } from "./constants";

export { TOKEN_COOKIE };

function apiBase(): string {
  return (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3090/api").replace(/\/$/, "");
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Server-side fetch wrapper. On 401 (missing/expired session) it redirects to
 * /login rather than returning — every caller is a Server Component or
 * Server Action, both of which handle next/navigation's redirect() by
 * throwing a special control-flow error Next.js catches itself.
 */
async function request<T>(path: string, init?: RequestInit & { skipAuthRedirect?: boolean }): Promise<T> {
  const jar = await cookies();
  const token = jar.get(TOKEN_COOKIE)?.value;

  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (res.status === 401 && !init?.skipAuthRedirect) {
    redirect("/login");
  }

  const text = await res.text();
  const body = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = (body && typeof body === "object" && "message" in body ? String(body.message) : null) ?? res.statusText;
    throw new ApiError(res.status, Array.isArray(body?.message) ? body.message.join(", ") : message);
  }
  return body as T;
}

export const apiGet = <T>(path: string, opts?: { skipAuthRedirect?: boolean }) =>
  request<T>(path, { method: "GET", ...opts });
export const apiPost = <T>(path: string, data?: unknown, opts?: { skipAuthRedirect?: boolean }) =>
  request<T>(path, { method: "POST", body: data !== undefined ? JSON.stringify(data) : undefined, ...opts });
export const apiPatch = <T>(path: string, data?: unknown) =>
  request<T>(path, { method: "PATCH", body: data !== undefined ? JSON.stringify(data) : undefined });

// ---------------------------------------------------------------------------
// Response shapes (as returned by apps/api — Prisma camelCase via @map)
// ---------------------------------------------------------------------------

export interface MeMerchant {
  id: string;
  businessName: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  pickupAddress: string | null;
  pickupState: string | null;
  bankName: string | null;
  bankAccountNo: string | null;
  status: MerchantStatus;
  feeBorneBy: FeeBorneBy;
}

export interface ProductRow {
  id: string;
  sku: string | null;
  name: string;
  unit: string;
  reorderLevel: number;
}

export interface InventoryRow {
  id: string;
  productId: string;
  warehouseId: string;
  warehouse: { name: string };
  quantity: number;
}

export interface StockMovementRow {
  id: string;
  productId: string;
  change: number;
  reason: string;
  createdAt: string;
}

export interface OrderItemRow {
  productId: string | null;
  nameSnapshot: string;
  quantity: number;
}

export interface DeliveryRow {
  id: string;
  riderId: string | null;
  rider: { user: { fullName: string; phone: string | null } } | null;
  status: string;
  paymentStatus: PaymentStatus;
  cashCollected: boolean;
  cashAmountKobo: Kobo | null;
}

export interface OrderRow {
  id: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryState: string;
  deliveryArea: string | null;
  items: OrderItemRow[];
  orderValueKobo: Kobo;
  paymentType: PaymentType;
  /** Null until Ops (dispatch) sets it — shown as "Calculating" until then. */
  deliveryFeeKobo: Kobo | null;
  feeBorneBy: FeeBorneBy;
  status: OrderStatus;
  createdAt: string;
  delivery: DeliveryRow | null;
}

export interface WithdrawalRow {
  id: string;
  amountKobo: Kobo;
  status: string;
  createdAt: string;
}

export interface BalanceResponse {
  balanceKobo: Kobo;
  pendingWithdrawalsKobo: Kobo;
  available: Kobo;
}

/** Short, stable, human-friendly stand-in for a real order reference — the schema has no sequence/ref column. */
export function orderRef(id: string): string {
  return `MELD-${id.slice(0, 8).toUpperCase()}`;
}

export function nairaToKobo(value: string, label = "amount"): Kobo {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`${label} must be a non-negative number, got "${value}"`);
  }
  return Math.round(n * 100);
}

export function stockFor(inventory: InventoryRow[], productId: string): number {
  return inventory.filter((i) => i.productId === productId).reduce((sum, i) => sum + i.quantity, 0);
}

/** Per-delivery money breakdown for the reports screen (03_PRD FR-4 / §3.5). */
export interface BreakdownRow {
  ref: string;
  date: string;
  paymentType: PaymentType;
  method: string;
  customerPaidKobo: Kobo | null;
  /** Null until Ops sets the fee at assignment ("Calculating" in the UI). */
  feeKobo: Kobo | null;
  netToMerchantKobo: Kobo | null;
  status: OrderStatus;
}

export function breakdownRows(orders: OrderRow[]): BreakdownRow[] {
  return orders.map((o) => {
    const settled = o.delivery?.paymentStatus === "paid";
    const customerPaidKobo = settled
      ? (o.delivery?.cashAmountKobo ?? o.orderValueKobo + (o.feeBorneBy === "customer" ? (o.deliveryFeeKobo ?? 0) : 0))
      : null;
    return {
      ref: orderRef(o.id),
      date: o.createdAt.slice(0, 10),
      paymentType: o.paymentType,
      method: settled ? (o.paymentType === "cod" ? "cash" : "transfer") : "—",
      customerPaidKobo,
      feeKobo: o.deliveryFeeKobo,
      netToMerchantKobo:
        settled && customerPaidKobo != null && o.deliveryFeeKobo != null ? customerPaidKobo - o.deliveryFeeKobo : null,
      status: o.status,
    };
  });
}

export const meldApi = {
  me: () => apiGet<MeMerchant>("/merchants/me"),
  balance: () => apiGet<BalanceResponse>("/withdrawals/balance"),
  orders: () => apiGet<OrderRow[]>("/orders/mine"),
  order: (id: string) => apiGet<OrderRow>(`/orders/${id}`),
  products: () => apiGet<ProductRow[]>("/products/mine"),
  inventory: () => apiGet<InventoryRow[]>("/inventory/mine"),
  movements: () => apiGet<StockMovementRow[]>("/inventory/mine/movements"),
  withdrawals: () => apiGet<WithdrawalRow[]>("/withdrawals/mine"),
  feeRules: () => apiGet<FeeRule[]>("/fee-rules/mine"),
};
