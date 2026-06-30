-- Enterprise Multi-Tenant Runtime Sprint 5
-- Tenant-scoped evidence lifecycle, backup/restore, and export controls.
-- File: 0032_enterprise_multitenant_sprint5_evidence_lifecycle_export_controls.sql
-- Forward-only migration: adds policy/evidence tables without rewriting already-tagged migrations 0028, 0029, 0030, or 0031.
-- AI/n8n/service actors cannot approve tenant evidence export, restore, backup, lifecycle deletion, or lifecycle policy closure.

create table if not exists tenant_evidence_lifecycle_policies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete restrict,
  retention_class text not null default 'standard_7_years' check (retention_class in ('standard_7_years','legal_hold','customer_contractual','pilot_short_term')),
  retention_days integer not null default 2555 check (retention_days > 0),
  archive_after_days integer not null default 365 check (archive_after_days > 0),
  legal_hold_required boolean not null default false,
  export_requires_human_approval boolean not null default true,
  restore_requires_human_approval boolean not null default true,
  delete_requires_human_approval boolean not null default true,
  object_prefix text not null,
  backup_scope_prefix text not null,
  policy_status text not null default 'pending_review' check (policy_status in ('pending_review','approved','accepted_with_risk','retired')),
  approved_by_user_id uuid references users(id),
  approved_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id)
);

create table if not exists tenant_backup_restore_drills (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete restrict,
  drill_code text not null,
  operation_type text not null check (operation_type in ('backup','restore','dr_rehearsal')),
  source_prefix text not null,
  restore_target_prefix text not null,
  evidence_prefix text not null,
  report_export_prefix text not null,
  execution_status text not null default 'planned' check (execution_status in ('planned','running','passed','failed','accepted_with_risk')),
  human_approval_id uuid,
  approved_by_user_id uuid references users(id),
  executed_by_user_id uuid references users(id),
  executed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id, drill_code)
);

create table if not exists tenant_export_control_reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete restrict,
  export_id text not null,
  export_type text not null default 'evidence_bundle',
  purpose text not null,
  requested_object_keys jsonb not null default '[]'::jsonb,
  allowed_object_keys jsonb not null default '[]'::jsonb,
  blocked_object_keys jsonb not null default '[]'::jsonb,
  blocked_reasons jsonb not null default '[]'::jsonb,
  review_status text not null default 'blocked' check (review_status in ('blocked','ready_for_human_review','approved_for_execution','rejected','completed')),
  requested_by_user_id uuid references users(id),
  human_approval_id uuid,
  approved_by_user_id uuid references users(id),
  approved_at timestamptz,
  completed_at timestamptz,
  export_manifest_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id, export_id)
);

create index if not exists idx_tenant_evidence_lifecycle_policies_status
  on tenant_evidence_lifecycle_policies(policy_status, retention_class);

create index if not exists idx_tenant_backup_restore_drills_tenant_status
  on tenant_backup_restore_drills(tenant_id, execution_status, operation_type);

create index if not exists idx_tenant_export_control_reviews_tenant_status
  on tenant_export_control_reviews(tenant_id, review_status, export_type);

insert into tenant_evidence_lifecycle_policies(
  tenant_id,
  retention_class,
  retention_days,
  archive_after_days,
  legal_hold_required,
  export_requires_human_approval,
  restore_requires_human_approval,
  delete_requires_human_approval,
  object_prefix,
  backup_scope_prefix,
  policy_status,
  notes
)
select
  t.id,
  'standard_7_years',
  2555,
  365,
  false,
  true,
  true,
  true,
  concat('tenants/', t.tenant_slug, '/', t.id::text),
  concat('tenants/', t.tenant_slug, '/', t.id::text, '/backups'),
  'pending_review',
  'Sprint 5 tenant evidence lifecycle seed. Human approval is required before export, restore, backup closure, or lifecycle deletion.'
from tenants t
where t.status = 'active'
on conflict(tenant_id) do update set
  object_prefix = excluded.object_prefix,
  backup_scope_prefix = excluded.backup_scope_prefix,
  export_requires_human_approval = true,
  restore_requires_human_approval = true,
  delete_requires_human_approval = true,
  notes = excluded.notes,
  updated_at = now();

insert into tenant_backup_restore_drills(
  tenant_id,
  drill_code,
  operation_type,
  source_prefix,
  restore_target_prefix,
  evidence_prefix,
  report_export_prefix,
  execution_status,
  notes
)
select
  t.id,
  'MT-S5-DR-BASELINE',
  'dr_rehearsal',
  concat('tenants/', t.tenant_slug, '/', t.id::text),
  concat('tenants/', t.tenant_slug, '/', t.id::text, '/restore/MT-S5-DR-BASELINE'),
  concat('tenants/', t.tenant_slug, '/', t.id::text, '/evidence'),
  concat('tenants/', t.tenant_slug, '/', t.id::text, '/reports'),
  'planned',
  'Sprint 5 baseline tenant backup/restore rehearsal scope. AI/n8n/service actors cannot approve this drill.'
from tenants t
where t.status = 'active'
on conflict(tenant_id, drill_code) do update set
  source_prefix = excluded.source_prefix,
  restore_target_prefix = excluded.restore_target_prefix,
  evidence_prefix = excluded.evidence_prefix,
  report_export_prefix = excluded.report_export_prefix,
  notes = excluded.notes,
  updated_at = now();
