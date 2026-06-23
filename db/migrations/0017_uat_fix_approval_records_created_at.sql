-- UAT Cycle 1 hotfix:
-- approval_records API requires created_at for insert response and list ordering.
-- This preserves approval audit chronology and does not weaken governance gates.

alter table approval_records
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_approval_records_created_at
  on approval_records(created_at desc);
