import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type {
  DeliveryStatus,
  FeeBorneBy,
  FeeRule,
  Kobo,
  LedgerAccountType,
  MerchantStatus,
  OrderStatus,
  PaymentStatus,
  PaymentType,
  RemittanceStatus,
  RiderStatus,
  UserRole,
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
// Response shapes (as returned by apps/api — Prisma camelCase via @map)
// ---------------------------------------------------------------------------

export interface Me {
  id: string;
  role: UserRole;
  fullName: string;
  email: string | null;
  phone: string | null;
}

export interface MerchantRow {
  id: string;
  businessName: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  pickupState: string | null;
  status: MerchantStatus;
  feeBorneBy: FeeBorneBy;
  createdAt: string;
}

export interface RiderApplicationRow {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  city: string | null;
  state: string | null;
  vehicle: VehicleType;
  hasLicence: boolean;
  status: "applied" | "approved" | "rejected";
  rejectReason: string | null;
  createdAt: string;
}

export interface RiderRow {
  id: string;
  vehicle: VehicleType;
  city: string | null;
  state: string | null;
  status: RiderStatus;
  user: { fullName: string; phone: string | null; email: string | null };
}

export interface WarehouseRow {
  id: string;
  name: string;
  state: string;
}

export interface ProductRow {
  id: string;
  merchantId: string;
  sku: string | null;
  name: string;
  reorderLevel: number;
  merchant: { businessName: string };
}

export interface InventoryRow {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  product: { name: string; sku: string | null; reorderLevel: number; merchant: { businessName: string } };
  warehouse: { name: string; state: string };
}

export interface StockMovementRow {
  id: string;
  productId: string;
  warehouseId: string;
  change: number;
  reason: string;
  createdAt: string;
}

export interface OrderRow {
  id: string;
  merchantId: string;
  merchant?: { businessName: string };
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryState: string;
  deliveryArea: string | null;
  orderValueKobo: Kobo;
  paymentType: PaymentType;
  /** Null until Ops sets it at assignment — no more automatic fee-rules resolution. */
  deliveryFeeKobo: Kobo | null;
  riderPayoutKobo: Kobo | null;
  feeBorneBy: FeeBorneBy;
  status: OrderStatus;
  createdAt: string;
  delivery: {
    id: string;
    riderId: string | null;
    rider: { user: { fullName: string; phone: string | null } } | null;
    status: DeliveryStatus;
    paymentStatus: PaymentStatus;
    cashCollected: boolean;
    cashAmountKobo: Kobo | null;
  } | null;
}

export interface WithdrawalRow {
  id: string;
  ownerType: "merchant" | "rider";
  ownerId: string;
  amountKobo: Kobo;
  status: WithdrawalStatus;
  failureReason: string | null;
  createdAt: string;
}

export interface CashRemittanceRow {
  id: string;
  riderId: string;
  deliveryId: string;
  amountOwedKobo: Kobo;
  amountRemittedKobo: Kobo;
  status: RemittanceStatus;
  rider: { user: { fullName: string } };
}

export interface LedgerAccountRow {
  id: string;
  type: LedgerAccountType;
  ownerType: string | null;
  ownerId: string | null;
  ownerName: string | null;
  balanceKobo: Kobo;
}

export interface LedgerEntryRow {
  id: string;
  accountId: string;
  debitKobo: Kobo;
  creditKobo: Kobo;
}

export interface LedgerTransactionRow {
  id: string;
  sourceType: string;
  sourceId: string | null;
  memo: string | null;
  createdAt: string;
  entries: LedgerEntryRow[];
}

export interface AuditLogRow {
  id: string;
  actorId: string | null;
  actor: { fullName: string } | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  detail: unknown;
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

export const meldApi = {
  me: () => apiGet<Me>("/auth/me"),
  merchantsPending: () => apiGet<MerchantRow[]>("/merchants/pending"),
  merchantsAll: () => apiGet<MerchantRow[]>("/merchants"),
  riderApplications: () => apiGet<RiderApplicationRow[]>("/riders/applications"),
  ridersAll: () => apiGet<RiderRow[]>("/riders"),
  warehouses: () => apiGet<WarehouseRow[]>("/warehouses"),
  productsAll: () => apiGet<ProductRow[]>("/products"),
  inventoryAll: () => apiGet<InventoryRow[]>("/inventory"),
  movementsAll: () => apiGet<StockMovementRow[]>("/inventory/movements"),
  feeRulesAll: () => apiGet<FeeRule[]>("/fee-rules"),
  ordersAll: () => apiGet<OrderRow[]>("/orders"),
  withdrawalsAll: () => apiGet<WithdrawalRow[]>("/withdrawals"),
  cashRemittances: () => apiGet<CashRemittanceRow[]>("/cash-remittances"),
  ledgerAccounts: () => apiGet<LedgerAccountRow[]>("/ledger/accounts"),
  ledgerTransactions: () => apiGet<LedgerTransactionRow[]>("/ledger/transactions"),
  ledgerTotals: () => apiGet<{ debitKobo: Kobo; creditKobo: Kobo }>("/ledger/totals"),
  auditLog: () => apiGet<AuditLogRow[]>("/audit-log"),
};
