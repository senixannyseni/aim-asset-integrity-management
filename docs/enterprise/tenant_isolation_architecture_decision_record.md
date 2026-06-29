# Tenant Isolation Architecture Decision Record

**Package:** Enterprise Multi-Tenant Runtime Implementation Sprint 0 — Architecture and Guardrails Pack  
**Evidence focus:** `MT-S0-002`, `MT-S0-003`, `MT-S0-006`, `MT-S0-008`, `MT-S0-009`

## 1. Architecture Decision Scope

This record documents the tenant architecture decision that must be approved before runtime multi-tenant implementation begins. The record must define:

- tenant identity source and tenant identifier format;
- tenant-scoping convention for API routes, service functions, database records, object-storage paths, audit logs, and evidence links;
- isolation expectations for tenant-owned engineering data, evidence metadata, original evidence objects, report artifacts, workflow events, error logs, and audit logs;
- forbidden cross-tenant reads/writes and escalation rules;
- explicit non-goals for Sprint 0.

## 2. Tenant Isolation Guardrails

| Guardrail | Required decision | Human owner |
|---|---|---|
| Database tenant scope | Tenant identifier introduction strategy, constraints, indexes, and query enforcement | Lead Engineer / DBA |
| API tenant scope | Route, request context, authorization, and response-envelope rules | Lead Engineer |
| Object-storage tenant scope | Tenant-aware object key/path, signed URL lifetime, checksum, and access audit rules | DevOps / Security Owner |
| Evidence linkage | Cross-tenant evidence links must be blocked | Lead Engineer |
| Audit logs | Tenant scope must be recorded without exposing secrets or object keys | Security Owner |
| Reports and exports | Report artifacts must remain tenant-scoped and evidence-linked | Lead Engineer |

## 3. Human-Only Architecture Authority

AI/n8n/service actors cannot approve tenant architecture.  
AI/n8n/service actors cannot approve tenant isolation readiness.  
AI/n8n/service actors cannot accept multi-tenant Sprint 0 evidence.  
AI/n8n/service actors cannot waive multi-tenant guardrail evidence.

n8n remains orchestration-only. AIM remains the system of record.

## 4. Approval Record

| Decision item | Status | Owner | Evidence link | Notes |
|---|---|---|---|---|
| Tenant architecture decision | Pending | Lead Engineer | TBD | TBD |
| Tenant isolation guardrail | Pending | Security Owner | TBD | TBD |
| Object-storage tenant boundary | Pending | DevOps | TBD | TBD |
| Audit/evidence continuity | Pending | Evidence Coordinator | TBD | TBD |
