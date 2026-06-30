-- Enterprise Multi-Tenant Runtime Implementation Sprint 2: Route-Wide Tenant Filtering and Object Storage Tenant Boundary.
-- Scope-limited runtime hardening: tenant-scoped evidence upload sessions, report exports, and object-storage boundary evidence.
-- This migration does not certify production multi-tenant isolation by itself; route-wide filtering and human review remain required.
-- AI/n8n/service actors cannot approve tenant filter rollout readiness, tenant object-storage boundary readiness, or Sprint 2 closure.

alter table if exists evidence_upload_sessions add column if not exists tenant_id uuid references tenants(id) on delete restrict;

-- Use correlated subqueries here instead of referencing the UPDATE target alias from a FROM/JOIN clause.
-- PostgreSQL does not allow the target alias to be referenced from that part of the query on a fresh migration run.
update evidence_upload_sessions eus
set tenant_id = coalesce(
  (select ef.tenant_id from evidence_files ef where ef.id = eus.evidence_id limit 1),
  (select a.tenant_id from assets a where a.id = eus.asset_id limit 1),
  '00000000-0000-0000-0000-000000000001'::uuid
)
where eus.tenant_id is null;

update evidence_upload_sessions
set tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
where tenant_id is null;

alter table if exists report_exports add column if not exists tenant_id uuid references tenants(id) on delete restrict;

update report_exports re
set tenant_id = coalesce(r.tenant_id, '00000000-0000-0000-0000-000000000001'::uuid)
from reports r
where re.report_id = r.id
  and re.tenant_id is null;

update report_exports
set tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
where tenant_id is null;

create index if not exists idx_evidence_upload_sessions_tenant_status on evidence_upload_sessions(tenant_id, upload_status, created_at desc);
create index if not exists idx_evidence_upload_sessions_tenant_asset on evidence_upload_sessions(tenant_id, asset_id, created_at desc);
create index if not exists idx_report_exports_tenant_report on report_exports(tenant_id, report_id, exported_at desc);
create index if not exists idx_report_exports_tenant_object_key on report_exports(tenant_id, storage_bucket, object_key);

comment on column evidence_upload_sessions.tenant_id is 'Sprint 2 tenant boundary for evidence object-storage upload sessions.';
comment on column report_exports.tenant_id is 'Sprint 2 tenant boundary for report object-storage export artifacts.';
