import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type {
  DeliveryStatus,
  FeeBorneBy,
  Kobo,
  PaymentStatus,
  PaymentType,
  RemittanceStatus,
  RiderStatus,
  VehicleType,
  WithdrawalStatus,
} from "@meld/types";
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

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------

export interface RiderProfile {
  id: string;
  vehicle: VehicleType;
  city: string | null;
  state: string | null;
  hasLicence: boolean;
  bankName: string | null;
  bankAccountNo: string | null;
  status: RiderStatus;
  user: { fullName: string; phone: string | null; email: string | null; mustChangePassword: boolean };
}

export interface OrderItemRow {
  productId: string | null;
  nameSnapshot: string;
  quantity: number;
}

export interface DeliveryInfo {
  id: string;
  riderId: string | null;
  status: DeliveryStatus;
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
  deliveryFeeKobo: Kobo;
  feeBorneBy: FeeBorneBy;
  status: string;
  createdAt: string;
  delivery: DeliveryInfo | null;
}

export interface VirtualAccountResponse {
  accountNo: string;
  bankName: string;
  amountKobo: number | null;
}

export interface WithdrawalRow {
  id: string;
  amountKobo: Kobo;
  status: WithdrawalStatus;
  createdAt: string;
}

export interface BalanceResponse {
  balanceKobo: Kobo;
  pendingWithdrawalsKobo: Kobo;
  available: Kobo;
}

export interface CashRemittanceRow {
  id: string;
  deliveryId: string;
  amountOwedKobo: Kobo;
  amountRemittedKobo: Kobo;
  status: RemittanceStatus;
  createdAt: string;
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

/** What the customer owes total for a prepaid delivery (goods + fee if fee is customer-borne). */
export function customerOwesKobo(order: OrderRow): Kobo {
  return order.feeBorneBy === "customer" ? order.orderValueKobo + order.deliveryFeeKobo : order.orderValueKobo;
}

export const meldApi = {
  me: () => apiGet<RiderProfile>("/riders/me"),
  assigned: () => apiGet<OrderRow[]>("/orders/assigned"),
  order: (id: string) => apiGet<OrderRow>(`/orders/${id}`),
  balance: () => apiGet<BalanceResponse>("/withdrawals/balance"),
  withdrawals: () => apiGet<WithdrawalRow[]>("/withdrawals/mine"),
  remittances: () => apiGet<CashRemittanceRow[]>("/cash-remittances/mine"),
  virtualAccount: (purpose: "delivery_payment" | "cash_remittance", referenceId: string) =>
    apiGet<VirtualAccountResponse | null>(`/virtual-accounts?purpose=${purpose}&referenceId=${referenceId}`),
};
