# Sprint Status

| Sprint | Scope | Status |
|---:|---|---:|
| 0/1 | Foundation, monorepo, PostgreSQL baseline, RBAC, health checks | Complete |
| 2 | Tank Asset Register and Engineering Master Data | Complete |
| 2.5 | AIM/n8n Governance Hardening | Complete |
| 3 | Evidence Repository and NDT Data Room | Complete |
| 4 | Engineering Data Dictionary and Validation Engine | Complete |
| 5 | Formula Registry Module | Complete |
| 5.5 | Baseline Reproducibility and Documentation Alignment | Complete |
| 6 | Deterministic Calculation Engine | Complete |
| 6.5 | Sprint 6 Calculation Governance Hardening | Complete |
| 7 | FFS Trigger Workflow | Complete |
| 7.5 | Sprint 7 Governance and Security Hardening | Complete |
| 8 | RBI Interface and Trigger Workflow | Complete |
| 8.5 | Sprint 8 Evidence Linkage and Security Boundary Hardening | Complete |

## Boundary

AIM remains the system of record. n8n may call AIM APIs only and must not write directly to PostgreSQL. AI output remains staging-only when implemented. AI cannot approve. No API/API-ASME formula expression or copyrighted standard clause text is embedded or executed. Sprint 6 executes only universal deterministic calculations and Formula Registry metadata lookups. Sprint 7 creates FFS trigger workflow cases only; it does not execute FFS calculations or declare fitness for service. Sprint 8 creates RBI interface workflow cases only; it does not implement proprietary quantitative API RP 581 rules. Sprint 9 hardens evidence link same-asset boundaries and clarifies OpenAPI dev/internal exclusions.

## Current Implemented Routes

- Assets and engineering master data: `/api/v1/assets`, `/api/v1/materials`, `/api/v1/assets/{assetId}/geometry`, `/api/v1/assets/{assetId}/shell-courses`
- Evidence Repository: `/api/v1/evidence`, `/api/v1/evidence/{evidenceId}/links`, `/api/v1/evidence/{evidenceId}/open`
- NDT Data Room: `/api/v1/ndt/measurements`, `/api/v1/ndt/measurements/bulk-import`, review and approval endpoints
- Engineering Validation: `/api/v1/engineering/data-dictionary`, `/api/v1/engineering/validate-input`
- Formula Registry: `/api/v1/formulas`, `/api/v1/formulas/approved/{formulaId}`, version/compare/approve/deprecate/test-run endpoints
- Deterministic Calculations: `/api/v1/engineering/calculate`, `/api/v1/engineering/calculations`
- FFS Trigger Workflow: `/api/v1/ffs/cases`, `/api/v1/ffs/cases/from-calculation`, `/api/v1/ffs/cases/{caseId}/status`, `/api/v1/ffs/cases/{caseId}/close`
- RBI Interface Workflow: `/api/v1/rbi/cases`, `/api/v1/rbi/cases/from-calculation`, `/api/v1/rbi/cases/{caseId}/status`, `/api/v1/rbi/cases/{caseId}/approve`
- Operations: `/api/v1/workflow-events`, `/api/v1/error-logs`

## Reproducibility Requirement

A clean checkout must contain and apply migrations `0001` through `0009` in order. Use:

```powershell
pnpm db:migrate
pnpm db:seed
pnpm lint
pnpm typecheck
pnpm test
```


## Sprint 7 Governance and Security Hardening

Status: Complete.

- Hardened FFS evidence linkage against cross-asset evidence references.
- Preserved calculation warning source traceability into FFS case evidence snapshots.
- Aligned seed permissions with TypeScript RBAC roles through Sprint 7.
- Added local-dev authentication and production security baseline documentation.
- Improved API error handling to avoid raw internal error disclosure outside local/test environments.

No API/API-ASME formula execution, AI runtime, report generation, RBI calculation, CMMS integration, or work-order integration was implemented.


## Sprint 8 RBI Interface and Trigger Workflow

Status: Complete.

- Adds RBI interface cases and trigger rules aligned with API RP 580/581 governance.
- Supports manual engineering-review creation and calculation-warning creation.
- Preserves calculation_run, inspection_event, evidence, and placeholder input references.
- Quantitative API RP 581 calculations are not implemented or embedded.


## Sprint 9 Evidence Linkage and Security Boundary Hardening

- Generic evidence links enforce same-asset ownership for implemented asset-owned entities.
- NDT approval cannot use linked evidence from another asset.
- FFS/RBI same-asset evidence validation and from-calculation traceability are preserved.
- OpenAPI explicitly marks health and RBAC demo routes as local-dev/internal exclusions.


## Sprint 9 Engineering Review and Approval Workflow

Implemented governance workflow for engineering reviews and senior engineer approval records. Review statuses are draft, submitted_for_review, returned_for_revision, reviewed, submitted_for_approval, approved, rejected, and locked. Engineer roles may review data and calculation results; senior_engineer/admin approval is required for final approval, rejection, override approval, and locking. AI agents cannot approve, reject, override, or finalize engineering decisions. Locked calculation/review/approval records are immutable; revisions must be created as new records.

