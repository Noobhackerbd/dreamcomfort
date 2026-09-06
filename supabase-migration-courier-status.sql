-- Per-order courier (CarryBee) tracking status, refreshed by the /api/cron/courier-status
-- cron every 6 hours. Delivered/returned orders are skipped from re-checking; a parcel
-- stuck at "pickup requested" for 20h+ surfaces in the Missed Entry tab.

alter table orders add column if not exists courier_status text;        -- normalized: pending / pickup_requested / in_transit / delivered / returned / hold / cancelled
alter table orders add column if not exists courier_status_at timestamptz; -- when it was last checked / changed
alter table orders add column if not exists courier_pickup_at timestamptz; -- when it first entered "pickup requested" (for the 20h rule)
alter table orders add column if not exists courier_last_raw text;         -- raw status string from the courier (for display / debugging)

create index if not exists idx_orders_courier_status on orders(courier_status);
