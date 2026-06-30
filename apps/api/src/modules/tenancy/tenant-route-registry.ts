export type TenantRouteScopeStatus =
  | 'tenant_scoped'
  | 'tenant_control_plane'
  | 'auth_context'
  | 'global_system'
  | 'public_health'
  | 'local_demo_only';

export type TenantBoundaryMode =
  | 'runtime_filter'
  | 'runtime_filter_and_object_boundary'
  | 'tenant_context_control_plane'
  | 'auth_session_boundary'
  | 'system_observability_boundary'
  | 'public_no_tenant_data'
  | 'local_demo_non_production';

export type TenantRouteRegistryEntry = {
  routeFile: string;
  routeFamily: string;
  representativePaths: string[];
  scopeStatus: TenantRouteScopeStatus;
  boundaryMode: TenantBoundaryMode;
  evidenceId: string;
  owner: 'Engineering' | 'Security' | 'Operations' | 'Product' | 'Customer Success';
  runtimeBoundary: string;
  sprint3Disposition: 'closed_by_runtime_pattern' | 'closed_by_control_plane_boundary' | 'closed_by_public_boundary' | 'closed_by_non_production_boundary';
};

export const TENANT_ROUTE_REGISTRY: TenantRouteRegistryEntry[] = [
  {
    routeFile: 'apps/api/src/routes/assets.ts',
    routeFamily: 'Asset register and asset detail workspace',
    representativePaths: ['/api/v1/assets', '/api/v1/assets/:id', '/api/v1/assets/:id/readiness'],
    scopeStatus: 'tenant_scoped',
    boundaryMode: 'runtime_filter',
    evidenceId: 'MT-S3-003',
    owner: 'Engineering',
    runtimeBoundary: 'Sprint 2 appendTenantWhereClause and tenantIdForInsert route pattern',
    sprint3Disposition: 'closed_by_runtime_pattern'
  },
  {
    routeFile: 'apps/api/src/routes/evidence.ts',
    routeFamily: 'Evidence room, signed URL, and evidence linkage',
    representativePaths: ['/api/v1/evidence', '/api/v1/evidence/:id/download-url', '/api/v1/evidence/:id/delete-request'],
    scopeStatus: 'tenant_scoped',
    boundaryMode: 'runtime_filter_and_object_boundary',
    evidenceId: 'MT-S3-004',
    owner: 'Security',
    runtimeBoundary: 'Sprint 2 tenant_id filters plus tenantObjectStoragePrefix object-key boundary assertions',
    sprint3Disposition: 'closed_by_runtime_pattern'
  },
  {
    routeFile: 'apps/api/src/routes/reports.ts',
    routeFamily: 'Report builder, export, and issue gates',
    representativePaths: ['/api/v1/reports', '/api/v1/reports/:id/export', '/api/v1/reports/:id/issue'],
    scopeStatus: 'tenant_scoped',
    boundaryMode: 'runtime_filter_and_object_boundary',
    evidenceId: 'MT-S3-005',
    owner: 'Engineering',
    runtimeBoundary: 'Sprint 2 tenant_id export filters plus tenant-scoped report export object keys',
    sprint3Disposition: 'closed_by_runtime_pattern'
  },
  {
    routeFile: 'apps/api/src/routes/inspections.ts',
    routeFamily: 'Inspection events and inspection package readiness',
    representativePaths: ['/api/v1/inspections', '/api/v1/inspections/:id'],
    scopeStatus: 'tenant_scoped',
    boundaryMode: 'runtime_filter',
    evidenceId: 'MT-S3-006',
    owner: 'Engineering',
    runtimeBoundary: 'Sprint 3 registry-enforced tenant route expansion item; SQL tenant_id runtime filters are enforced',
    sprint3Disposition: 'closed_by_runtime_pattern'
  },
  {
    routeFile: 'apps/api/src/routes/ndt.ts',
    routeFamily: 'NDT measurement create/import/read APIs',
    representativePaths: ['/api/v1/ndt/measurements', '/api/v1/ndt/import'],
    scopeStatus: 'tenant_scoped',
    boundaryMode: 'runtime_filter',
    evidenceId: 'MT-S3-006',
    owner: 'Engineering',
    runtimeBoundary: 'Sprint 3 registry-enforced tenant route expansion item; measurement tenant_id predicates are enforced',
    sprint3Disposition: 'closed_by_runtime_pattern'
  },
  {
    routeFile: 'apps/api/src/routes/ndt-data-room.ts',
    routeFamily: 'NDT data room visualization and drilldown',
    representativePaths: ['/api/v1/ndt-data-room'],
    scopeStatus: 'tenant_scoped',
    boundaryMode: 'runtime_filter',
    evidenceId: 'MT-S3-006',
    owner: 'Engineering',
    runtimeBoundary: 'Sprint 3 registry-enforced tenant visualization route item; read queries enforce tenant context',
    sprint3Disposition: 'closed_by_runtime_pattern'
  },
  {
    routeFile: 'apps/api/src/routes/findings.ts',
    routeFamily: 'Findings and anomaly lifecycle',
    representativePaths: ['/api/v1/findings', '/api/v1/findings/:id/close'],
    scopeStatus: 'tenant_scoped',
    boundaryMode: 'runtime_filter',
    evidenceId: 'MT-S3-006',
    owner: 'Engineering',
    runtimeBoundary: 'Sprint 3 registry-enforced finding tenant_id predicates are enforced',
    sprint3Disposition: 'closed_by_runtime_pattern'
  },
  {
    routeFile: 'apps/api/src/routes/calculations.ts',
    routeFamily: 'Calculation runs and deterministic calculation snapshots',
    representativePaths: ['/api/v1/calculations/run', '/api/v1/calculations/:id'],
    scopeStatus: 'tenant_scoped',
    boundaryMode: 'runtime_filter',
    evidenceId: 'MT-S3-006',
    owner: 'Engineering',
    runtimeBoundary: 'Sprint 3 registry-enforced calculation tenant_id predicates are enforced',
    sprint3Disposition: 'closed_by_runtime_pattern'
  },
  {
    routeFile: 'apps/api/src/routes/engineering-reviews.ts',
    routeFamily: 'Engineering review approvals and reviewer gates',
    representativePaths: ['/api/v1/engineering-reviews', '/api/v1/engineering-reviews/:id/approve'],
    scopeStatus: 'tenant_scoped',
    boundaryMode: 'runtime_filter',
    evidenceId: 'MT-S3-006',
    owner: 'Engineering',
    runtimeBoundary: 'Sprint 3 registry-enforced engineering review tenant_id predicates are enforced',
    sprint3Disposition: 'closed_by_runtime_pattern'
  },
  {
    routeFile: 'apps/api/src/routes/integrity-decisions.ts',
    routeFamily: 'Integrity decision records and dispositions',
    representativePaths: ['/api/v1/integrity-decisions', '/api/v1/integrity-decisions/:id'],
    scopeStatus: 'tenant_scoped',
    boundaryMode: 'runtime_filter',
    evidenceId: 'MT-S3-006',
    owner: 'Engineering',
    runtimeBoundary: 'Sprint 3 registry-enforced integrity decision tenant_id predicates are enforced',
    sprint3Disposition: 'closed_by_runtime_pattern'
  },
  {
    routeFile: 'apps/api/src/routes/work-orders.ts',
    routeFamily: 'Internal work orders and closure readiness',
    representativePaths: ['/api/v1/work-orders', '/api/v1/work-orders/:id/close'],
    scopeStatus: 'tenant_scoped',
    boundaryMode: 'runtime_filter',
    evidenceId: 'MT-S3-006',
    owner: 'Operations',
    runtimeBoundary: 'Sprint 3 registry-enforced work order tenant_id predicates are enforced',
    sprint3Disposition: 'closed_by_runtime_pattern'
  },
  {
    routeFile: 'apps/api/src/routes/ffs.ts',
    routeFamily: 'FFS case workflow',
    representativePaths: ['/api/v1/ffs/cases', '/api/v1/ffs/cases/:id'],
    scopeStatus: 'tenant_scoped',
    boundaryMode: 'runtime_filter',
    evidenceId: 'MT-S3-006',
    owner: 'Engineering',
    runtimeBoundary: 'Sprint 3 registry-enforced FFS tenant boundary requirement; no copied API/API-ASME formulas introduced',
    sprint3Disposition: 'closed_by_runtime_pattern'
  },
  {
    routeFile: 'apps/api/src/routes/rbi.ts',
    routeFamily: 'RBI workflow and risk ranking interface',
    representativePaths: ['/api/v1/rbi/cases', '/api/v1/rbi/cases/:id'],
    scopeStatus: 'tenant_scoped',
    boundaryMode: 'runtime_filter',
    evidenceId: 'MT-S3-006',
    owner: 'Engineering',
    runtimeBoundary: 'Sprint 3 registry-enforced RBI tenant boundary requirement; no copied API/API-ASME formulas introduced',
    sprint3Disposition: 'closed_by_runtime_pattern'
  },
  {
    routeFile: 'apps/api/src/routes/integrity-workspace.ts',
    routeFamily: 'End-to-end integrity workspace consolidation',
    representativePaths: ['/api/v1/integrity-workspace'],
    scopeStatus: 'tenant_scoped',
    boundaryMode: 'runtime_filter',
    evidenceId: 'MT-S3-006',
    owner: 'Product',
    runtimeBoundary: 'Sprint 3 registry-enforced workspace aggregator tenant-context requirement',
    sprint3Disposition: 'closed_by_runtime_pattern'
  },
  {
    routeFile: 'apps/api/src/routes/audit-logs.ts',
    routeFamily: 'Audit log visibility',
    representativePaths: ['/api/v1/audit-logs'],
    scopeStatus: 'tenant_scoped',
    boundaryMode: 'runtime_filter',
    evidenceId: 'MT-S3-007',
    owner: 'Security',
    runtimeBoundary: 'Sprint 3 registry-enforced audit log tenant_id and operator boundary requirement',
    sprint3Disposition: 'closed_by_runtime_pattern'
  },
  {
    routeFile: 'apps/api/src/routes/governance-dashboard.ts',
    routeFamily: 'Governance dashboard aggregation',
    representativePaths: ['/api/v1/governance-dashboard'],
    scopeStatus: 'tenant_scoped',
    boundaryMode: 'runtime_filter',
    evidenceId: 'MT-S3-007',
    owner: 'Product',
    runtimeBoundary: 'Sprint 3 registry-enforced dashboard aggregate tenant-context requirement',
    sprint3Disposition: 'closed_by_runtime_pattern'
  },
  {
    routeFile: 'apps/api/src/routes/workflow-console.ts',
    routeFamily: 'n8n workflow console visibility',
    representativePaths: ['/api/v1/workflow-console'],
    scopeStatus: 'tenant_scoped',
    boundaryMode: 'runtime_filter',
    evidenceId: 'MT-S3-007',
    owner: 'Operations',
    runtimeBoundary: 'Sprint 3 registry-enforced workflow event tenant_id visibility boundary; n8n remains orchestration-only',
    sprint3Disposition: 'closed_by_runtime_pattern'
  },
  {
    routeFile: 'apps/api/src/routes/ai-extraction.ts',
    routeFamily: 'AI extraction staging and promotion governance',
    representativePaths: ['/api/v1/ai/extraction-jobs', '/api/v1/ai/extraction-jobs/:id/promote'],
    scopeStatus: 'tenant_scoped',
    boundaryMode: 'runtime_filter',
    evidenceId: 'MT-S3-007',
    owner: 'Security',
    runtimeBoundary: 'Sprint 3 registry-enforced staging tenant boundary; AI output remains staging-only and cannot approve/promotion-signoff itself',
    sprint3Disposition: 'closed_by_runtime_pattern'
  },
  {
    routeFile: 'apps/api/src/routes/engineering-validation.ts',
    routeFamily: 'Engineering validation and validation case execution',
    representativePaths: ['/api/v1/engineering-validation'],
    scopeStatus: 'tenant_scoped',
    boundaryMode: 'runtime_filter',
    evidenceId: 'MT-S3-007',
    owner: 'Engineering',
    runtimeBoundary: 'Sprint 3 registry-enforced tenant-aware validation case visibility boundary',
    sprint3Disposition: 'closed_by_runtime_pattern'
  },
  {
    routeFile: 'apps/api/src/routes/formulas.ts',
    routeFamily: 'Formula registry and version governance',
    representativePaths: ['/api/v1/formulas', '/api/v1/formulas/:id/approve'],
    scopeStatus: 'global_system',
    boundaryMode: 'system_observability_boundary',
    evidenceId: 'MT-S3-008',
    owner: 'Engineering',
    runtimeBoundary: 'Global formula governance: deterministic/versioned formulas are not tenant-private engineering evidence; tenant calculation runs remain tenant-scoped',
    sprint3Disposition: 'closed_by_control_plane_boundary'
  },
  {
    routeFile: 'apps/api/src/routes/tenants.ts',
    routeFamily: 'Tenant context and tenant isolation health',
    representativePaths: ['/api/v1/tenant/context', '/api/v1/tenant/isolation-health'],
    scopeStatus: 'tenant_control_plane',
    boundaryMode: 'tenant_context_control_plane',
    evidenceId: 'MT-S3-008',
    owner: 'Security',
    runtimeBoundary: 'Sprint 1 tenant context control plane; returns only current tenant context/membership metadata',
    sprint3Disposition: 'closed_by_control_plane_boundary'
  },
  {
    routeFile: 'apps/api/src/routes/admin-governance.ts',
    routeFamily: 'Admin governance console',
    representativePaths: ['/api/v1/admin-governance'],
    scopeStatus: 'global_system',
    boundaryMode: 'system_observability_boundary',
    evidenceId: 'MT-S3-008',
    owner: 'Security',
    runtimeBoundary: 'Admin-only governance surface requiring explicit permissions and separate human approval evidence for tenant-impacting actions',
    sprint3Disposition: 'closed_by_control_plane_boundary'
  },
  {
    routeFile: 'apps/api/src/routes/security-monitoring.ts',
    routeFamily: 'Security monitoring and security events',
    representativePaths: ['/api/v1/security-monitoring'],
    scopeStatus: 'global_system',
    boundaryMode: 'system_observability_boundary',
    evidenceId: 'MT-S3-008',
    owner: 'Security',
    runtimeBoundary: 'System/security observer surface; no customer engineering evidence payloads should be exposed without operator authorization',
    sprint3Disposition: 'closed_by_control_plane_boundary'
  },
  {
    routeFile: 'apps/api/src/routes/operations.ts',
    routeFamily: 'Operations readiness and support controls',
    representativePaths: ['/api/v1/operations'],
    scopeStatus: 'global_system',
    boundaryMode: 'system_observability_boundary',
    evidenceId: 'MT-S3-008',
    owner: 'Operations',
    runtimeBoundary: 'Operations control-plane evidence surface; tenant-impacting runbooks remain human-approved and audit logged',
    sprint3Disposition: 'closed_by_control_plane_boundary'
  },
  {
    routeFile: 'apps/api/src/routes/production-validation.ts',
    routeFamily: 'Production validation and go-live evidence',
    representativePaths: ['/api/v1/production-validation'],
    scopeStatus: 'global_system',
    boundaryMode: 'system_observability_boundary',
    evidenceId: 'MT-S3-008',
    owner: 'Operations',
    runtimeBoundary: 'Production validation control-plane surface; no customer tenant data exports without tenant evidence approval',
    sprint3Disposition: 'closed_by_control_plane_boundary'
  },
  {
    routeFile: 'apps/api/src/routes/golive-readiness.ts',
    routeFamily: 'Go-live readiness and hypercare readiness',
    representativePaths: ['/api/v1/golive-readiness'],
    scopeStatus: 'global_system',
    boundaryMode: 'system_observability_boundary',
    evidenceId: 'MT-S3-008',
    owner: 'Operations',
    runtimeBoundary: 'Go-live control-plane evidence surface; no service actor closure authority',
    sprint3Disposition: 'closed_by_control_plane_boundary'
  },
  {
    routeFile: 'apps/api/src/routes/release-closure.ts',
    routeFamily: 'Release closure and final evidence records',
    representativePaths: ['/api/v1/release-closure'],
    scopeStatus: 'global_system',
    boundaryMode: 'system_observability_boundary',
    evidenceId: 'MT-S3-008',
    owner: 'Product',
    runtimeBoundary: 'Release control-plane surface with human signoff requirement; not a tenant engineering-data route',
    sprint3Disposition: 'closed_by_control_plane_boundary'
  },
  {
    routeFile: 'apps/api/src/routes/auth.ts',
    routeFamily: 'Authentication and session context',
    representativePaths: ['/api/auth/login', '/api/auth/logout', '/api/auth/refresh', '/api/auth/me'],
    scopeStatus: 'auth_context',
    boundaryMode: 'auth_session_boundary',
    evidenceId: 'MT-S3-009',
    owner: 'Security',
    runtimeBoundary: 'Authentication/session context boundary; tenant selection occurs after user membership resolution',
    sprint3Disposition: 'closed_by_control_plane_boundary'
  },
  {
    routeFile: 'apps/api/src/routes/rbac-demo.ts',
    routeFamily: 'Local RBAC demo route',
    representativePaths: ['/api/v1/rbac-demo'],
    scopeStatus: 'local_demo_only',
    boundaryMode: 'local_demo_non_production',
    evidenceId: 'MT-S3-009',
    owner: 'Security',
    runtimeBoundary: 'Explicit local demo mode only; must remain disabled outside local/test/demo guardrails',
    sprint3Disposition: 'closed_by_non_production_boundary'
  },
  {
    routeFile: 'apps/api/src/routes/health.ts',
    routeFamily: 'Health checks',
    representativePaths: ['/health', '/ready'],
    scopeStatus: 'public_health',
    boundaryMode: 'public_no_tenant_data',
    evidenceId: 'MT-S3-009',
    owner: 'Operations',
    runtimeBoundary: 'Public health route: no tenant engineering data or object-storage data returned',
    sprint3Disposition: 'closed_by_public_boundary'
  }
];

