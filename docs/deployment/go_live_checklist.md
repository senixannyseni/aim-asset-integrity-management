# AIM Phase 2.0 Go-Live Checklist

**Purpose:** Provide a go/no-go checklist for controlled UAT or MVP release rehearsal after Phase 1 Governance Closure.  
**Scope:** Release readiness only. This checklist does not approve production go-live by itself.

## 1. Governance Readiness

| Check | Owner | Evidence Required | Status |
|---|---|---|---|
| AIM system-of-record confirmed. | Product Owner / IT Admin | Architecture note, DB/API route verification. |  |
| PostgreSQL stores final structured engineering data only through AIM backend. | IT Admin / DevOps | DB access review. |  |
| Object storage holds original evidence files; DB stores metadata/linkage only. | IT Admin | Object storage smoke test and evidence metadata sample. |  |
| n8n has no direct PostgreSQL credential. | IT Admin / Security Owner | Secret/config review. |  |
| n8n calls AIM backend APIs only. | IT Admin | n8n workflow config screenshot/export. |  |
| AI staging-only confirmed. | Lead Engineer | UAT-AI-002 result. |  |
| AI/n8n/service users blocked from approval/final actions. | Lead Engineer / IT Admin | UAT-AI-004 and UAT-N8N-003 result. |  |
| Human review gates confirmed. | Lead Engineer | UAT-REVIEW cases. |  |
| Evidence linkage gates confirmed. | Lead Engineer / Engineer | UAT-EVID and UAT-REPORT cases. |  |
| Calculation formula registry/versioning confirmed. | Lead Engineer | UAT-CALC-001 evidence. |  |
| Calculation disclaimer retained. | Lead Engineer | UAT-CALC-002 evidence. |  |
| Report issue gates confirmed. | Approver | UAT-REPORT-001/002/003 evidence. |  |
| Internal work order fallback confirmed. | Lead Engineer | UAT-WO cases. |  |
| Audit log coverage confirmed. | IT Admin / Approver | UAT-AUDIT cases. |  |

## 2. Technical Readiness

| Check | Owner | Evidence Required | Status |
|---|---|---|---|
| Source branch/tag confirmed. | Developer / DevOps | Commit SHA/tag. |  |
| Working tree clean before release package. | Developer | `git status` screenshot/output. |  |
| Dependencies installed. | Developer | `pnpm install` output. |  |
| Environment variables configured. | DevOps / IT Admin | Environment checklist, no secret values in docs. |  |
| Secrets are not committed. | Developer / Security Owner | secret scan/manual review. |  |
| Database backed up before migration/release rehearsal. | DevOps | backup file/log. |  |
| Migrations run. | DevOps | `pnpm db:migrate` output. |  |
| Seeds run if applicable. | DevOps | `pnpm db:seed` output. |  |
| API healthy. | Developer / DevOps | `/health` response. |  |
| OpenAPI route coverage test passed. | Developer | Phase 1.4/1.7 test output. |  |
| Object storage reachable. | IT Admin | signed URL/evidence smoke test. |  |
| Signed URL smoke test passed. | IT Admin | UAT-EVID-003 result. |  |
| Error log creation test passed. | IT Admin | UAT-N8N-002 or API response. |  |
| Workflow event creation test passed. | IT Admin | UAT-N8N-001 result. |  |
| Full API test suite passed. | Developer | `pnpm --filter @aim/api test` output. |  |

## 3. Security Readiness

| Check | Owner | Evidence Required | Status |
|---|---|---|---|
| JWT/session auth working. | IT Admin / Developer | UAT-AUTH-001/002/003. |  |
| RBAC verified. | IT Admin | UAT-AUTH-005 and permission matrix. |  |
| Demo/local auth disabled outside test/local/development. | Security Owner / IT Admin | UAT-AUTH-006. |  |
| Service users restricted. | IT Admin | ai_agent/n8n_service permission review. |  |
| AI/n8n users blocked from approval/issue/final actions. | Lead Engineer / IT Admin | UAT-AI-004, UAT-N8N-003. |  |
| Audit logs immutable/read-only via public APIs. | IT Admin / Security Owner | UAT-AUDIT-001. |  |
| Evidence download permission enforced. | IT Admin | UAT-EVID-003, unauthorized evidence access test. |  |
| Error responses do not expose secrets/stack traces. | Security Owner | negative API test evidence. |  |
| Passwords/secrets never logged. | Security Owner | log review. |  |

