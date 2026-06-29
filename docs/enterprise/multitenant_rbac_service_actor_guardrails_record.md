# Multi-Tenant RBAC and Service Actor Guardrails Record

**Package:** Enterprise Multi-Tenant Runtime Implementation Sprint 0 — Architecture and Guardrails Pack  
**Evidence focus:** `MT-S0-004`, `MT-S0-005`, `MT-S0-009`, `MT-S0-011`

## 1. Purpose

This record defines the tenant-aware RBAC and service actor boundaries that must be approved before implementation begins. The existing AIM governance baseline must not be weakened by tenant scoping.

## 2. RBAC Guardrails

| Area | Required guardrail | Exit condition |
|---|---|---|
| Tenant membership | Every user role assignment must resolve to tenant context where tenant data is accessed | Tenant context is explicit and auditable |
| Cross-tenant admin | Any cross-tenant operator role requires separate permission and audit logging | Cross-tenant access is exceptional and controlled |
| Evidence access | Evidence, object metadata, signed URL generation, and downloads remain tenant-scoped | Cross-tenant evidence access is denied |
| AI staging | AI output remains staged and tenant-scoped until human review | AI cannot promote or approve final data |
| Calculations | Formula/version/calculation runs retain deterministic trace under tenant scope | Existing formula governance is preserved |
| Reports/work orders | Report issue and work-order closure gates remain tenant-scoped and human approved | Service actors cannot close or issue |

## 3. Service Actor Guardrails

n8n, integration services, workflow services, and system services must be least-privilege and tenant-scoped. They may trigger workflow actions through AIM APIs only where explicitly permitted.

AI/n8n/service actors cannot approve tenant-aware RBAC changes.  
AI/n8n/service actors cannot approve service actor tenant scope.  
AI/n8n/service actors cannot accept multi-tenant Sprint 0 evidence.  
AI/n8n/service actors cannot sign multi-tenant Sprint 0 closure.

n8n remains orchestration-only and must not write directly to PostgreSQL.

## 4. Denied Service Actor Actions

AI/n8n/service actors cannot approve engineering data, promote AI staging records, approve formulas, approve calculations, issue reports, close work orders, accept evidence, approve tenant architecture, approve tenant isolation readiness, approve tenant-aware RBAC changes, approve service actor tenant scope, approve migration rollout readiness, waive multi-tenant guardrail evidence, or authorize production rollout.

AIM remains the system of record.