export const PRODUCTION_ROUTE_FILES = TENANT_ROUTE_REGISTRY.map((entry) => entry.routeFile).sort();

export function tenantScopedRouteEntries(entries: TenantRouteRegistryEntry[] = TENANT_ROUTE_REGISTRY): TenantRouteRegistryEntry[] {
  return entries.filter((entry) => entry.scopeStatus === 'tenant_scoped');
}

export function tenantControlPlaneRouteEntries(entries: TenantRouteRegistryEntry[] = TENANT_ROUTE_REGISTRY): TenantRouteRegistryEntry[] {
  return entries.filter((entry) => entry.scopeStatus !== 'tenant_scoped');
}

export function routeFilesMissingFromRegistry(actualRouteFiles: string[], entries: TenantRouteRegistryEntry[] = TENANT_ROUTE_REGISTRY): string[] {
  const registered = new Set(entries.map((entry) => entry.routeFile));
  return actualRouteFiles.filter((file) => !registered.has(file)).sort();
}

export function duplicateRouteRegistryFiles(entries: TenantRouteRegistryEntry[] = TENANT_ROUTE_REGISTRY): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const entry of entries) {
    if (seen.has(entry.routeFile)) duplicates.add(entry.routeFile);
    seen.add(entry.routeFile);
  }
  return [...duplicates].sort();
}

export function tenantScopedRoutesWithoutBoundary(entries: TenantRouteRegistryEntry[] = TENANT_ROUTE_REGISTRY): TenantRouteRegistryEntry[] {
  return entries.filter((entry) => entry.scopeStatus === 'tenant_scoped' && entry.boundaryMode !== 'runtime_filter' && entry.boundaryMode !== 'runtime_filter_and_object_boundary');
}

export function tenantRouteRegistryByEvidenceId(evidenceId: string, entries: TenantRouteRegistryEntry[] = TENANT_ROUTE_REGISTRY): TenantRouteRegistryEntry[] {
  return entries.filter((entry) => entry.evidenceId === evidenceId);
}
