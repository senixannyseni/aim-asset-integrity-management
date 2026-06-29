# Multi-Tenant Sprint 1 RBAC and Service Actor Runtime Record

**Package:** Enterprise Multi-Tenant Runtime Implementation Sprint 1 — Tenant Context and Database Isolation Foundation  
**Evidence focus:** `MT-S1-006`, `MT-S1-007`, `MT-S1-009`, `MT-S1-012`

## 1. Tenant Permissions

Sprint 1 adds the following permissions:

- `tenant.context.read` for current tenant context visibility;
- `tenant.read` for tenant records and membership summaries;
- `tenant.manage` for human/admin governed tenant and membership management.

`tenant.manage` is limited to human administrative roles. Service actors do not receive approval authority for tenant management or tenant isolation.

## 2. Service Actor Boundary

AI/n8n/service actors cannot approve tenant-aware RBAC changes.  
AI/n8n/service actors cannot approve service actor tenant scope.  
AI/n8n/service actors cannot approve tenant context implementation.  
AI/n8n/service actors cannot sign multi-tenant Sprint 1 closure.

n8n remains orchestration-only. AIM remains the system of record.

## 3. No-Go Conditions

A Sprint 1 no-go must be recorded if service actors can select unauthorized tenants, manage tenant membership, approve tenant isolation readiness, waive tenant evidence, or write directly to PostgreSQL.
