-- Phase 1.3 Governance Batch: AI staging API, approval hardening, and evidence access hardening support.
-- Scope-limited to governance columns and permissions only.
-- No API 579/API 581 quantitative implementation, CMMS integration, 3D processing, or API/API-ASME formula expression is implemented here.

alter table evidence_files
  add column if not exists malware_scan_status text not null default 'pending_scan',
  add column if not exists access_status text not null default 'not_issued',
  add column if not exists accessed_at timestamptz,
  add column if not exists delete_requested_by uuid references users(id),
  add column if not exists delete_requested_at timestamptz,
  add column if not exists delete_approved_by uuid references users(id),
  add column if not exists delete_approved_at timestamptz;

alter table evidence_files drop constraint if exists evidence_files_malware_scan_status_check;
alter table evidence_files add constraint evidence_files_malware_scan_status_check
  check (malware_scan_status in ('pending_scan','clean','infected','scan_failed','scan_bypassed'));

alter table evidence_files drop constraint if exists evidence_files_access_status_check;
alter table evidence_files add constraint evidence_files_access_status_check
  check (access_status in ('not_issued','signed_url_issued','downloaded','blocked'));

create index if not exists idx_evidence_files_malware_scan_status on evidence_files(malware_scan_status);
create index if not exists idx_evidence_files_access_status on evidence_files(access_status);
create index if not exists idx_evidence_files_delete_requested_by on evidence_files(delete_requested_by);

insert into permissions(permission_code, description) values
  ('staging.review', 'Review AI extraction staging records'),
  ('staging.promote', 'Promote engineer-reviewed staging records'),
  ('manual_override.create', 'Create manual override records with reason and evidence reference'),
  ('data_quality_check.read', 'Read AI extraction and staging data quality checks'),
  ('evidence.download_url', 'Create short-lived signed evidence download URLs')
on conflict (permission_code) do update set description = excluded.description;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in (
  'staging.review','staging.promote','manual_override.create','data_quality_check.read','evidence.download_url','evidence.open'
)
where r.role_code in ('engineer','senior_engineer','lead_engineer','approver','admin','it_admin')
on conflict do nothing;

-- Source-of-truth controls supported by this migration:
-- 1. AI extraction output remains non-final and is handled only through extraction/staging APIs.
-- 2. Manual overrides require reason, reviewer, and evidence reference in manual_overrides.
-- 3. Evidence access uses signed URL issuance through AIM API after RBAC and audit.
-- 4. Evidence deletion is soft/controlled and linked evidence cannot be deleted.
