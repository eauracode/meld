/**
 * Shared MELD domain types, mirroring docs/07_DATABASE_SCHEMA.sql.
 * Money is integer kobo (₦1 = 100 kobo) — never floats.
 * Once a Supabase project exists these are supplemented by generated DB types
 * in @meld/db; these hand-written types are the stable domain vocabulary.
 */

/** Integer kobo. ₦1 = 100 kobo. */
export type Kobo = number;

export type UserRole = "merchant" | "rider" | "ops_agent" | "ops_admin";
export type MerchantStatus = "pending_approval" | "approved" | "suspended";
export type RiderStatus =
  | "applied"
  | "approved"
  | "rejected"
  | "active"
  | "suspended";
export type VehicleType = "bike" | "car" | "van";
export type FeeBorneBy = "customer" | "merchant";
export type PaymentType = "prepaid" | "cod";
export type PaymentStatus = "unpaid" | "pending" | "paid" | "failed";
export type OrderStatus =
  | "created"
  | "awaiting_assignment"
  | "assigned"
  | "out_for_delivery"
  | "delivered"
  | "failed"
  | "returned"
  | "cancelled";
export type DeliveryStatus =
  | "assigned"
  | "accepted"
  | "en_route"
  | "arrived"
  | "delivered"
  | "failed";
export type WithdrawalStatus = "requested" | "processing" | "paid" | "failed";
export type RemittanceStatus = "pending" | "remitted" | "reconciled" | "flagged";
export type LedgerAccountType =
  | "merchant_payable"
  | "rider_wallet"
  | "meld_revenue"
  | "cash_in_transit"
  | "partner_float"
  | "suspense";
export type LedgerOwnerType = "merchant" | "rider" | "meld";
export type LedgerSourceType =
  | "delivery"
  | "withdrawal"
  | "remittance"
  | "adjustment";
export type FeeRuleScope = "global" | "merchant";
export type FeeRuleType = "flat" | "by_state";
export type NotificationChannel = "sms" | "email" | "in_app";
export type PaymentProviderName = "paystack" | "flutterwave" | "mock";
export type VirtualAccountPurpose = "delivery_payment" | "cash_remittance";

export interface Profile {
  id: string;
  role: UserRole;
  fullName: string;
  phone: string | null;
  email: string | null;
}

export interface Merchant {
  id: string;
  profileId: string;
  businessName: string;
  status: MerchantStatus;
  feeBorneBy: FeeBorneBy;
  pickupState: string | null;
}

export interface Rider {
  id: string;
  profileId: string;
  vehicle: VehicleType;
  state: string | null;
  status: RiderStatus;
}

export interface Order {
  id: string;
  merchantId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryState: string;
  deliveryArea: string | null;
  orderValueKobo: Kobo;
  paymentType: PaymentType;
  deliveryFeeKobo: Kobo;
  feeBorneBy: FeeBorneBy;
  status: OrderStatus;
}

export interface Delivery {
  id: string;
  orderId: string;
  riderId: string | null;
  status: DeliveryStatus;
  paymentStatus: PaymentStatus;
  cashCollected: boolean;
  cashAmountKobo: Kobo | null;
}

export interface LedgerAccount {
  id: string;
  type: LedgerAccountType;
  ownerType: LedgerOwnerType | null;
  ownerId: string | null;
}

export interface LedgerEntry {
  id: string;
  transactionId: string;
  accountId: string;
  debitKobo: Kobo;
  creditKobo: Kobo;
}

export interface LedgerTransaction {
  id: string;
  sourceType: LedgerSourceType;
  sourceId: string | null;
  memo: string | null;
}

export interface FeeRule {
  id: string;
  scope: FeeRuleScope;
  merchantId: string | null;
  type: FeeRuleType;
  intrastateFeeKobo: Kobo | null;
  byState: Record<string, Kobo> | null;
  fallbackFeeKobo: Kobo;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface Withdrawal {
  id: string;
  ownerType: "merchant" | "rider";
  ownerId: string;
  amountKobo: Kobo;
  status: WithdrawalStatus;
}

export interface CashRemittance {
  id: string;
  riderId: string;
  deliveryId: string;
  amountOwedKobo: Kobo;
  amountRemittedKobo: Kobo;
  status: RemittanceStatus;
}
