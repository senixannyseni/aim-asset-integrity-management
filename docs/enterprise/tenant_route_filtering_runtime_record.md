# Tenant Route Filtering Runtime Record

**Package:** Enterprise Multi-Tenant Runtime Sprint 2  
**Evidence focus:** `MT-S2-002`, `MT-S2-003`, `MT-S2-004`

## 1. Runtime Helpers

Sprint 2 adds `apps/api/src/modules/tenancy/tenant-scope.ts` to standardize tenant-scoped route behavior.

Required helper markers:

- `requireTenantContextFromRequest`;
- `appendTenantWhereClause`;
- `tenantWhereClause`;
- `tenantIdForInsert`;
- `assertTenantScopedRow`;
- `tenantScopeMetadata`.

## 2. Route Filtering Pattern

Implemented routes must resolve tenant context before tenant-aware operations and add `tenant_id` filters to query boundaries.

Route evidence includes:

- asset list/detail/readiness/create/update/delete filtering;
- evidence list/detail/access/upload/link/delete filtering;
- report export creation/download filtering.

## 3. Rollout Rule

Sprint 2 starts route-wide filtering with high-risk tenant-scoped asset/evidence/report paths. Remaining historical routes must be tracked in Sprint 3 before production multi-tenant certification.

AI/n8n/service actors cannot approve route-wide tenant filtering.
AI/n8n/service actors cannot approve tenant-scoped route rollout.
