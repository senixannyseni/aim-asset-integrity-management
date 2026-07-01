# Enterprise Multi-Tenant Runtime Sprint 1 Tenant Context and Database Isolation Runbook

**Package:** Enterprise Multi-Tenant Runtime Implementation Sprint 1 — Tenant Context and Database Isolation Foundation

## 1. Verification Commands

Run from the repository root:

```powershell
pnpm --filter @aim/api test -- enterprise-multitenant-runtime-sprint1-tenant-context-db-isolation.test.ts
pnpm -r test
pnpm -r lint
node scripts/repo-hygiene.mjs
```

## 2. Required Evidence Collection Steps

1. Confirm Sprint 0 guardrails remain present.
2. Apply and record migration `0028_enterprise_multitenant_sprint1_tenant_context.sql` in a controlled environment.
3. Capture DB evidence that `tenants` and `user_tenant_memberships` exist.
4. Capture DB evidence that core tenant_id foundation columns and indexes exist.
5. Verify local demo tenant context works only under local demo auth.
6. Verify JWT user context loads only active tenant memberships.
7. Verify unauthorized tenant header selection is rejected.
8. Verify `/api/v1/tenant/context` and `/api/v1/tenant/isolation-health` return no secrets or customer data.
9. Record Sprint 2 route-filter backlog for all tenant-scoped route queries.
10. Obtain final human Sprint 1 closure signoff.

## 3. Human Authority Boundary

AI/n8n/service actors cannot accept multi-tenant Sprint 1 evidence.  
AI/n8n/service actors cannot approve tenant context implementation.  
AI/n8n/service actors cannot approve tenant isolation readiness.  
AI/n8n/service actors cannot sign multi-tenant Sprint 1 closure.  
AI/n8n/service actors cannot waive multi-tenant Sprint 1 evidence.

n8n remains orchestration-only. AIM remains the system of record.

## 4. Evidence Safety Rule

Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials, tenant credentials, customer PII, real customer data, tenant data, customer commercial terms, contract redlines, invoice/payment details, tenant billing details, payment processing data, partner contract terms, confidential sales pipeline data, database connection strings with passwords, private keys, or copied API/API-ASME formulas into Sprint 1 records. This Sprint 1 package uses a governed boundary instead of full API 579, full API 581, or copied API/API-ASME formulas.
