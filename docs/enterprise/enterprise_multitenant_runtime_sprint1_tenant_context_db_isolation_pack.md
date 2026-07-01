# Enterprise Multi-Tenant Runtime Implementation Sprint 1 — Tenant Context and Database Isolation Foundation Pack

**Package:** Enterprise Multi-Tenant Runtime Implementation Sprint 1 — Tenant Context and Database Isolation Foundation  
**Baseline:** After Enterprise Multi-Tenant Runtime Sprint 0 Architecture and Guardrails  
**Status:** Runtime foundation plus evidence-control package; not full commercial multi-tenant rollout

## 1. Purpose

Sprint 1 introduces the first runtime foundation for tenant context and database isolation. It adds tenant context resolution, tenant membership loading, tenant-aware request selection, an AIM-side tenant context endpoint, and a database migration for tenant records and tenant_id foundation columns.

This package remains deliberately scoped. It does not complete all tenant-scoped route filtering, does not enable self-service tenants, uses a governed boundary instead of billing/payment processing, does not automate customer onboarding, and does not approve production multi-tenant rollout.

## 2. Evidence and Runtime Foundation

| Evidence ID | Evidence area | Required artifact | Owner | Exit condition |
|---|---|---|---|---|
| MT-S1-001 | Sprint 1 baseline | Merge/tag/commit/test evidence | Lead Engineer | Sprint 0 guardrails are preserved and Sprint 1 branch is traceable |
| MT-S1-002 | Tenant schema foundation | `tenants` and `user_tenant_memberships` migration evidence | Lead Engineer / DBA | Tenant records and memberships exist with default legacy tenant compatibility |
| MT-S1-003 | Tenant context middleware | Runtime middleware evidence | Lead Engineer | Tenant context is resolved after authentication and before protected routes |
| MT-S1-004 | Tenant header selection | Header behavior test evidence | Lead Engineer / Security Owner | `x-aim-tenant-id` and `x-aim-tenant-slug` only select authenticated memberships |
| MT-S1-005 | User membership loading | DB-backed user context evidence | Lead Engineer / DBA | JWT user context includes active tenant memberships |
| MT-S1-006 | Local demo tenant boundary | Local-only demo tenant evidence | Lead Engineer | Demo tenant headers are allowed only under local demo auth |
| MT-S1-007 | Tenant route visibility | `/api/v1/tenant/context` and isolation health evidence | Lead Engineer | Current tenant can be inspected without exposing secrets or customer data |
| MT-S1-008 | Tenant_id foundation columns | Migration evidence for tenant-scoped tables | DBA | Core domain tables have nullable/seeded tenant_id columns and indexes |
| MT-S1-009 | Tenant-aware RBAC | Permission evidence for `tenant.context.read`, `tenant.read`, `tenant.manage` | Security Owner | Tenant management remains human/admin governed |
| MT-S1-010 | Tenant boundary helpers | Unit test evidence for tenant boundary validation | Lead Engineer | Cross-tenant access throws `TENANT_BOUNDARY_VIOLATION` |
| MT-S1-011 | Sprint 2 route-filter backlog | Route-filter backlog evidence | Product Owner / Lead Engineer | Remaining tenant filters are explicitly carried forward |
| MT-S1-012 | Human Sprint 1 signoff | Human approval/no-go decision | Product Owner / Security Owner / Lead Engineer | Named humans approve Sprint 1 closure or record blockers |

## 3. Human Authority Boundary

AI/n8n/service actors cannot accept multi-tenant Sprint 1 evidence.  
AI/n8n/service actors cannot approve tenant context implementation.  
AI/n8n/service actors cannot approve tenant isolation readiness.  
AI/n8n/service actors cannot approve tenant-aware database migration.  
AI/n8n/service actors cannot approve tenant-aware RBAC changes.  
AI/n8n/service actors cannot sign multi-tenant Sprint 1 closure.  
AI/n8n/service actors cannot waive multi-tenant Sprint 1 evidence.

n8n remains orchestration-only. AIM remains the system of record.

## 4. Safety Rule

Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials, tenant credentials, customer PII, real customer data, tenant data, customer commercial terms, contract redlines, invoice/payment details, tenant billing details, payment processing data, partner contract terms, confidential sales pipeline data, database connection strings with passwords, private keys, or copied API/API-ASME formulas into Sprint 1 records. This Sprint 1 package uses a governed boundary instead of full API 579, full API 581, or copied API/API-ASME formulas.

## 5. Completion Rule

Sprint 1 is complete only when `MT-S1-001` through `MT-S1-012` are attached, reviewed, and referenced from the final release evidence register, or explicitly marked not applicable with rationale and named human approval.
