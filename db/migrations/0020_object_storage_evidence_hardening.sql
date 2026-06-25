-- RC3-B: Evidence object-storage hardening.
-- PostgreSQL stores evidence metadata, upload sessions, object keys, checksums, and audit trail only.
-- Original evidence binaries remain in private S3-compatible object storage.

alter table evidence_files add column if not exists storage_provider text not null default 's3-compatible';
alter table evidence_files add column if not exists storage_bucket text;
alter table evidence_files add column if not exists object_key text;
alter table evidence_files add column if not exists object_version_id text;
alter table evidence_files add column if not exists size_bytes bigint;
alter table evidence_files add column if not exists upload_status text not null default 'verified';
alter table evidence_files add column if not exists uploaded_at timestamptz;
alter table evidence_files add column if not exists completed_at timestamptz;
alter table evidence_files add column if not exists signed_url_expires_at timestamptz;
alter table evidence_files add column if not exists accessed_at timestamptz;

update evidence_files
set storage_bucket = coalesce(storage_bucket, 'aim-evidence-local'),
    object_key = coalesce(object_key, nullif(regexp_replace(coalesce(object_storage_path, object_storage_uri), '^/+',''), '')),
    size_bytes = coalesce(size_bytes, file_size_bytes),
    uploaded_at = coalesce(uploaded_at, created_at),
    completed_at = coalesce(completed_at, created_at)
where storage_bucket is null
   or object_key is null
   or size_bytes is null
   or uploaded_at is null
   or completed_at is null;

do $$
begin
  alter table evidence_files drop constraint if exists evidence_files_upload_status_check;
  alter table evidence_files add constraint evidence_files_upload_status_check
    check (upload_status in ('pending','uploaded','verified','failed','expired','cancelled'));
exception when duplicate_object then null;
end $$;

create table if not exists evidence_upload_sessions (
  upload_session_id uuid primary key default gen_random_uuid(),
  evidence_id uuid references evidence_files(id) on delete set null,
  asset_id uuid not null references assets(id) on delete restrict,
  inspection_id uuid references inspection_events(id) on delete set null,
  evidence_code text not null,
  original_filename text not null,
  safe_filename text not null,
  declared_mime_type text not null,
  declared_size_bytes bigint not null check (declared_size_bytes > 0),
  expected_checksum_sha256 text,
  storage_provider text not null default 's3-compatible',
  storage_bucket text not null,
  object_key text not null,
  upload_status text not null default 'pending' check (upload_status in ('pending','uploaded','verified','failed','expired','cancelled')),
  requested_by uuid references users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  completed_at timestamptz,
  metadata_json jsonb not null default '{}'::jsonb,
  unique(storage_bucket, object_key)
);

create index if not exists idx_evidence_upload_sessions_asset on evidence_upload_sessions(asset_id, created_at desc);
create index if not exists idx_evidence_upload_sessions_status on evidence_upload_sessions(upload_status, expires_at);
create index if not exists idx_evidence_files_object_key on evidence_files(storage_bucket, object_key);
create index if not exists idx_evidence_files_upload_status on evidence_files(upload_status);

insert into permissions(permission_code, description) values
  ('evidence.download_url', 'Create audited signed download URLs for evidence files')
on conflict (permission_code) do nothing;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code = 'evidence.download_url'
where r.role_code in ('admin','engineer','senior_engineer','lead_engineer','approver','qa_qc','client_viewer')
on conflict do nothing;

insert into audit_logs(event_type, entity_type, metadata_json)
values ('rc3_b.evidence_object_storage_migration_applied', 'migration', '{"phase":"RC3-B","scope":"evidence object-storage metadata and upload sessions","object_storage_source_of_truth":"private S3-compatible object storage"}'::jsonb);
