-- Create parcels table
create table if not exists parcels (
  id bigserial primary key,
  awb text not null,
  status text not null,
  date text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add unique constraint to prevent duplicate AWB entries for the same date
alter table parcels
  add constraint parcels_awb_date_key unique (awb, date);

-- Create indexes for performance
create index if not exists idx_parcels_date on parcels (date);
create index if not exists idx_parcels_awb_date on parcels (awb, date);
create index if not exists idx_parcels_status on parcels (status);

-- Enable Row Level Security (RLS) if needed (optional, depends on your auth policy)
-- alter table parcels enable row level security;

-- Create a policy that allows all access (for service role usage)
-- create policy "Enable all access for service role" on parcels
-- for all
-- using (true)
-- with check (true);
