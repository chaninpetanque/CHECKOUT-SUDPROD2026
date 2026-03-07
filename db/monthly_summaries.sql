-- Create monthly_summaries table for storing pre-deletion reports
create table if not exists monthly_summaries (
  id bigserial primary key,
  period text not null unique,        -- e.g. "2026-02"
  summary jsonb not null,             -- { total, scanned, uploaded, surplus, by_date: [...] }
  csv_data text,                      -- raw CSV string for download
  records_deleted int default 0,
  created_at timestamptz default now()
);

-- Index for quick lookup by period
create index if not exists idx_monthly_summaries_period on monthly_summaries (period);
