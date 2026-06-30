-- Enterprise Multi-Tenant Runtime Sprint 3
-- Full route expansion and tenant isolation regression harness evidence table.
-- This migration records human review evidence for route-family tenant isolation status.

create table if not exists tenant_route_isolation_reviews (
  id uuid primary key default gen_random_uuid(),
  route_file text not null,
  route_family text not null,
  tenant_scope_status text not null check (tenant_scope_status in ('tenant_scoped','tenant_control_plane','auth_context','global_system','public_health','local_demo_only')),
  boundary_mode text not null,
  evidence_code text not null,
  review_status text not null default 'pending' check (review_status in ('pending','passed','failed','accepted_with_risk')),
  reviewed_by_user_id uuid,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(route_file)
);

create index if not exists idx_tenant_route_isolation_reviews_status
  on tenant_route_isolation_reviews(review_status, tenant_scope_status);

create index if not exists idx_tenant_route_isolation_reviews_evidence
  on tenant_route_isolation_reviews(evidence_code);

insert into tenant_route_isolation_reviews(route_file, route_family, tenant_scope_status, boundary_mode, evidence_code, review_status, notes)
values
  ('apps/api/src/routes/assets.ts', 'Asset register and asset detail workspace', 'tenant_scoped', 'runtime_filter', 'MT-S3-003', 'pending', 'Sprint 2 runtime filter pattern retained and tracked by Sprint 3 harness.'),
  ('apps/api/src/routes/evidence.ts', 'Evidence room, signed URL, and evidence linkage', 'tenant_scoped', 'runtime_filter_and_object_boundary', 'MT-S3-004', 'pending', 'Sprint 2 tenant object-storage boundary retained and tracked by Sprint 3 harness.'),
  ('apps/api/src/routes/reports.ts', 'Report builder, export, and issue gates', 'tenant_scoped', 'runtime_filter_and_object_boundary', 'MT-S3-005', 'pending', 'Sprint 2 tenant report export object boundary retained and tracked by Sprint 3 harness.'),
  ('apps/api/src/routes/inspections.ts', 'Inspection events and inspection package readiness', 'tenant_scoped', 'runtime_filter', 'MT-S3-006', 'pending', 'Route family is tenant-scoped and must remain covered by route isolation regression before tenant production certification.'),
  ('apps/api/src/routes/ndt.ts', 'NDT measurement create/import/read APIs', 'tenant_scoped', 'runtime_filter', 'MT-S3-006', 'pending', 'Route family is tenant-scoped and must remain covered by route isolation regression before tenant production certification.'),
  ('apps/api/src/routes/findings.ts', 'Findings and anomaly lifecycle', 'tenant_scoped', 'runtime_filter', 'MT-S3-006', 'pending', 'Route family is tenant-scoped and must remain covered by route isolation regression before tenant production certification.'),
  ('apps/api/src/routes/calculations.ts', 'Calculation runs and deterministic calculation snapshots', 'tenant_scoped', 'runtime_filter', 'MT-S3-006', 'pending', 'Route family is tenant-scoped and must remain covered by route isolation regression before tenant production certification.'),
  ('apps/api/src/routes/engineering-reviews.ts', 'Engineering review approvals and reviewer gates', 'tenant_scoped', 'runtime_filter', 'MT-S3-006', 'pending', 'Route family is tenant-scoped and must remain covered by route isolation regression before tenant production certification.'),
  ('apps/api/src/routes/integrity-decisions.ts', 'Integrity decision records and dispositions', 'tenant_scoped', 'runtime_filter', 'MT-S3-006', 'pending', 'Route family is tenant-scoped and must remain covered by route isolation regression before tenant production certification.'),
  ('apps/api/src/routes/work-orders.ts', 'Internal work orders and closure readiness', 'tenant_scoped', 'runtime_filter', 'MT-S3-006', 'pending', 'Route family is tenant-scoped and must remain covered by route isolation regression before tenant production certification.'),
  ('apps/api/src/routes/audit-logs.ts', 'Audit log visibility', 'tenant_scoped', 'runtime_filter', 'MT-S3-007', 'pending', 'Operator/audit visibility must remain tenant-aware before tenant production certification.'),
  ('apps/api/src/routes/ai-extraction.ts', 'AI extraction staging and promotion governance', 'tenant_scoped', 'runtime_filter', 'MT-S3-007', 'pending', 'AI output remains staging-only; tenant route isolation remains human reviewed.'),
  ('apps/api/src/routes/tenants.ts', 'Tenant context and tenant isolation health', 'tenant_control_plane', 'tenant_context_control_plane', 'MT-S3-008', 'pending', 'Tenant control-plane route; no cross-tenant engineering data exposure.'),
  ('apps/api/src/routes/auth.ts', 'Authentication and session context', 'auth_context', 'auth_session_boundary', 'MT-S3-009', 'pending', 'Auth/session route; tenant selection follows membership resolution.'),
  ('apps/api/src/routes/health.ts', 'Health checks', 'public_health', 'public_no_tenant_data', 'MT-S3-009', 'pending', 'Public health route; no tenant engineering data returned.')
on conflict(route_file) do update set
  route_family = excluded.route_family,
  tenant_scope_status = excluded.tenant_scope_status,
  boundary_mode = excluded.boundary_mode,
  evidence_code = excluded.evidence_code,
  notes = excluded.notes,
  updated_at = now();
