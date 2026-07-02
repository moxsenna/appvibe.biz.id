-- Migration: Add tracking_meta to orders
-- This column stores a JSON string containing fbp, fbc, client_ip, and user_agent
-- used for Conversions API (CAPI) events.

ALTER TABLE orders ADD COLUMN tracking_meta TEXT;
