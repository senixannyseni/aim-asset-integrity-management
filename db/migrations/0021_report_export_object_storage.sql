-- RC3-B: Report export object-storage hardening.
-- Generated report artifacts are stored in object storage; PostgreSQL stores metadata and hash traceability.

alter table report_exports add column if not exists storage_provider text not null default 's3-compatible';
alter table report_exports add column if not exists storage_bucket text;
alter table report_exports add column if not exists object_key text;
alter table report_exports add column if not exists object_version_id text;
alter table report_exports add column if not exists content_hash_sha256 text;
alter table report_exports add column if not exists input_snapshot_hash text;
alter table report_exports add column if not exists generated_by uuid references users(id);
alter table report_exports add column if not exists generated_at timestamptz;
alter table report_exports add column if not exists download_status text not null default 'not_downloaded';
alter table report_exports add column if not exists file_size_bytes bigint;
alter table report_exports add column if not exists mime_type text;

update report_exports
set storage_bucket = coalesce(storage_bucket, 'aim-evidence-local'),
    object_key = coalesce(object_key, nullif(regexp_replace(object_storage_uri, '^/+',''), '')),
    content_hash_sha256 = coalesce(content_hash_sha256, checksum_sha256),
    generated_by = coalesce(generated_by, exported_by),
    generated_at = coalesce(generated_at, exported_at, created_at)
where storage_bucket is null
   or content_hash_sha256 is null
   or generated_at is null;

do $$
begin
  alter table report_exports drop constraint if exists report_exports_export_format_check;
  alter table report_exports add constraint report_exports_export_format_check
    check (export_format in ('pdf','docx','html','json'));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table report_exports drop constraint if exists report_exports_export_status_check;
  alter table report_exports add constraint report_exports_export_status_check
    check (export_status in ('requested','generated','failed','downloaded','superseded'));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table report_exports drop constraint if exists report_exports_download_status_check;
  alter table report_exports add constraint report_exports_download_status_check
    check (download_status in ('not_downloaded','signed_url_issued','downloaded','blocked'));
exception when duplicate_object then null;
end $$;

create index if not exists idx_report_exports_object_key on report_exports(storage_bucket, object_key);
create index if not exists idx_report_exports_download_status on report_exports(download_status);

insert into permissions(permission_code, description) values
  ('report.export', 'Create and download object-storage report export artifacts')
on conflict (permission_code) do nothing;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code = 'report.export'
where r.role_code in ('admin','senior_engineer','lead_engineer','approver')
on conflict do nothing;

insert into audit_logs(event_type, entity_type, metadata_json)
values ('rc3_b.report_export_object_storage_migration_applied', 'migration', '{"phase":"RC3-B","scope":"report export object-storage metadata","no_base64_normal_response":true}'::jsonb);
