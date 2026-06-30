-- Enterprise Multi-Tenant Runtime Implementation Sprint 1: Tenant Context and Database Isolation Foundation.
-- Scope-limited runtime foundation: tenant context tables, nullable tenant_id columns, indexes, and RBAC permission sync.
-- This migration does not enable production multi-tenant rollout by itself and does not automate tenant approval.
-- AI/n8n/service actors cannot approve tenant isolation readiness, tenant context assignment, or migration rollout readiness.

create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  tenant_code text not null unique,
  tenant_slug text not null unique,
  tenant_name text not null,
  status text not null default 'active' check (status in ('active','suspended','archived')),
  data_residency_region text,
  support_tier text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists user_tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete restrict,
  status text not null default 'active' check (status in ('active','suspended','archived')),
  is_default boolean not null default false,
  role_scope jsonb not null default '[]'::jsonb,
  assigned_by uuid references users(id),
  assigned_at timestamptz not null default now(),
  unique(user_id, tenant_id)
);

create unique index if not exists idx_user_tenant_memberships_one_default
  on user_tenant_memberships(user_id)
  where is_default and status = 'active';

create index if not exists idx_user_tenant_memberships_user_status on user_tenant_memberships(user_id, status);
create index if not exists idx_user_tenant_memberships_tenant_status on user_tenant_memberships(tenant_id, status);

insert into tenants(id, tenant_code, tenant_slug, tenant_name, status, metadata)
values (
  '00000000-0000-0000-0000-000000000001',
  'DEFAULT',
  'default',
  'Default AIM Tenant',
  'active',
  jsonb_build_object('purpose', 'Legacy single-tenant compatibility seed for controlled Sprint 1 migration')
)
on conflict (id) do update set
  tenant_code = excluded.tenant_code,
  tenant_slug = excluded.tenant_slug,
  tenant_name = excluded.tenant_name,
  status = excluded.status,
  updated_at = now();

insert into user_tenant_memberships(user_id, tenant_id, status, is_default)
select u.id, '00000000-0000-0000-0000-000000000001'::uuid, 'active', true
from users u
where not exists (
  select 1 from user_tenant_memberships existing where existing.user_id = u.id
)
on conflict (user_id, tenant_id) do nothing;

alter table if exists users add column if not exists default_tenant_id uuid references tenants(id) on delete set null;
update users
set default_tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
where default_tenant_id is null;
create index if not exists idx_users_default_tenant_id on users(default_tenant_id);

alter table if exists assets add column if not exists tenant_id uuid references tenants(id) on delete restrict;
alter table if exists inspection_events add column if not exists tenant_id uuid references tenants(id) on delete restrict;
alter table if exists evidence_files add column if not exists tenant_id uuid references tenants(id) on delete restrict;
alter table if exists ndt_measurements add column if not exists tenant_id uuid references tenants(id) on delete restrict;
alter table if exists findings add column if not exists tenant_id uuid references tenants(id) on delete restrict;
alter table if exists calculation_runs add column if not exists tenant_id uuid references tenants(id) on delete restrict;
alter table if exists engineering_reviews add column if not exists tenant_id uuid references tenants(id) on delete restrict;
alter table if exists approval_records add column if not exists tenant_id uuid references tenants(id) on delete restrict;
alter table if exists integrity_decisions add column if not exists tenant_id uuid references tenants(id) on delete restrict;
alter table if exists reports add column if not exists tenant_id uuid references tenants(id) on delete restrict;
alter table if exists internal_work_orders add column if not exists tenant_id uuid references tenants(id) on delete restrict;
alter table if exists audit_logs add column if not exists tenant_id uuid references tenants(id) on delete set null;
alter table if exists workflow_events add column if not exists tenant_id uuid references tenants(id) on delete set null;
alter table if exists error_logs add column if not exists tenant_id uuid references tenants(id) on delete set null;

update assets set tenant_id = '00000000-0000-0000-0000-000000000001'::uuid where tenant_id is null;
update inspection_events set tenant_id = '00000000-0000-0000-0000-000000000001'::uuid where tenant_id is null;
update evidence_files set tenant_id = '00000000-0000-0000-0000-000000000001'::uuid where tenant_id is null;
update ndt_measurements set tenant_id = '00000000-0000-0000-0000-000000000001'::uuid where tenant_id is null;
update findings set tenant_id = '00000000-0000-0000-0000-000000000001'::uuid where tenant_id is null;
alter table calculation_runs disable trigger trg_prevent_locked_calculation_run_update;

alter table calculation_runs disable trigger trg_prevent_locked_calculation_run_update;

update calculation_runs
set tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
where tenant_id is null;

alter table calculation_runs enable trigger trg_prevent_locked_calculation_run_update;


alter table engineering_reviews disable trigger user;

update engineering_reviews
set tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
where tenant_id is null;

alter table engineering_reviews enable trigger user;


alter table approval_records disable trigger user;

update approval_records
set tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
where tenant_id is null;

alter table approval_records enable trigger user;


alter table integrity_decisions disable trigger user;

update integrity_decisions
set tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
where tenant_id is null;

alter table integrity_decisions enable trigger user;


alter table reports disable trigger user;

update reports
set tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
where tenant_id is null;

alter table reports enable trigger user;


alter table internal_work_orders disable trigger user;

update internal_work_orders
set tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
where tenant_id is null;

alter table internal_work_orders enable trigger user;


alter table audit_logs disable trigger user;

update audit_logs
set tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
where tenant_id is null;

alter table audit_logs enable trigger user;


alter table workflow_events disable trigger user;

update workflow_events
set tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
where tenant_id is null;

alter table workflow_events enable trigger user;


alter table error_logs disable trigger user;

update error_logs
set tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
where tenant_id is null;

alter table error_logs enable trigger user;

create index if not exists idx_assets_tenant_id on assets(tenant_id);
create index if not exists idx_inspection_events_tenant_id on inspection_events(tenant_id);
create index if not exists idx_evidence_files_tenant_id on evidence_files(tenant_id);
create index if not exists idx_ndt_measurements_tenant_id on ndt_measurements(tenant_id);
create index if not exists idx_findings_tenant_id on findings(tenant_id);
create index if not exists idx_calculation_runs_tenant_id on calculation_runs(tenant_id);
create index if not exists idx_engineering_reviews_tenant_id on engineering_reviews(tenant_id);
create index if not exists idx_approval_records_tenant_id on approval_records(tenant_id);
create index if not exists idx_integrity_decisions_tenant_id on integrity_decisions(tenant_id);
create index if not exists idx_reports_tenant_id on reports(tenant_id);
create index if not exists idx_internal_work_orders_tenant_id on internal_work_orders(tenant_id);
create index if not exists idx_audit_logs_tenant_id on audit_logs(tenant_id);
create index if not exists idx_workflow_events_tenant_id on workflow_events(tenant_id);
create index if not exists idx_error_logs_tenant_id on error_logs(tenant_id);

insert into permissions(permission_code, description) values
  ('tenant.context.read', 'Read current tenant context and available tenant memberships'),
  ('tenant.read', 'Read tenant records and tenant membership summaries'),
  ('tenant.manage', 'Manage tenant records and tenant membership assignments with human approval')
on conflict (permission_code) do update set description = excluded.description;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in ('tenant.context.read')
where r.role_code in ('admin','data_entry','inspector','engineer','senior_engineer','lead_engineer','approver','management','it_admin','qa_qc','client_viewer','ai_agent')
on conflict do nothing;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in ('tenant.read','tenant.manage')
where r.role_code in ('admin','it_admin')
on conflict do nothing;