Implemented tables/fields include engineering_reviews and approval_records extensions for calculation_run_id, asset_id, checklist_json, comments_json, override_json, reason, affected_field, original_value_json, override_value_json, evidence_links, revision_no, approval_status/review_status, approver/reviewer metadata, timestamps, locked_flag, and audit trail linkage.

Implemented APIs include GET/POST /api/v1/engineering/reviews, GET/PATCH/COMMENT /api/v1/engineering/reviews/{reviewId}, GET/POST /api/v1/approval-records, POST /api/v1/approval-records/{approvalId}/approve, POST /api/v1/approval-records/{approvalId}/reject, and GET /api/v1/engineering/calculations/{runId} for full calculation audit detail.

No API/API-ASME formulas, AI extraction runtime, report generation, RBI quantitative calculation, CMMS integration, or work-order integration are implemented in this sprint. AIM remains the system of record and n8n remains API-only orchestration.


## Sprint 10 — Report Generation

Status: Complete.

Implemented report template engine, report versioning/status, DOCX/PDF output payload rendering, report generation endpoint, report UI route, evidence register, validation warning/limitation section, FFS/RBI trigger summary, and review/approval traceability.

Governance: reports generated from locked or review-ready calculation runs only; draft until approved; issued reports are locked. No API/API-ASME formula expression is embedded.


## Historical Status Note

Some sprint sections below preserve historical delivery notes from earlier increments. Statements such as “not implemented” should be read in the context of the sprint in which they were written. The current repository state is governed by the RC3-A / RC3-B alignment note and closeout addenda below.

## RC3-A / RC3-B alignment note

RC3-A and RC3-B are now implemented in this repository state. Correct health endpoints are `GET /health` and `GET /health/db`. Correct authentication endpoints are `POST /api/v1/auth/login` and `GET /api/v1/auth/me`. RBAC demo endpoints and demo CORS headers are local/development/test only when `AUTH_ALLOW_LOCAL_DEMO=true`; they are unavailable in production-like environments.

RC3-B implements evidence object-storage upload/download and report artifact object-storage export. Original evidence files and generated report artifacts are stored in private S3-compatible object storage; PostgreSQL stores metadata, checksums, object keys, upload sessions, status, and audit linkage. Legacy metadata-only evidence upload is retained only for compatibility and is not gate-eligible until object storage verification is completed through the RC3-B flow.

Final production closure remains human-gated after hypercare completion; AI and n8n cannot approve production closure or final engineering actions.


## RC3-B Closeout Polish Status

RC3-B closeout polish is complete when the repository enforces AIM-generated evidence codes for object-storage upload sessions, checksum-required gate-eligible uploads, object-verified evidence gates, and an n8n addendum confirming API-only workflow orchestration for object-storage evidence/report artifacts.


## RC3-C AI Staging Promotion Governance Status

Status: Implemented as RC3-C package candidate.

RC3-C hardens AI extraction review and staging promotion governance while preserving the source-of-truth boundary: AI output remains staging-only, n8n remains API-only orchestration, and final engineering data cannot be derived from unreviewed AI output.

Implemented RC3-C controls:

- human-only approve/correct/reject enforcement for AI-extracted fields;
- meaningful reason enforcement for corrections, rejections, low-confidence approvals, and promotion;
- verified object-storage evidence requirement for review/promotion where evidence is required;
- rejected fields and validation-rejected fields are blocked from promotion;
- low-confidence fields require correction before promotion;
- segregation-of-duty check between reviewer and promoter;
- transactional job-level promotion readiness and promotion gates;
- audit events for AI field review, manual override, promotion request, promotion block, promotion success, and promotion failure;
- n8n addendum confirming n8n may route/remind/query AIM APIs only and must not approve/correct/reject/promote.

Out of scope remains unchanged: audit log UI, admin UI, dashboard, n8n console, NDT visualization, hypercare dashboard, external CMMS integration, and new API/API-ASME formula implementation are not included.


## RC3-D Audit Log Governance Visibility

Status: Implemented as package candidate.

- Adds RBAC-controlled, read-only audit log API visibility through `GET /api/v1/audit-logs` and `GET /api/v1/audit-logs/{auditLogId}`.
- Adds frontend route `/audit-logs` with filters, pagination, and read-only detail panel.
- Adds sensitive metadata redaction for tokens, secrets, signed URLs, credentials, and private keys.
- Adds `audit_logs.view` permission alias and DB synchronization migration.
- Preserves audit log immutability: no edit/delete/purge/suppress/backdate/overwrite controls are introduced.
- Documents n8n API-only orchestration boundary for audit governance events.
- Out of scope remains admin UI, dashboard, n8n console, NDT visualization, hypercare dashboard, object-storage expansion, AI extraction expansion, and calculation expansion.
