-- ===========================================================
-- A/B Test tracking columns for orders table
-- Add nullable columns so historical data stays intact.
-- ===========================================================

ALTER TABLE orders ADD COLUMN lp_variant TEXT;
ALTER TABLE orders ADD COLUMN lp_plan TEXT;
ALTER TABLE orders ADD COLUMN lp_pack TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_lp_variant ON orders (lp_variant);