## 4. UAT Readiness

| Check | Owner | Evidence Required | Status |
|---|---|---|---|
| UAT scripts approved. | UAT Lead / Product Owner | Approved `docs/uat/uat_scripts.md`. |  |
| UAT traceability matrix approved. | UAT Lead / Lead Engineer | Approved `docs/uat/uat_traceability_matrix.md`. |  |
| UAT sample data prepared. | UAT Lead / Developer | `docs/sample_data/sample_dataset_manifest.md`. |  |
| UAT roles assigned. | IT Admin | user/role seed or admin record. |  |
| UAT evidence placeholders prepared. | UAT Lead / Inspector | synthetic evidence list. |  |
| UAT pass/fail template available. | UAT Lead | script format with pass/fail fields. |  |
| Defect triage owner assigned. | Product Owner | triage roster. |  |
| Critical UAT cases executed. | UAT Lead | completed UAT evidence. |  |
| Open defects categorized by severity. | Product Owner | defect log. |  |

## 5. Operational Readiness

| Check | Owner | Evidence Required | Status |
|---|---|---|---|
| Deployment runbook approved. | DevOps / IT Admin | Approved runbook. |  |
| Migration plan approved. | DevOps / DBA / IT Admin | Approved migration plan. |  |
| Rollback plan approved. | DevOps / Product Owner | rollback rehearsal or documented approval. |  |
| Error escalation path approved. | IT Admin / Lead Engineer | SLA/escalation path. |  |
| Training pack distributed. | Product Owner / UAT Lead | training attendance or acknowledgement. |  |
| Support owner identified. | Product Owner | support roster. |  |
| Go/no-go meeting scheduled. | Product Owner | meeting record. |  |
| Release/hypercare window defined. | Product Owner / IT Admin | schedule. |  |
| Backup/restore owner assigned. | DevOps | owner and contact. |  |

## 6. Sign-Off Roles

| Role | Name | Decision | Date | Signature / Evidence |
|---|---|---|---|---|
| Product Owner |  | Go / No-Go |  |  |
| Lead Engineer |  | Go / No-Go |  |  |
| Approver |  | Go / No-Go |  |  |
| IT Admin / DevOps |  | Go / No-Go |  |  |
| Security Owner, if applicable |  | Go / No-Go |  |  |
| UAT Lead |  | Go / No-Go |  |  |

## 7. Go / No-Go Rule

The release must be **No-Go** if any of the following is true:

- n8n has direct PostgreSQL credentials.
- AI output can be promoted without human review.
- AI/n8n/service user can approve, issue, close, or finalize controlled engineering actions.
- Evidence linkage gates can be bypassed.
- Calculation can run or be approved without explicit approved formula version where required.
- Report can be issued with failed gates.
- Internal work order can close without required completion note/evidence.
- Audit logs are missing for controlled actions.
- Full API 579/API 581, external CMMS integration, 3D processing, frontend UI implementation, or invented API/ASME formulas were accidentally introduced.
- Critical UAT defects remain unresolved without formal risk acceptance.


## RC3-A / RC3-B alignment note

RC3-A and RC3-B are now implemented in this repository state. Correct health endpoints are `GET /health` and `GET /health/db`. Correct authentication endpoints are `POST /api/v1/auth/login` and `GET /api/v1/auth/me`. RBAC demo endpoints and demo CORS headers are local/development/test only when `AUTH_ALLOW_LOCAL_DEMO=true`; they are unavailable in production-like environments.

RC3-B implements evidence object-storage upload/download and report artifact object-storage export. Original evidence files and generated report artifacts are stored in private S3-compatible object storage; PostgreSQL stores metadata, checksums, object keys, upload sessions, status, and audit linkage. Legacy metadata-only evidence upload is retained only for compatibility and is not gate-eligible until object storage verification is completed through the RC3-B flow.

Final production closure remains human-gated after hypercare completion; AI and n8n cannot approve production closure or final engineering actions.
