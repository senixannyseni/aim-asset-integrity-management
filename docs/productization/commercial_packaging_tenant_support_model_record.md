# Commercial Packaging, Tenant, and Support Model Record

**Package:** Final Productization and Commercial Readiness Roadmap Pack  
**Evidence focus:** `PROD-READY-002`, `PROD-READY-003`, `PROD-READY-004`, `PROD-READY-006`, `PROD-READY-008`, `PROD-READY-011`

## 1. Commercial Package Definition

| Item | Decision / evidence | Owner | Status |
|---|---|---|---|
| Product package name | TBD | Product Owner | Pending |
| Target buyer / ICP | TBD | Commercial Owner | Pending |
| Core users | Integrity engineer, reviewer, approver, inspector, admin, operations | Product Owner | Draft |
| Included MVP modules | Asset register, evidence room, staging/review, NDT data room, deterministic calculation governance, integrity decision, report/work-order gates, production evidence governance | Product Owner / Lead Engineer | Draft |
| Excluded claims | full API 579, full API 581, 3D processing, copied API/API-ASME formulas, tenant billing, payment processing | Product Owner / Lead Engineer | Required |

## 2. Tenant and Customer Model

| Area | Required decision | Owner | Status |
|---|---|---|---|
| Tenant strategy | Single-tenant deployment, multi-tenant architecture, or managed isolated deployments | Product Owner / Lead Engineer / Security Owner | Pending |
| Data isolation | Customer/project/asset/evidence isolation requirements | Security Owner / Lead Engineer | Pending |
| Admin ownership | Customer admin, operator admin, or managed admin model | Product Owner / Operations | Pending |
| Onboarding path | Demo → pilot → production authorization → hypercare → BAU | Product Owner / Operations | Draft |
| Offboarding path | Export, archive, retention, deletion, and access revocation | Legal / Security Owner / Operations | Pending |

AI/n8n/service actors cannot approve customer onboarding readiness.
AI/n8n/service actors cannot approve pricing or licensing.

## 3. Commercial Support Model

| Support item | Planning evidence | Owner | Status |
|---|---|---|---|
| Support tier | TBD | Commercial Owner / Operations | Pending |
| SLA targets | TBD; must not exceed proven operations evidence | Operations / Product Owner | Pending |
| Escalation path | Product, engineering, security, operations | Operations | Draft |
| Incident severity model | Reuse post-go-live hypercare and BAU severity model | Operations | Draft |
| Training/support material | UAT/training evidence package and customer onboarding checklist | Operations / Product Owner | Pending |

## 4. Demo and Sales Safety Boundary

Demo and commercial materials must use synthetic or approved sanitized data only. Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials, webhook secrets, CMMS credentials, database connection strings with passwords, private keys, confidential client evidence, customer commercial terms, pricing approvals, legal opinions, raw vulnerability exploit details, or real customer data into this record.

n8n remains orchestration-only. AIM remains the system of record.
