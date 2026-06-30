# Tenant Object Storage Boundary Record

**Package:** Enterprise Multi-Tenant Runtime Sprint 2  
**Evidence focus:** `MT-S2-005`, `MT-S2-006`, `MT-S2-007`

## 1. Object Key Boundary

Sprint 2 adds `apps/api/src/modules/tenancy/tenant-object-boundary.ts` to enforce tenant-aware object key prefixes.

Required object-storage helpers:

- `tenantObjectStoragePrefix`;
- `buildTenantScopedObjectKey`;
- `assertTenantObjectKeyBoundary`;
- `isTenantScopedObjectKey`;
- `normalizeRelativeObjectKey`.

## 2. Object Key Pattern

Tenant-scoped object keys use this pattern:

```text
tenants/{tenant_slug}/{tenant_id}/evidence/{asset}/{inspection}/{evidence_code}/{filename}
tenants/{tenant_slug}/{tenant_id}/reports/{report_id}/exports/{export_id}/{filename}
```

Evidence upload sessions and report exports now receive tenant_id boundaries through migration `0029_enterprise_multitenant_sprint2_route_filtering_object_boundary.sql`.

## 3. Access Rule

Object-storage access must assert the selected tenant boundary before issuing signed URLs. Raw object keys and durable signed URLs must not be used as durable UI state.

AI/n8n/service actors cannot approve tenant object-storage boundary readiness.
AI/n8n/service actors cannot waive tenant object-storage boundary evidence.
