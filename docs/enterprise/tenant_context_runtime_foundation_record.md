# Tenant Context Runtime Foundation Record

**Package:** Enterprise Multi-Tenant Runtime Implementation Sprint 1 — Tenant Context and Database Isolation Foundation  
**Evidence focus:** `MT-S1-003`, `MT-S1-004`, `MT-S1-005`, `MT-S1-006`, `MT-S1-007`

## 1. Runtime Controls Added

- `apps/api/src/modules/tenancy/tenant-context.ts` resolves tenant membership safely.
- `apps/api/src/middleware/tenant-context.ts` attaches `req.tenant` after authentication.
- `apps/api/src/routes/tenants.ts` exposes tenant context and isolation health without secrets.
- `apps/api/src/app.ts` allows tenant context headers and registers tenant middleware and routes.
- `apps/api/src/auth/user-context.ts` loads active tenant memberships for DB-backed JWT users.

## 2. Header Selection Rule

`x-aim-tenant-id` and `x-aim-tenant-slug` may select only tenants in the authenticated user's active membership list. Unknown or inactive tenants fail with `TENANT_ACCESS_DENIED`.

Local demo tenant headers are local-demo only and do not authorize production tenant membership.

## 3. Human Authority Boundary

AI/n8n/service actors cannot approve tenant context implementation.  
AI/n8n/service actors cannot approve tenant isolation readiness.  
AI/n8n/service actors cannot accept multi-tenant Sprint 1 evidence.

n8n remains orchestration-only. AIM remains the system of record.
