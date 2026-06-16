-- Sprint 3: Evidence Repository and NDT Data Room
-- AIM remains the system of record. No engineering calculation, AI approval, or API/ASME formula is implemented here.

alter table evidence_files
  add column if not exists object_storage_path text,
  add column if not exists file_name text,
  add column if not exists file_type text,
  add column if not exists location text,
  add column if not exists page_or_sheet_ref text,
  add column if not exists checksum text,
  add column if not exists evidence_category text,
  add column if not exists evidence_status text;

update evidence_files
set
  object_storage_path = coalesce(object_storage_path, object_storage_uri),
  file_name = coalesce(file_name, original_filename),
  file_type = coalesce(file_type, upper(replace(file_extension, '.', ''))),
  page_or_sheet_ref = coalesce(page_or_sheet_ref, page_figure_table_reference),
  checksum = coalesce(checksum, checksum_sha256),
  evidence_status = coalesce(evidence_status, status)
where object_storage_path is null
   or file_name is null
   or file_type is null
   or checksum is null
   or evidence_status is null;

create table if not exists ndt_measurements (
  id uuid primary key default gen_random_uuid(),
  measurement_code text not null unique,
  asset_id uuid not null references assets(id) on delete restrict,
  inspection_event_id uuid references inspection_events(id) on delete set null,
  component text not null,
  shell_course_no integer check (shell_course_no is null or shell_course_no > 0),
  cml_tml_id text,
  grid_ref text,
  elevation_m numeric(12,4),
  orientation text,
  measured_thickness_mm numeric(10,3) not null check (measured_thickness_mm > 0),
  reading_date date not null,
  method text not null,
  confidence numeric(5,4) not null default 1.0000 check (confidence >= 0 and confidence <= 1),
  evidence_file_id uuid references evidence_files(id) on delete set null,
  extraction_source text not null default 'manual' check (extraction_source in ('manual', 'bulk_import', 'ai_staging', 'vendor_import')),
  reviewer_status text not null default 'needs_review' check (reviewer_status in ('needs_review', 'reviewed', 'rejected', 'approved')),
  validation_status text not null default 'not_validated' check (validation_status in ('not_validated', 'valid', 'warning', 'blocked')),
  validation_message text,
  is_critical boolean not null default true,
  created_by uuid references users(id),
  reviewed_by uuid references users(id),
  approved_by uuid references users(id),
  reviewed_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ndt_measurements_asset_id on ndt_measurements(asset_id);
create index if not exists idx_ndt_measurements_inspection_event_id on ndt_measurements(inspection_event_id);
create index if not exists idx_ndt_measurements_evidence_file_id on ndt_measurements(evidence_file_id);
create index if not exists idx_ndt_measurements_status on ndt_measurements(reviewer_status, validation_status);
create index if not exists idx_evidence_files_file_type on evidence_files(file_type);
create index if not exists idx_evidence_files_status on evidence_files(status);

insert into permissions(permission_code, description) values
  ('evidence.open', 'Open evidence preview or object storage link'),
  ('ndt.import', 'Bulk import NDT data')
on conflict (permission_code) do update set description = excluded.description;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in ('evidence.open','ndt.import')
where r.role_code = 'admin'
on conflict do nothing;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in ('evidence.open')
where r.role_code in ('data_entry','inspector','engineer','senior_engineer','qa_qc','client_viewer')
on conflict do nothing;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in ('ndt.import')
where r.role_code in ('data_entry','inspector','senior_engineer')
on conflict do nothing;
