-- Dispatcher now sets the delivery fee and rider payout manually per order
-- (at assignment time) instead of an automatic fee-rules resolution at
-- order creation. delivery_fee_kobo becomes nullable ("Calculating" in the
-- UI until set); rider_payout_kobo is a new, independent column — not a
-- fixed % of delivery_fee_kobo.
ALTER TABLE "orders" ALTER COLUMN "delivery_fee_kobo" DROP NOT NULL;
ALTER TABLE "orders" ALTER COLUMN "delivery_fee_kobo" DROP DEFAULT;
ALTER TABLE "orders" ADD COLUMN "rider_payout_kobo" BIGINT;
