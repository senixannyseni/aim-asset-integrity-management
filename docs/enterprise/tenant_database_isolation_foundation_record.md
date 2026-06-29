# Tenant Database Isolation Foundation Record

**Package:** Enterprise Multi-Tenant Runtime Implementation Sprint 1 — Tenant Context and Database Isolation Foundation  
**Evidence focus:** `MT-S1-002`, `MT-S1-008`, `MT-S1-010`, `MT-S1-011`

## 1. Database Foundation

Migration `0028_enterprise_multitenant_sprint1_tenant_context.sql` adds:

- `tenants`;
- `user_tenant_memberships`;
- default legacy tenant seed;
- default user membership seed;
- `tenant_id` foundation columns and indexes on core domain tables;
- tenant RBAC permission synchronization.

## 2. Tenant-Scoped Tables

Sprint 1 creates tenant_id foundation columns for assets, inspection events, evidence files, NDT measurements, findings, calculation runs, engineering reviews, approval records, integrity decisions, reports, internal work orders, audit logs, workflow events, and error logs.

Sprint 1 does not claim every route is fully tenant-filtered. Sprint 2 must apply tenant filters to route queries and mutation paths before production multi-tenant rollout.

## 3. Boundary Helpers

`assertTenantBoundary` rejects missing tenant IDs and cross-tenant IDs. `tenantScopedWhereClause` provides a consistent query-filter marker for route implementation.

## 4. Human Authority Boundary

AI/n8n/service actors cannot approve tenant-aware database migration.  
AI/n8n/service actors cannot approve migration rollout readiness.  
AI/n8n/service actors cannot waive multi-tenant Sprint 1 evidence.

n8n remains orchestration-only. AIM remains the system of record.
