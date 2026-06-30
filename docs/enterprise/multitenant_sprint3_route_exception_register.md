# Multi-Tenant Sprint 3 Route Exception Register

## Purpose

This register records route families that are not classified as ordinary `tenant_scoped` engineering-data routes. Exceptions are explicit and reviewable; they are not blanket permission to expose customer data.

| Exception ID | Route classification | Route examples | Boundary rationale | Approval status |
|---|---|---|---|---|
| MT-S3-EXC-001 | `auth_context` | `apps/api/src/routes/auth.ts` | Authentication/session routes resolve the user first; tenant selection is derived from membership after auth. | Human review required before production certification |
| MT-S3-EXC-002 | `public_health` | `apps/api/src/routes/health.ts` | Health/readiness routes must return no tenant engineering data. | Human review required before production certification |
| MT-S3-EXC-003 | `local_demo_only` | `apps/api/src/routes/rbac-demo.ts` | Local/test demo route only; not production customer route. | Human review required before production certification |
| MT-S3-EXC-004 | `tenant_control_plane` | `apps/api/src/routes/tenants.ts` | Tenant context/health route must return only selected tenant and membership metadata. | Human review required before production certification |
| MT-S3-EXC-005 | `global_system` | admin, security, operations, production validation, go-live, release closure routes | System control-plane routes require explicit permissions and human approval before tenant-impacting actions. | Human review required before production certification |

AI/n8n/service actors cannot approve tenant route exceptions. AI/n8n/service actors cannot sign multi-tenant Sprint 3 closure. n8n remains orchestration-only. AIM remains the system of record.


## Evidence Handling Restrictions

Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials, tenant credentials, customer PII, real customer data, tenant data, customer commercial terms, tenant billing details, payment processing data, full API 579, full API 581, or copied API/API-ASME formulas into commits, tests, logs, screenshots, pull requests, or ChatGPT/Codex prompts.
