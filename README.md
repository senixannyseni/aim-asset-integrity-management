# AIM+n8n Tank Integrity Module

Sprint status: **RC3-A through RC3-J implemented as scoped hardening packages; RC4-A through RC4-W implemented and post-review closed; RC4-X Final Release Decision Pack Cleanup complete; RC4-Y Final Release Operations Evidence Collection prepared; RC4-Z Final Go/No-Go Signoff Preparation prepared; AIM MVP Final Go/No-Go Evidence Bundle prepared as the archive-ready evidence/signoff assembly layer. Current state is MVP release-candidate complete, with final production go-live still conditional on completed evidence bundle, archive location, and named human go/no-go signoff.**

This repository implements the AIM+n8n Tank Integrity Module MVP through RC3-J final UAT / release candidate closure and production operations readiness governance: Tank Asset Register, governance hardening, Evidence Repository, AI extraction/staging, NDT Data Room, Engineering Validation Engine, controlled Formula Registry metadata/versioning, approved Formula Registry to formula_versions synchronization, guided universal deterministic calculation execution, FFS trigger workflow governance, RBI interface trigger governance, report generation/issue gates, integrity decision approval, and internal AIM work order fallback. It does **not** implement API/API-ASME formula expressions, full API 579/API 581 assessment, 3D processing, or external CMMS integration.

RC4-A adds Sprint 0 foundation polish only: dedicated health endpoint tests, Sprint 0 closure checklist documentation, historical clarification that Sprint 0 had no calculation runtime at that time, role evolution notes, and seed idempotency documentation. RC4-A does not change runtime engineering calculation behavior, does not add formulas, and does not change AI, n8n, approval, report, FFS, RBI, NDT, evidence, object-storage, or frontend behavior.

RC4-B completes the user-facing Tank Asset Register frontend. The `/assets` and `/assets/[assetId]` routes now expose asset list/create, asset detail/edit, tank geometry input, shell-course table editing, material master selection, validation messages, related links, loading/empty/error/permission-denied states, and manual UAT documentation. RC4-B uses existing backend APIs only, introduces no new formulas, no calculation behavior, no AI/n8n behavior changes, no approval/report/FFS/RBI/NDT/evidence behavior changes, and no backend schema changes.

## RC4-Y Final Release Operations Evidence Collection

Status: Documentation/evidence-control closure package.

RC4-Y adds the final operations evidence collection layer for release decisioning. It provides a single runbook, evidence collection matrix, and cutover/rollback evidence record for attaching proof of test/lint, repository hygiene, migration/seed validation, environment validation, backup/restore, security scan, monitoring/alert routing, UAT signoff, final go/no-go, and hypercare ownership. RC4-Y does not add runtime APIs, database migrations, formulas, AI behavior, n8n behavior, object-storage behavior, report issue behavior, approval behavior, work-order behavior, or external CMMS integration.

Production go-live remains conditional until every required RC4-Y evidence item is attached or formally marked not applicable with owner approval. AI/n8n/service actors cannot approve the final release decision or substitute for human signoff.


## RC4-Z Final Go/No-Go Signoff Preparation

Status: Documentation/evidence-control closure package.

RC4-Z adds the final human signoff preparation layer for production go/no-go decisioning. It provides a signoff packet, final go/no-go meeting minutes template, and final go-live authorization record that tie RC4-Y operations evidence and the final release evidence register into named human approvals. RC4-Z does not add runtime APIs, database migrations, formulas, AI behavior, n8n behavior, object-storage behavior, report issue behavior, approval behavior, work-order behavior, or external CMMS integration.

Production go-live remains conditional until the RC4-Z signoff packet and authorization record are completed by named humans. AI/n8n/service actors cannot sign final authorization, accept evidence, approve go-live, or replace human signoff.


## AIM MVP Final Go/No-Go Evidence Bundle

Status: Documentation/evidence-control closure package after RC4-Z.

The final evidence bundle assembles RC4-X decision records, RC4-Y operations evidence, and RC4-Z human signoff artifacts into an archive-ready release package. It records the release tag, commit SHA, evidence bundle location, decision date, decision owner, evidence coordinator, and final decision status.

The final evidence bundle does not add runtime APIs, database migrations, formulas, AI behavior, n8n behavior, object-storage behavior, report issue behavior, approval behavior, work-order behavior, or external CMMS integration.

Production go-live remains conditional until the evidence bundle is completed, archived, and approved by named humans. AI/n8n/service actors cannot approve the final evidence bundle, waive missing evidence, sign authorization, or replace human signoff.

## Non-negotiable Architecture Boundary

- AIM is the system of record.
- PostgreSQL stores final structured engineering data, metadata, validation snapshots, audit logs, workflow events, and error logs.
- Object storage stores original evidence files and generated report export artifacts; PostgreSQL stores metadata, checksums, object keys, upload sessions, linkage, and audit history.
- n8n is orchestration only and must call AIM backend APIs.
- n8n must not write directly to PostgreSQL.
- AI extraction output must go to extraction/staging tables only and must remain non-final until human review and controlled promotion.
- AI must not approve engineering data, calculations, integrity decisions, formulas, issued reports, or work orders.
- A universal deterministic calculation engine is implemented for AIM-owned calculations only.
- API/API-ASME formula expressions must not be invented, copied, hard-coded, or reproduced. API-controlled formulas and quantitative API RP 581 rules remain controlled placeholders unless entered by authorized engineers from licensed standards or approved fixtures.

## Implemented Modules

### Foundation / Sprint 0-1

- Monorepo structure: `apps/api`, `apps/web`, `packages/shared-types`, `packages/config`, `db/migrations`, `db/seeds`, `docs`.
- PostgreSQL baseline schema.
- Original Sprint 0 RBAC roles: `admin`, `data_entry`, `inspector`, `engineer`, `senior_engineer`, `qa_qc`, `client_viewer`, `ai_agent`.
- Later persisted governance roles now present: `lead_engineer`, `approver`, `management`, `it_admin`. Service-actor identifiers such as `n8n_service`, `integration_service`, `workflow_service`, and `system_service` are referenced where present by governance blockers/UAT controls; RC4-A does not add roles or permissions.
- Health endpoints: `GET /health`, `GET /health/db`.
- Idempotent seed data and CI-ready test commands.
- RC4-A adds dedicated health endpoint test coverage and `docs/release/sprint0_foundation_closure_checklist.md`.
- Historical note: Sprint 0's “No engineering calculation is implemented yet” criterion was true at Sprint 0 and is now historical. Later sprints intentionally added governed deterministic calculation modules; this is not a current defect.

### Sprint 2 — Tank Asset Register and Engineering Master Data

- Asset CRUD APIs and completed RC4-B frontend UI at `/assets` and `/assets/[assetId]`.
- Asset list/create page with search/filter, operating status, inspection due date, and safe related links.
- Asset detail/edit page with tank geometry form, shell-course table editor, material master selector, related links, and audit-log link.
- Frontend field validation for tank tag, asset name, code edition, construction year, inspection due date, diameter, shell height, shell-course material, joint efficiency, and numeric/unit fields.
- Unit-normalized backend validation for geometry and thickness inputs remains authoritative.
- Audit logging for create/update/delete master-data actions.

### Sprint 2.5 — AIM/n8n Governance Hardening

- `workflow_events` and `error_logs` baseline tables/APIs.
- OpenAPI alignment for implemented `/api/v1` routes.
- Centralized local demo RBAC API client helper.
- Governance tests for RBAC/audit/OpenAPI alignment.

### Sprint 3 — Evidence Repository and NDT Data Room

- Evidence metadata registration and object-storage path convention.
- Evidence links to asset, inspection, NDT measurement, calculation run, finding, FFS case, or RBI case.
- NDT measurement API/UI with manual entry and bulk import.
- NDT review vs approval separation.
- Critical NDT approval blocks when direct or linked evidence is missing.

### Sprint 4 — Engineering Data Dictionary and Validation Engine

- `engineering_data_dictionary` and `validation_runs`.
- Deterministic validation service with severity: `info`, `warning`, `blocking`.
- Validation UI at `/validation` grouped by asset, geometry, shell course, material, NDT, evidence, formula, and approval.
- Validation snapshots persisted without running calculations.

### Sprint 5 — Formula Registry Module

- Controlled Formula Registry CRUD/versioning/approval/deprecation/test-run placeholder.
- Formula metadata fields include `formula_expression_source`, `formula_id`, `formula_name`, code basis/edition/clause reference, formula type, expression type/body, schemas, unit rules, validation rules, blocking rules, version/status/approval/lock fields.
- Editing an approved/locked formula creates a new draft version.
- Only `admin` and `senior_engineer` may create/update/approve/deprecate/test formula records.
- Formula test-run endpoint is a placeholder and does not execute formula expressions.


### Sprint 6 — Deterministic Calculation Engine

- Universal deterministic calculation engine for unit conversion, corrosion rate screening, remaining life screening, warning thresholds, and inspection interval placeholder logic.
- Calculation runs store input snapshot hash, formula version trace, validation status, normalized inputs, outputs, warnings, and audit log.
- API/API-ASME formula execution remains blocked unless future approved Formula Registry execution rules are provided.

### Sprint 7 — FFS Trigger Workflow

- API 579-1/ASME FFS-1 trigger workflow governance cases.
- Trigger only; no fitness-for-service declaration or API 579 calculation is implemented.
- AI agents cannot close FFS cases, and final disposition requires senior engineer/admin approval.

### Sprint 8 — RBI Interface and Trigger Workflow

- API RP 580/581 governance-aligned RBI interface cases.
- Qualitative/semi-quantitative placeholder only unless quantitative rules are formally provided in Formula Registry.
- RBI cases can be created manually or from deterministic calculation warnings such as high corrosion rate, short remaining life, repeated anomalies, or engineering review.
- Risk summary and inspection plan recommendation are auditable and clearly labeled by calculation basis.

### Sprint 9 — Evidence Linkage and Security Boundary Hardening

- Generic `evidence_links` creation validates same-asset ownership for asset, inspection event, NDT measurement, calculation run, FFS case, and RBI case links.
- Cross-asset evidence links are rejected with `CROSS_ASSET_EVIDENCE_LINK_BLOCKED`.
- NDT critical approval cannot rely on linked evidence from another asset.
- OpenAPI explicitly marks health and RBAC demo routes as local-dev/internal and outside the production engineering API contract.
- Security baseline remains explicit: demo-header auth is local-dev only; production requires JWT/session identity, DB-backed RBAC, signed object-storage URLs, and malware scanning.

## Local Setup

```powershell
pnpm install
cp .env.example .env
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Backend default: `http://localhost:4000`
Frontend default: `http://localhost:3000`

## Reproducible Database Setup

A clean checkout must include migrations:

```txt
db/migrations/0001_baseline.sql
db/migrations/0002_tank_asset_master_data.sql
db/migrations/0003_governance_hardening.sql
db/migrations/0004_evidence_ndt_data_room.sql
db/migrations/0005_engineering_validation_engine.sql
db/migrations/0006_formula_registry_module.sql
db/migrations/0007_deterministic_calculation_engine.sql
db/migrations/0008_ffs_trigger_workflow.sql
db/migrations/0009_rbi_interface_trigger_workflow.sql
```

Run from an empty PostgreSQL database:

```powershell
pnpm db:migrate
pnpm db:seed
```

Seed scripts are idempotent and can be re-run safely for core controlled records. Some harmless audit seed entries, such as `FOUNDATION_SEED_EXECUTED`, may append on repeated seed execution by design to preserve seed-run traceability. RC4-A documents this behavior and does not remove audit trail semantics.

## Frontend Routes

- `/` landing page
- `/login`
- `/assets`
- `/assets/[assetId]`
- `/evidence`
- `/ndt`
- `/validation`
- `/formulas`
- `/formulas/[formulaId]`
- `/calculations`
- `/ffs`
- `/rbi`

## Key API Routes

- `GET /health`
- `GET /health/db`
- `GET/POST /api/v1/assets`
- `GET /api/v1/materials`
- `GET/POST /api/v1/evidence`
- `POST /api/v1/evidence/{evidenceId}/links`
- `GET /api/v1/evidence/{evidenceId}/open`
- `GET/POST /api/v1/ndt/measurements`
- `POST /api/v1/ndt/measurements/bulk-import`
- `POST /api/v1/engineering/validate-input`
- `GET /api/v1/engineering/data-dictionary`
- Formula Registry endpoints under `/api/v1/formulas`
- `POST /api/v1/engineering/calculate`
- `GET /api/v1/engineering/calculations`
- `GET/POST /api/v1/ffs/cases`
- `POST /api/v1/ffs/cases/from-calculation`
- `PATCH /api/v1/ffs/cases/{caseId}/status`
- `POST /api/v1/ffs/cases/{caseId}/close`
- `POST /api/v1/workflow-events`
- `GET/POST /api/v1/error-logs`

## Demo RBAC Headers for Local Development

Protected local development routes use demo headers:

```txt
x-aim-demo-roles: admin
x-aim-demo-email: admin@aim.local
```

Demo RBAC headers are local/development/test only and are gated by `AUTH_ALLOW_LOCAL_DEMO=true`. They are not mounted or CORS-allowed in production-like environments. Use JWT login at `POST /api/v1/auth/login` and authenticated user lookup at `GET /api/v1/auth/me` for UAT/prod-like validation.

## Useful Commands

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm db:migrate
pnpm db:seed
pnpm dev:api
pnpm dev:web
```

## Current Limitations

- Universal deterministic calculation execution is implemented for AIM-owned unit conversion, corrosion-rate, remaining-life screening, comparator, warning, and placeholder interval logic.
- No API/API-ASME formula expression is embedded or executed.
- Evidence binary upload/signed object-storage URL flow is implemented in RC3-B through AIM-controlled upload sessions, checksum verification, object-existence checks, RBAC-controlled signed URLs, and audit logging. Production deployment still requires environment-specific S3-compatible object-storage credentials, malware scanning integration, retention policy, and operational monitoring.
- AI extraction/staging workflow is implemented within AIM API governance boundaries and remains staging-only until human review.
- Report generation, report issue gates, integrity decision approval, and internal AIM work-order fallback are implemented.
- External CMMS/SAP/Maximo integration remains out of MVP scope.
- Authentication uses DB-backed JWT/RBAC for the MVP; local demo-header fallback remains local/test-only.


### Sprint 6 — Deterministic Calculation Engine

Implemented `/api/v1/engineering/calculate` and `/api/v1/engineering/calculations` for universal deterministic calculations only. The calculation engine starts with input snapshot and validation result, blocks on blocking validation severity, stores calculation run/input/output records, and generates warning candidates for thickness, corrosion rate, remaining life, missing evidence, FFS trigger, and RBI trigger review. API/API-ASME formula expressions remain controlled by Formula Registry metadata and are not hard-coded.

### Sprint 6 Governance Hardening

- Asset detail route is protected by `asset.read` RBAC.
- Deterministic calculation execution is restricted to approved/locked `universal_deterministic` Formula Registry records.
- API-controlled formulas remain metadata-only and are blocked from deterministic execution.
- Calculation input rows preserve NDT `source_entity_id` and `evidence_file_id` where available.
- OpenAPI documents implemented asset geometry and shell-course read endpoints.


### Sprint 7 — FFS Trigger Workflow

Implemented API 579-1/ASME FFS-1-aligned trigger workflow governance. FFS cases can be created manually from findings or from deterministic calculation warnings. The workflow records trigger reason, supporting measurements, evidence links, required next action, assignment, status, and final disposition approval.

Important boundary: FFS trigger cases do **not** declare fitness for service. Final FFS disposition requires senior engineer/admin approval and writes an approval record and audit log. AI agents cannot close FFS cases.

Implemented route/UI scope:

- `/ffs` frontend workflow page.
- `GET /api/v1/ffs/cases`.
- `POST /api/v1/ffs/cases`.
- `POST /api/v1/ffs/cases/from-calculation`.
- `PATCH /api/v1/ffs/cases/{caseId}/status`.
- `POST /api/v1/ffs/cases/{caseId}/close`.

Workflow statuses: `open`, `under_review`, `data_required`, `assessment_in_progress`, `accepted`, `repair_required`, `monitor`, `closed`.


## Sprint 7 Governance and Security Hardening

This historical Sprint 7 section predates later Phase 1/2 work. The current MVP still does not implement API/API-ASME formulas, full RBI calculation, external CMMS integration, or 3D processing; later phases add AI extraction/staging, report generation/issue gates, and internal AIM work order fallback.

Key hardening items:

- FFS evidence links are validated against the same `asset_id` as the FFS case.
- FFS cases created from calculation warnings preserve `source_calculation_run_id`, `source_entity_id`, and `evidence_file_id` in supporting evidence snapshots.
- DB seed permissions are aligned to the in-code RBAC map through Sprint 7.
- `ai_agent` remains prohibited from engineering approval/finalization actions.
- Demo header authentication is explicitly local-development only. See `docs/security-baseline.md`.
- Production error responses avoid raw internal error messages.

AIM remains the system of record and n8n remains API-only orchestration.


## Sprint 8 RBI Interface Governance

Status: Complete.

- Adds API RP 580/581-aligned RBI interface cases and trigger rules.
- Supports manual engineering-review creation and calculation-warning creation.
- Preserves source calculation run, source measurement, evidence, and placeholder inputs.
- Uses qualitative/semi-quantitative placeholder basis only. No proprietary quantitative API RP 581 logic is implemented.


## Sprint 9 Evidence Linkage and Security Boundary Hardening

- AIM remains the system of record for evidence metadata and evidence links.
- n8n remains API-only orchestration and must not create evidence links by direct database writes.
- Evidence links to asset-owned entities must be same-asset links.
- Critical NDT approval cannot pass based on cross-asset linked evidence.
- FFS/RBI evidence snapshots and from-calculation traceability are preserved.
- Health and RBAC demo routes are local-dev/internal and intentionally excluded from the production OpenAPI engineering workflow contract.


## Sprint 9 Engineering Review and Approval Workflow

Implemented governance workflow for engineering reviews and senior engineer approval records. Review statuses are draft, submitted_for_review, returned_for_revision, reviewed, submitted_for_approval, approved, rejected, and locked. Engineer roles may review data and calculation results; senior_engineer/admin approval is required for final approval, rejection, override approval, and locking. AI agents cannot approve, reject, override, or finalize engineering decisions. Locked calculation/review/approval records are immutable; revisions must be created as new records.

Implemented tables/fields include engineering_reviews and approval_records extensions for calculation_run_id, asset_id, checklist_json, comments_json, override_json, reason, affected_field, original_value_json, override_value_json, evidence_links, revision_no, approval_status/review_status, approver/reviewer metadata, timestamps, locked_flag, and audit trail linkage.

Implemented APIs include GET/POST /api/v1/engineering/reviews, GET/PATCH/COMMENT /api/v1/engineering/reviews/{reviewId}, GET/POST /api/v1/approval-records, POST /api/v1/approval-records/{approvalId}/approve, POST /api/v1/approval-records/{approvalId}/reject, and GET /api/v1/engineering/calculations/{runId} for full calculation audit detail.

This historical Sprint 9 section predates later report/work-order features. No API/API-ASME formulas, full RBI quantitative calculation, external CMMS integration, or 3D processing are implemented. Later phases add AI extraction/staging, report generation/issue gates, integrity decisions, and internal AIM work order fallback while AIM remains the system of record and n8n remains API-only orchestration.


## Sprint 10 Report Generation Complete

Implemented Tank Integrity report generation with DOCX/PDF output payloads, report versioning, draft/approved/issued status governance, Formula Registry traceability, calculation run traceability, evidence register, FFS/RBI trigger summary, validation warnings, and review/approval record integration.

New route:
- /reports

New API endpoints:
- GET /api/v1/reports
- GET /api/v1/reports/{reportId}
- POST /api/v1/reports/generate
- POST /api/v1/reports/{reportId}/approve
- POST /api/v1/reports/{reportId}/issue

Boundary: no API/API-ASME formula expression is embedded or invented; reports cite Formula Registry metadata and calculation traceability only. Draft reports remain clearly marked draft until approved.


## Controlled UAT Cycle 1 Release Hardening

UAT Cycle 1 passed with local fixes on branch `phase2-3-uat-signoff`. Release hardening adds direct evidence gating before integrity decision approval, per-entity evidence gates before final report issue, controlled NDT `extraction_source` validation, safe calculation run lookup by UUID or run code, and resolution of stale report issue gate-blocked logs after successful report issue.

Current hard boundaries remain: AIM is the system of record; AI output remains staging-only until human review; AI/n8n/service users cannot approve or issue final engineering outputs; n8n is orchestration-only; external CMMS remains out of MVP scope; internal AIM work orders remain the fallback.

## Phase 2.5 / RC2 Runtime and Frontend UAT Closure

The RC2 branch adds product-facing UAT closure items:

- JWT login is available at `/login`; frontend API calls use `Authorization: Bearer <token>` from `data.accessToken`.
- Demo headers are disabled by default and are only sent when `NEXT_PUBLIC_AIM_DEMO_HEADERS_ENABLED=true`.
- Integrity decision workflow is available at `/integrity-decisions` and requires direct evidence before approval.
- Report UI shows per-entity evidence actions for `report`, `calculation_run`, and `integrity_decision` before final issue.
- Internal AIM work order fallback is available at `/work-orders`; External CMMS remains out of MVP scope.
- FFS/RBI calculation-run lookup is UUID/text-aware and must not expose PostgreSQL UUID/text operator errors.

AIM remains the system of record. AI must not approve final engineering actions. n8n remains orchestration-only and must not write final engineering data directly to PostgreSQL.


## Sprint 2.6 / RC3-A Hardening

RC3-A is completed and covers repository hygiene, configuration alignment, frontend root-route handling, and production-safe demo route gating. Correct runtime endpoints for RC2/RC3 are:

- API health: `GET /health` and `GET /health/db`.
- JWT login: `POST /api/v1/auth/login`.
- Authenticated user: `GET /api/v1/auth/me`.
- RBAC demo routes: local/development/test only when `AUTH_ALLOW_LOCAL_DEMO=true`; unavailable in production-like environments.

The controlled deployment/hypercare evidence generated against `127.0.0.1:5433/aim_tank_integrity` is a confirmed local deployment database. Treat it as controlled production-like evidence unless that database is explicitly the production target. Final real-production closure remains human-gated and pending hypercare completion.

RC3-B is completed after RC3-A and implements evidence object-storage upload/download plus report artifact object-storage export. AI staging-to-final promotion remains out of scope for this package and must be handled in a later RC3 package.

## RC3-B Evidence and Report Object Storage

RC3-B implements the source-of-truth storage boundary for original evidence files and generated report artifacts:
For RC3-B, object storage stores original evidence files and generated report export artifacts, while PostgreSQL stores metadata, checksums, object keys, status, and audit linkage.

- Object storage stores original evidence files and generated report export artifacts.
- PostgreSQL stores metadata, hashes, object keys, upload sessions, report export metadata, and audit logs.
- Evidence metadata cannot be finalized until object storage existence and declared size are verified.
- Evidence download URLs and report export download URLs are RBAC-controlled and audit-logged.
- Signed URL query strings are redacted from audit metadata.
- AI/n8n/service users cannot create final evidence or report export artifacts.
- Legacy `POST /api/v1/evidence/upload` is retained only for metadata compatibility; it marks evidence as pending object verification and must not satisfy report/evidence gates until the RC3-B upload-url/complete-upload flow verifies object storage.

New RC3-B endpoints:

```text
POST /api/v1/evidence/upload-url
POST /api/v1/evidence/complete-upload
GET  /api/v1/evidence/{evidenceId}/download-url
GET  /api/v1/evidence/{evidenceId}/download
POST /api/v1/reports/{reportId}/exports
GET  /api/v1/reports/{reportId}/exports
GET  /api/v1/report-exports/{exportId}/download-url
```

Runbook references:

```text
docs/deployment/object_storage_evidence_runbook.md
docs/deployment/report_export_storage_runbook.md
docs/uat/uat_rc3_object_storage_scripts.md
```


## RC3-B Closeout Polish

The RC3-B closeout polish tightens source-of-truth alignment before RC3-C begins:

- AIM backend generates evidence codes for gate-eligible object-storage upload sessions; callers must not provide controlled evidence IDs.
- `checksum_sha256` is mandatory before AIM issues a gate-eligible evidence upload URL.
- Evidence completion verifies object existence, size, and checksum controls before setting `upload_status = verified`.
- Report issue/export evidence gates count only verified object-storage evidence; legacy/null upload status is not treated as verified.
- Legacy metadata-only evidence upload remains compatibility-only and cannot satisfy evidence/report gates until object verification is completed.
- RC3-B n8n workflow behavior is documented as API-only orchestration for intake notifications, review reminders, and failure handling.


## RC3-C AI Staging Promotion Governance

RC3-C hardens the AI extraction review and staging promotion boundary. AI extraction output remains in `extraction_jobs`, `extraction_fields`, and `staging_records` until a permitted human engineering actor approves, corrects, or rejects each field and promotion gates pass.

RC3-C adds/updates:

- explicit human-only review controls for approve/correct/reject;
- meaningful reason enforcement for corrections, rejections, low-confidence approvals, and promotion;
- verified object-storage evidence linkage before review/promotion where evidence is required;
- segregation-of-duty checks between reviewer and promoter;
- transactional promotion readiness and job-level promotion gates;
- audit events `AI_FIELD_APPROVED`, `AI_FIELD_CORRECTED`, `AI_FIELD_REJECTED`, `AI_FIELD_OVERRIDE_RECORDED`, `AI_STAGING_PROMOTION_REQUESTED`, `AI_STAGING_PROMOTION_BLOCKED`, `AI_STAGING_PROMOTED`, and `AI_STAGING_PROMOTION_FAILED`;
- n8n API-only routing/reminder boundaries for staging review.

RC3-C does not add dashboard, audit-log UI, admin UI, n8n console, NDT visualization, hypercare dashboard, external CMMS integration, or new API/API-ASME formulas.


## RC3-D Audit Log Governance Visibility Status

Status: Implemented as RC3-D package candidate.

RC3-D adds read-only audit log governance visibility while preserving audit immutability. Audit log API/UI access is RBAC-controlled through `audit_logs.view`, sensitive metadata is redacted before display, and broad audit visibility is blocked for AI/service/n8n-style actors.

Implemented RC3-D controls:

- `GET /api/v1/audit-logs` with event, entity, actor, timestamp, safe-search, pagination, and created_at-desc ordering;
- `GET /api/v1/audit-logs/{auditLogId}` for read-only detail view;
- frontend route `/audit-logs` with list, filters, pagination, detail panel, and traceability labels/links where existing AIM routes support them;
- redaction of tokens, secrets, passwords, authorization headers, cookies, signed URLs, presigned URLs, credentials, access keys, secret keys, and private keys;
- no audit edit, delete, purge, suppress, backdate, overwrite, approve, reject, promote, issue, or other mutation controls;
- n8n addendum confirming n8n may create orchestration events through AIM APIs only and must not mutate audit logs or write directly to PostgreSQL.

Out of scope remains unchanged: admin UI, dashboard, n8n console, NDT visualization, hypercare dashboard, external CMMS integration, new object-storage features, new AI extraction/staging-promotion features, and new API/API-ASME formula implementation are not included.

## RC3-E Admin Governance Console

RC3-E adds RBAC-controlled admin governance visibility and safe admin controls. The frontend route `/admin-governance` shows users, roles, permissions, role-permission mappings, user-role assignments, and redacted system settings.

Implemented API endpoints:

```text
GET    /api/v1/admin-governance/users
GET    /api/v1/admin-governance/roles
GET    /api/v1/admin-governance/permissions
GET    /api/v1/admin-governance/role-permissions
GET    /api/v1/admin-governance/user-roles
POST   /api/v1/admin-governance/user-roles
DELETE /api/v1/admin-governance/user-roles
GET    /api/v1/admin-governance/system-settings
PATCH  /api/v1/admin-governance/system-settings/{settingKey}
```

Governance controls:

- access requires `admin_governance.view` or stricter `admin_governance.manage_roles` / `admin_governance.manage_settings` permissions;
- service, AI, and n8n-style actors are blocked from broad admin governance management;
- role and system-setting mutations require meaningful reasons and are audit logged;
- password hashes, tokens, credentials, signed URLs, private keys, and environment variables are not exposed;
- system setting updates are allowlisted and non-secret only;
- no dashboard, n8n console, NDT visualization, hypercare dashboard, secret editor, direct database editor, or audit log mutation control is introduced.

## RC3-F Governance Dashboard Readiness Overview

RC3-F adds the read-only governance dashboard route `/dashboard` and the API endpoint `GET /api/v1/governance-dashboard/overview`.

The dashboard summarizes existing AIM state only, including evidence readiness, AI extraction review queue, staging promotion readiness, calculation/review readiness, report issue gates, work-order follow-up, and governance/audit warnings. Access is controlled by `dashboard.view`.

RC3-F does not add dashboard mutation controls, n8n console, NDT visualization, hypercare dashboard, new AI extraction/staging features, object-storage expansion, report issue actions, admin changes, direct database editing, or new engineering calculations. Secrets, signed URLs, tokens, object-storage credentials, passwords, private keys, and raw evidence/report contents are not exposed by the dashboard API or UI.

## RC3-G n8n Workflow Console / Orchestration Visibility

RC3-G adds the read-only workflow console route `/workflow-console` and the API endpoint `GET /api/v1/workflow-console/overview`.

The workflow console summarizes existing AIM workflow/orchestration state only, including workflow task summary, pending human follow-ups, notification delivery status, workflow failure/error summary, recent n8n-related workflow events, and n8n boundary reminders. Access is controlled by `workflow_console.view`.

RC3-G does not execute or retry n8n workflows, create an n8n workflow editor/builder, manage n8n credentials, edit webhook secrets, write directly to PostgreSQL, add approval/promotion/report issue/calculation controls, mutate evidence/report artifacts, edit audit logs, add NDT visualization, add a hypercare dashboard, or create new engineering formulas. Secrets, signed URLs, tokens, credentials, webhook secrets, private keys, object keys, raw file contents, and raw report contents are not exposed by the workflow console API or UI.

## RC3-H NDT Data Room / Visualization Governance

RC3-H adds the read-only NDT data room route `/ndt-data-room` and the API endpoint `GET /api/v1/ndt-data-room/overview`.

The NDT data room summarizes existing AIM NDT measurement records and evidence linkage only. It is protected by `ndt_data_room.view`, blocks AI/service/n8n/integration/workflow-style actors from broad visibility, and presents method, component, CML/TML/Grid coverage, evidence linkage status, measurement readiness, latest measurements, and governance warnings.

RC3-H does not add API 579/API 581/FFS/RBI calculations, corrosion rate or remaining life formulas, NDT mutation controls, AI approval or staging promotion changes, object-storage changes, report builder changes, n8n workflow execution/editor controls, hypercare dashboard, direct database editing, audit mutation, or admin RBAC/settings changes beyond permission synchronization. Secrets, signed URLs, tokens, credentials, object keys, raw evidence/report contents, OCR full text, and unrestricted evidence download URLs are not exposed by the NDT data room API or UI.

### RC3-I Hypercare / Go-Live Readiness Dashboard

RC3-I adds a read-only go-live readiness overview for readiness gates, blockers, workflow/notification status, evidence readiness, AI review readiness, staging promotion readiness, calculation/review readiness, report issue gate readiness, NDT readiness, audit/admin governance readiness, and UAT documentation readiness.

The page and API are RBAC-controlled through `golive_readiness.view` and do not add approval, rejection, correction, promotion, report issue, calculation, admin, n8n execution, hypercare closure, or readiness override controls.

RC3-I preserves the AIM governance boundary: AIM remains the system of record, n8n remains orchestration-only through AIM APIs, and AI/n8n/service actors cannot approve, promote, issue, calculate, or make final engineering decisions.

## RC3-J Final UAT / Release Candidate Closure & Production Operations Readiness

Status: Implemented as RC3-J documentation/test closure package.

RC3-J adds final release-candidate closure artifacts only. It creates the RC3 UAT master execution index, production deployment checklist, environment validation checklist, backup/restore runbook, production smoke test checklist, operational handover checklist, security/governance closure checklist, and final release-candidate closure report.

RC3-J does not add runtime features, backend APIs, frontend pages, database tables, migrations, business logic, AI behavior, n8n execution, calculation formulas, report builder behavior, admin mutation, audit mutation, or direct database editing. It preserves AIM as the system of record, n8n as API-only orchestration, AI staging-first review governance, mandatory evidence linkage, immutable audit visibility, and human engineering review/approval gates.

RC3-J formula boundary reminder: No API 579/API 581/FFS/RBI formula implementation may be invented.


## RC4-A Sprint 0 Foundation Polish

Status: Implemented as documentation/test polish package.

RC4-A adds Sprint 0 foundation polish only:

- dedicated health endpoint tests in `apps/api/tests/health.test.ts`;
- safe redaction for database health failure output;
- Sprint 0 closure checklist in `docs/release/sprint0_foundation_closure_checklist.md`;
- documentation that Sprint 0's “no calculation yet” acceptance criterion was historical and superseded by later governed deterministic calculation modules;
- role evolution documentation from original Sprint 0 roles to later persisted governance roles and referenced service-actor identifiers;
- seed idempotency and append-only audit seed behavior documentation.

RC4-A does not add API routes, frontend routes, database tables, migrations, formulas, calculation behavior, AI behavior, n8n behavior, approval behavior, report behavior, FFS/RBI behavior, NDT behavior, or evidence/object-storage behavior.

Governance boundary reminder: AIM remains the system of record; n8n remains orchestration-only; AI/n8n/service actors cannot approve, promote, issue, calculate, close, or make final engineering decisions; evidence linkage and human review remain mandatory; no API/API-ASME/API 579/API 581/FFS/RBI formulas are introduced.


## RC4-B Tank Asset Register Frontend Completion

Status: Implemented as frontend-focused completion package.

RC4-B completes the Tank Asset Register and Engineering Master Data frontend using existing AIM backend APIs. It adds/updates:

- `apps/web/app/assets/page.tsx` for tank asset list, search/filter, create form, operating status, inspection due date, and safe links to evidence, NDT, calculations, and reports.
- `apps/web/app/assets/[assetId]/page.tsx` for asset detail/edit, tank geometry input, shell-course table editor, material master selector, audit-log link, evidence link, NDT link, calculation link, and report link.
- Frontend validation messages for missing `tank_tag`, `asset_name`, `code_edition`, invalid `construction_year`, invalid `inspection_due_date`, missing `diameter`, missing `shell_height`, missing shell-course `material_id`, missing/invalid `joint_efficiency`, numeric range issues, and unit ambiguity where applicable.
- Manual UAT coverage in `docs/uat/uat_rc4b_tank_asset_register_frontend.md` and release report in `docs/release/AIM_RC4B_tank_asset_register_frontend_report.md`.

Frontend validation is UX-only. Backend validation, RBAC, audit logging, and persistence remain authoritative. RC4-B introduces no new engineering formulas, no calculation engine changes, no AI/n8n/service actor governance changes, no report/FFS/RBI/NDT/evidence behavior changes, and no backend schema changes.


## RC4-C Evidence Upload UI and Evidence Detail Page

Status: Implemented as frontend-focused completion package.

RC4-C completes the Evidence Repository upload/detail frontend using existing AIM backend APIs and the RC3-B object-storage flow. It adds/updates:

- `apps/web/app/evidence/page.tsx` for evidence list/table, asset and inspection/event filtering, object-storage upload panel, client-side file validation, SHA-256 checksum calculation, browser PUT upload progress, complete-upload confirmation, upload status, malware scan status, checksum display, and audited open/download action.
- `apps/web/app/evidence/[evidenceId]/page.tsx` for evidence metadata, object-storage status, upload status, malware scan status, checksum, file size, MIME type, asset/inspection context, evidence linkage, audit-log link, safe preview panel, and audited open/download action.
- Manual UAT coverage in `docs/uat/uat_rc4c_evidence_upload_ui.md` and release report in `docs/release/AIM_RC4C_evidence_upload_ui_report.md`.

Evidence UI now uses `POST /api/v1/evidence/upload-url`, browser upload to the returned signed PUT URL or controlled upload instruction, and `POST /api/v1/evidence/complete-upload`. Signed URLs and raw object keys are not displayed. Preview is blocked for infected, blocked, quarantined, scan-failed, deleted, or delete-requested evidence and otherwise uses audited backend URL issuance. Frontend validation is UX-only; backend validation, object-storage policy, RBAC, malware status, audit logging, and evidence persistence remain authoritative.

RC4-C introduces no new engineering formulas, no calculation engine changes, no AI/n8n/service actor governance changes, no approval/report/FFS/RBI/NDT behavior changes, and no backend schema changes.

## RC4-D NDT Bulk Import UX and Measurement Detail Page

Status: Implemented as frontend-focused NDT completion package.

RC4-D completes the NDT bulk import and measurement detail frontend using existing AIM backend APIs. It adds/updates:

- `apps/web/app/ndt/page.tsx` and the NDT data-room client for NDT list/table, manual NDT entry, CSV bulk import preview, row-level validation, component/course/grid/method/asset/evidence filters, evidence-linked and missing-evidence markers, critical missing-evidence warnings, display-only CML/TML grid view, UT/MFL/method grouping, and safe CSV export.
- `apps/web/app/ndt/[measurementId]/page.tsx` for measurement metadata, asset/inspection context, component/course/grid/elevation/orientation, measured thickness with normalized unit label, method, confidence, extraction source, reviewer status, validation status, evidence gate, direct/linked evidence visibility, missing-evidence state, calculation input link, and audit-log link.
- `apps/web/app/assets/[assetId]/ndt/page.tsx` for asset-scoped NDT measurements with asset context, asset-prefilled manual entry, CSV bulk import with asset fallback, filters, evidence markers, and detail links.
- Manual UAT coverage in `docs/uat/uat_rc4d_ndt_bulk_import_measurement_detail.md` and release report in `docs/release/AIM_RC4D_ndt_bulk_import_measurement_detail_report.md`.

NDT manual entry remains available. NDT bulk import supports CSV preview and row-level validation before commit through the existing `POST /api/v1/ndt/measurements/bulk-import` API. XLSX file selection is surfaced for workflow visibility, but no heavy XLSX parser dependency is added; users should convert XLSX workbooks to CSV unless a future approved parser dependency is introduced. NDT visualizations are display-only and use only stored measurement values, existing validation statuses, and existing evidence gate outputs.

RC4-D introduces no new engineering formulas, no API/ASME/API 579/API 581/FFS/RBI calculations, no FFS/RBI trigger logic, no calculation engine changes, no AI/n8n/service actor governance changes, no approval/report/evidence upload behavior changes, no backend schema changes, and no new backend API routes. Frontend validation is UX-only; backend validation, RBAC, audit logging, evidence linkage, and persistence remain authoritative.

## RC4-E Validation-by-Asset UX, Validation History, and Data Dictionary Expansion

Status: Implemented as frontend-focused validation/data-dictionary completion package with a minimal read-only validation-history API adapter.

RC4-E completes the validation-by-asset workflow, validation history visibility, and searchable data dictionary frontend using existing AIM validation foundations. It adds/updates:

- `apps/web/app/validation/page.tsx` for validation dashboard summary, status counts, rule categories, affected entity counts, latest runs, asset validation launcher, and links to history/asset-specific validation.
- `apps/web/app/assets/[assetId]/validation/page.tsx` for asset context, run/refresh validation, grouped field-level messages, unit warnings/errors, material completeness visibility, evidence/NDT/calculation/report readiness visibility where backend data is available, related links, and asset-specific history.
- `apps/web/app/validation/history/page.tsx` for read-only validation run history with asset/entity/status/severity/date filters and expandable detail.
- `apps/web/app/data-dictionary/page.tsx` for searchable, grouped engineering data dictionary coverage across asset, geometry, shell-course, material, inspection, evidence, NDT, validation, calculation, formula, review, decision, report, and audit domains.
- Minimal read-only backend adapters for validation history visibility: `GET /api/v1/engineering/validation-history`, `GET /api/v1/engineering/validation-history/{validationRunId}`, and `GET /api/v1/assets/{assetId}/validation`.
- Manual UAT coverage in `docs/uat/uat_rc4e_validation_by_asset_history_data_dictionary.md` and release report in `docs/release/AIM_RC4E_validation_by_asset_history_data_dictionary_report.md`.

Validation is a control/readiness layer. It may flag, warn, block, and route records to human review, but it does not approve engineering data and does not execute new calculations. RC4-E introduces no engineering formulas, no API/ASME/API 579/API 581/FFS/RBI calculations, no FFS/RBI trigger logic, no calculation engine changes, no AI/n8n/service actor governance changes, and no backend schema changes.



## RC4-F Formula Registry to formula_versions Synchronization

Status: Implemented as backend governance synchronization package with minimal Formula Registry UI status visibility.

RC4-F closes the governance gap between Formula Registry approval and executable `formula_versions`. It adds/updates:

- `apps/api/src/modules/formula-registry/executable-sync.ts` for deterministic, idempotent synchronization from approved/locked Formula Registry records into executable `formula_versions`.
- `apps/api/src/routes/formulas.ts` so human-governed Formula Registry approval synchronizes to `formula_versions` in the same governed operation and exposes an explicit `POST /api/v1/formulas/records/{recordId}/sync-to-executable` action for already-approved records.
- `apps/api/src/routes/calculations.ts` so calculation execution continues to require an approved synchronized `formula_versions` record and audit logs formula-version execution blocks.
- Formula Registry frontend status visibility for approved-not-synchronized, synchronized-to-executable, sync failed/not executable states, executable `formula_version_id`, and last synced timestamp where available.
- Manual UAT coverage in `docs/uat/uat_rc4f_formula_registry_sync.md` and release report in `docs/release/AIM_RC4F_formula_registry_sync_report.md`.

Only approved human-governed Formula Registry records can become executable. Draft, under-review, rejected, retired, deprecated, superseded, inactive, or otherwise unapproved records cannot be synchronized into executable `formula_versions`. Synchronization is idempotent and audit logged. Calculation execution still requires an explicit approved synchronized formula version and persists formula version metadata snapshots.

RC4-F introduces no new engineering formulas, no API/ASME/API 579/API 581/FFS/RBI calculation content, no FFS/RBI trigger logic, no migrations, no backend schema changes, no AI/n8n/service actor governance changes, and no direct n8n/database access.


## RC4-G Calculation Guided UI and Golden Dataset Fixtures

Status: Implemented as frontend calculation UX and deterministic test-fixture package.

RC4-G adds a guided calculation workflow without changing the deterministic calculation engine or introducing engineering formulas. It adds/updates:

- `apps/web/app/calculations/page.tsx` and `apps/web/app/calculations/CalculationEngineClient.tsx` for a guided calculation form, asset selector, approved executable `formula_versions` selector, evidence/NDT selectors, request preview, validation/readiness messages, calculation result summary, and calculation run history.
- `apps/web/app/calculations/[runId]/page.tsx` and detail client for formula version snapshots, input/output snapshots, warnings, blockers, evidence/NDT linkage, engineering review/audit visibility, and display-only comparison to previous calculation runs.
- `apps/web/app/assets/[assetId]/calculations/page.tsx` for asset-scoped calculation history and a prefilled guided calculation form.
- `GET /api/v1/formula-versions/executable` as a read-only adapter that returns only approved/locked deterministic executable `formula_versions` synchronized from human-governed Formula Registry records.
- Golden dataset fixtures and tests for existing MVP deterministic calculation behavior in `apps/api/tests/fixtures/calculation-golden-datasets.ts` and `apps/api/tests/rc4-g-calculation-guided-ui-golden-datasets.test.ts`.

Only approved executable `formula_versions` can be selected. Calculation output remains deterministic, versioned, auditable, and subject to engineering review before final use. RC4-G introduces no new calculations, no API/ASME formulas, no FFS/RBI trigger logic, no AI/n8n/service actor governance changes, no migrations, and no backend schema changes.

## RC4-H Findings / Anomaly Foundation

Status: Implemented as findings/anomaly foundation package.

RC4-H adds a controlled place for engineers to record inspection, NDT, calculation, evidence-review, and validation anomalies without automatically creating FFS/RBI cases or final integrity decisions. It adds/updates:

- `db/migrations/0027_findings_anomaly_foundation.sql` for the `findings` table, linkage columns, status/severity/type/source controls, and finding RBAC permissions.
- `apps/api/src/routes/findings.ts` for findings list/detail/create/update, asset-scoped listing, same-asset evidence linkage, evidence unlinking, audit logs, cross-asset link rejection, and human-governed closure controls.
- `apps/web/app/findings/page.tsx`, `apps/web/app/findings/[findingId]/page.tsx`, and `apps/web/app/assets/[assetId]/findings/page.tsx` for create/list/detail/asset-scoped findings UX with evidence/NDT/calculation linkage markers and critical missing-evidence warnings.
- Safe links from asset, evidence, NDT, and calculation pages to findings where appropriate.
- Manual UAT coverage in `docs/uat/uat_rc4h_findings_anomaly_foundation.md` and release report in `docs/release/AIM_RC4H_findings_anomaly_foundation_report.md`.

Findings are traceable engineering records linked to assets, evidence, NDT, calculations, and validation where available. Critical findings require governance controls before closure. Finding closure does not approve engineering data, issue reports, create FFS/RBI cases, or make final integrity decisions.

RC4-H introduces no engineering formulas, no API/ASME/API 579/API 581/FFS/RBI calculation content, no FFS/RBI case automation, no calculation engine changes, no Formula Registry changes, no AI/n8n/service actor authority expansion, and no direct n8n/database access.

## RC4-I RBI Workflow Detail, Guided UI, and Duplicate Prevention

Status: Implemented as RBI workflow completion package.

RC4-I adds guided RBI case creation, `/rbi/[caseId]` detail workflow, review/status/finalization actions, duplicate prevention for repeated calculation-warning triggers, and repeated-anomaly RBI trigger creation from the RC4-H findings/anomaly history module.

Changed areas:

- `apps/api/src/routes/rbi.ts` now exposes repeated finding-history trigger creation, review/export/close actions, same-asset evidence validation on calculation-triggered cases, and duplicate prevention for warning/finding signatures.
- `apps/web/app/rbi/RbiInterfaceClient.tsx` now provides guided fields instead of JSON-only manual case creation, calculation-trigger and findings-history trigger forms, and a display-only qualitative risk matrix.
- `apps/web/app/rbi/[caseId]/page.tsx` and detail client provide case-level workflow actions, evidence/source traceability, audit links, and placeholder risk driver visibility.
- `04_API/openapi.yaml`, data dictionary, ERD, UAT, release, and source-of-truth docs are aligned to the new RBI workflow behavior.

RC4-I introduces no API RP 581 quantitative formulas, no new deterministic calculation math, no report issuance automation, no final integrity decision automation, no direct n8n/database access, and no AI approval path.

## RC4-J Engineering Review and Approval Detail

RC4-J completes the product-facing Engineering Review and Approval workflow on top of the corrected RC4-I base.

Implemented RC4-J controls:

- `/reviews/[reviewId]` detail page for structured checklist, threaded comments, approval/rejection/override actions, revision creation, and audit trail.
- `/reviews` list is now permission-aware and links review records to detail workflow.
- Structured checklist gates must pass or be marked not applicable before a review can be marked `reviewed`.
- Approval requests require a completed `reviewed` engineering review.
- Rejection requires a human reason/comment.
- Controlled override approval requires affected field, original value, override value, reason, and evidence reference.
- Locked records are not mutated; new revision creation is available through `/api/v1/engineering/reviews/{reviewId}/revision`.
- Calculation detail page replaces raw JSON-only review/audit display with a readable review, approval, and audit timeline.
- DB-backed RBAC is aligned for admin, senior_engineer, lead_engineer, and approver final approval authority; AI agents remain blocked.

RC4-J adds no formulas, no API 579/API 581 quantitative logic, no report issue changes, no direct n8n/database access, and no AI finalization.

## RC4-K Report Detail and Issue Readiness

RC4-K adds a controlled report detail and issue-readiness workflow on top of RC4-J.

Implemented RC4-K controls:

- `/reports/[reportId]` detail page for report status, traceability, sections, evidence register, export artifacts, issue-readiness gates, and governed report actions.
- `GET /api/v1/reports/{reportId}/issue-readiness` for read-only preview of report issue gates before attempting final issue.
- Permission-aware approve, issue, export, signed-URL open, and direct evidence-link actions in the report detail UI.
- Direct evidence-link shortcuts for the report, calculation run, and approved integrity decision targets used by the issue gate.
- Export artifact register with checksum/status visibility for object-storage report artifacts.

The readiness endpoint does not approve, issue, export, lock, or mutate reports. The existing report issue endpoint remains authoritative and continues to enforce mandatory data/evidence/calculation/review/integrity/report approval/workflow-error/comment gates. RC4-K adds no formulas, no API 579/API 581 quantitative logic, no automatic report issue, no AI/n8n finalization, no external CMMS integration, and no direct n8n/database access.

## RC4-L Work Order Detail and Closure Readiness

RC4-L adds a governed internal work-order detail and closure-readiness workflow on top of RC4-K.

Implemented RC4-L controls:

- `/work-orders/[workOrderId]` detail page for work order status, closure-readiness gates, linked closure evidence, source traceability, audit timeline, update form, and governed close form.
- `GET /api/v1/work-orders/{workOrderId}/closure-readiness` as a read-only preview of closure gates.
- Close endpoint alignment with readiness gates, including mandatory completion note, conditional closure evidence, source traceability, and external CMMS boundary checks.
- Closed work orders are locked from generic update and repeat close actions.
- Work-order list links users to the detail-level readiness workflow before close.

RC4-L does not add external CMMS/SAP/Maximo integration, automatic closure, AI/n8n/service finalization, engineering formulas, report issue changes, calculation changes, FFS/RBI quantitative logic, or direct n8n/database access.


## RC4-M Evidence Traceability Matrix; RC4-N Integrity Decision Detail and Decision Readiness

RC4-M adds a read-only cross-module evidence coverage matrix after RC4-L.

Implemented RC4-M controls:

- `/evidence-traceability` frontend page for evidence coverage summary, module coverage matrix, missing evidence indicators, recent normalized evidence links, and governance notes.
- `GET /api/v1/evidence/traceability-matrix` endpoint protected by `evidence.read`.
- Optional `asset_id` and `inspection_event_id` filters for scoped coverage review.
- Coverage visibility across asset, inspection, NDT, finding, calculation, integrity decision, RBI, report, and internal work-order records.
- Required-module missing evidence indicators to help engineers identify evidence linkage gaps before relying on downstream review/report/work-order gates.

RC4-M is read-only. It does not upload, download, delete, approve, issue, close, promote, mutate, or finalize evidence or engineering records. It adds no object-storage behavior changes, no AI extraction changes, no formulas, no FFS/RBI quantitative logic, no external CMMS integration, and no direct n8n/database access.

## RC4-N Integrity Decision Detail and Decision Readiness

RC4-N adds a governed integrity decision detail and decision-readiness workflow after RC4-M.

Implemented RC4-N controls:

- `/integrity-decisions/[decisionId]` detail page with status, readiness gates, direct evidence, source/downstream traceability, and audit timeline.
- `GET /api/v1/integrity-decisions/{decisionId}/readiness` read-only decision-readiness preview.
- Readiness gates for approved calculation linkage, calculation review, direct decision evidence, human review/approval traceability, decision approval, source traceability, and AI/n8n finalization boundaries.
- Permission-aware direct evidence linking and senior-human approval actions on the detail page while backend RBAC remains authoritative.

RC4-N does not add formulas, quantitative API 579/API 581 logic, automatic report issue, work-order automation, AI/n8n/service finalization, object-storage changes, migrations, or direct n8n/database access.

## RC4-O Calculation Run Detail and Formula Traceability Readiness

RC4-O adds a calculation-run detail and formula-traceability readiness workflow after RC4-N.

Implemented RC4-O controls:

- `/calculations/[runId]` now shows formula traceability readiness, snapshot hashes, readiness gates, linked evidence, downstream integrity decision/report/work-order traceability, review/approval records, and audit timeline.
- `GET /api/v1/engineering/calculations/{runId}/readiness` provides a read-only calculation final-use readiness preview.
- Readiness gates cover approved formula version snapshot, deterministic output snapshot, validation status, evidence linkage, engineering review, final-use approval, downstream decision visibility, and AI/n8n finalization boundaries.
- Calculation run list links users to the detail-level formula readiness workflow.

RC4-O does not add formulas, recalculate existing outputs, approve/reject/lock calculation runs, issue reports, create integrity decisions, create work orders, change object storage, implement API 579/API 581 quantitative logic, enable AI/n8n/service finalization, or bypass human engineering review.



### RC4-P NDT Measurement Detail + Inspection Traceability Readiness

RC4-P adds a read-only NDT measurement readiness workflow:

- `GET /api/v1/ndt/measurements/{measurementId}/readiness`
- enhanced `/ndt/[measurementId]` detail page
- inspection context, evidence linkage, finding/anomaly trace, calculation input usage, human review/approval trace, and audit timeline
- readiness gates for evidence, validation, review status, downstream traceability, and AI/n8n finalization boundaries

RC4-P does not add formulas, does not calculate corrosion rate/remaining life/FFS/RBI/API 579/API 581 outputs, does not approve or reject NDT data, does not mutate object storage, and does not allow AI/n8n/service actors to finalize engineering records.

### RC4-Q Inspection Event Detail + Inspection Package Readiness

RC4-Q adds the inspection package workspace:

- `GET /api/v1/inspections`
- `GET /api/v1/inspections/{inspectionEventId}/readiness`
- `/inspections`
- `/inspections/[inspectionEventId]`

The readiness endpoint is read-only and summarizes inspection scope, package evidence, NDT coverage, findings, deterministic calculation traceability, review/approval trace, downstream decisions/reports/work-orders, and audit events. No API 579/API 581/FFS/RBI/corrosion-rate/remaining-life formula is executed, and AI/n8n/service actors cannot finalize inspection package readiness.

### RC4-R Asset Detail + Asset Integrity Package Readiness

RC4-R adds the asset integrity package workspace:

- `GET /api/v1/assets/{assetId}/readiness`
- `/assets/[assetId]`

The readiness endpoint is read-only and summarizes asset master data, geometry, shell courses, material traceability, evidence coverage, inspection history, NDT coverage, findings, deterministic calculation traceability, review/approval trace, integrity decisions, downstream reports/work-orders, and audit events. No API 579/API 581/FFS/RBI/corrosion-rate/remaining-life formula is executed, and AI/n8n/service actors cannot finalize asset integrity package readiness.

### RC4-S FFS Case Detail + FFS Disposition Readiness

RC4-S adds the FFS disposition readiness workspace:

- `GET /api/v1/ffs/cases/{caseId}/readiness`
- `/ffs/[caseId]`

The readiness endpoint is read-only and summarizes FFS trigger context, supporting evidence, deterministic calculation trigger trace, engineering review trace, senior disposition approval trace, downstream report/work-order traceability, and audit events. No API 579/API 581/FFS/RBI/corrosion-rate/remaining-life formula is executed, and AI/n8n/service actors cannot approve final FFS disposition or declare fitness for service.
### RC4-T End-to-End Integrity Package Workspace + Release Candidate Consolidation

RC4-T adds the consolidated integrity package workspace:

- `GET /api/v1/integrity-workspace`
- `GET /api/v1/integrity-workspace/assets/{assetId}/readiness`
- `/integrity-workspace`
- `/integrity-workspace/[assetId]`

The workspace links the complete AIM integrity chain: Asset → Inspection → Evidence → NDT → Findings → Calculation → Review/Approval → Integrity Decision → FFS/RBI → Report → Work Order. Module-specific readiness gates remain authoritative. No API 579/API 581/FFS/RBI/corrosion-rate/remaining-life formula is executed, and AI/n8n/service actors cannot finalize end-to-end integrity package readiness.

### RC4-U Final UAT Evidence Pack + Production Readiness Closure

RC4-U adds the final release closure workspace:

- `GET /api/v1/release-closure/readiness`
- `/release-closure`
- final UAT evidence pack index
- production readiness checklist
- deployment verification and rollback checklist
- hypercare and go/no-go signoff matrix
- known MVP exclusions
- completion estimate visibility

RC4-U is read-only. It does not approve/reject records, run formulas, issue reports, close work orders, mutate object storage, promote AI staging records, execute n8n workflows, or allow AI/n8n/service actors to finalize release closure readiness.

### RC4-V Production Environment Validation + Release Candidate Signoff Evidence

RC4-V adds the production validation workspace:

- `GET /api/v1/production-validation/readiness`
- `/production-validation`
- production environment validation evidence checklist
- smoke test execution record
- backup/restore drill record
- monitoring and alerting verification
- release candidate signoff evidence matrix

The workspace is read-only and separates release-candidate evidence from final production go-live approval. No API 579/API 581/FFS/RBI/corrosion-rate/remaining-life formula is executed, and AI/n8n/service actors cannot finalize production validation or approve go-live.

### RC4-W Security Review Evidence + Operational Monitoring Closure

RC4-W adds the security monitoring closure workspace:

- `GET /api/v1/security-monitoring/readiness`
- `/security-monitoring`
- security review evidence checklist
- operational monitoring closure checklist
- incident response and alert routing runbook
- security monitoring signoff evidence matrix

The workspace is read-only and separates security/operations evidence from final production go-live approval. No API 579/API 581/FFS/RBI/corrosion-rate/remaining-life formula is executed, and AI/n8n/service actors cannot finalize security monitoring closure, operational signoff, or production launch readiness.


### RC4-X Final Release Decision Pack Cleanup

RC4-X is a documentation/evidence-control closure package after RC4-A through RC4-W post-review merge.

RC4-X adds and aligns:

- final release readiness status summary;
- final go/no-go decision record template;
- final release evidence register;
- final release checklist wording that distinguishes MVP release-candidate readiness from production go-live approval;
- superseded-note cleanup for older Phase 2 documents that previously treated frontend screens as absent.

RC4-X does not add runtime APIs, database migrations, formulas, AI behavior, n8n behavior, object-storage behavior, report issue behavior, approval behavior, work-order behavior, or external CMMS integration. Final production go-live remains a human decision based on attached UAT, security, backup/restore, monitoring, deployment, and signoff evidence.

### RC4-Y Final Release Operations Evidence Collection

RC4-Y adds the final operations evidence collection layer after RC4-X:

- final operations evidence matrix from `EV-OPS-001` through `EV-OPS-017`;
- final release operations evidence runbook;
- cutover and rollback evidence record;
- final evidence register and go/no-go linkage for operations evidence.

RC4-Y does not add runtime APIs, database migrations, formulas, AI behavior, n8n behavior, object-storage behavior, report issue behavior, approval behavior, work-order behavior, or external CMMS integration. AI/n8n/service actors cannot accept evidence, sign go-live evidence, or approve go-live.


### RC4-Z Final Go/No-Go Signoff Preparation

RC4-Z adds the final human signoff preparation layer after RC4-X and RC4-Y:

- final go/no-go signoff packet;
- final go/no-go meeting minutes template;
- final go-live authorization record;
- signoff evidence mapping in the final evidence register and decision record.

RC4-Z does not add runtime APIs, database migrations, formulas, AI behavior, n8n behavior, object-storage behavior, report issue behavior, approval behavior, work-order behavior, or external CMMS integration. AI/n8n/service actors cannot sign, authorize, or approve production go-live.


### AIM MVP Final Go/No-Go Evidence Bundle

The final evidence bundle consolidates RC4-X decision records, RC4-Y operations evidence, and RC4-Z signoff artifacts into an archive-ready release package. It records release tag, commit SHA, decision date, decision owner, evidence coordinator, final decision status, evidence bundle location, and archive owner.

The final evidence bundle does not add runtime APIs, database migrations, formulas, AI behavior, n8n behavior, object-storage behavior, report issue behavior, approval behavior, work-order behavior, external CMMS integration, full API 579, full API 581, 3D processing, or copied API/API-ASME formulas.


### Phase 5 Production Hardening Roadmap

Phase 5 starts after the RC4-A through RC4-Z MVP release-candidate baseline and final evidence bundle are closed. It is a production-hardening and enterprise-readiness track, not an RC4 feature patch.

Phase 5 covers security hardening, CI/CD and deployment automation, environment and infrastructure controls, observability and alerting, backup/restore/DR maturity, data lifecycle governance, performance and scalability testing, external integration readiness, and enterprise/commercial readiness.

Phase 5 must preserve the AIM governance boundaries: AIM remains the system of record; AI output remains staging-only; n8n remains orchestration-only; deterministic calculations remain versioned and auditable; and AI/n8n/service actors cannot approve engineering data, sign release evidence, or authorize production go-live.

## P5-1 Security and Secrets Hardening

Status: Phase 5 documentation/evidence-control package.

P5-1 turns the Phase 5 security roadmap into concrete evidence records for secret scanning, environment-file hygiene, dependency vulnerability triage, RBAC/service actor review, token/session hardening, audit-log redaction, signed URL/raw object key exposure review, accepted-risk approval, and final human security signoff.

P5-1 does not add runtime APIs, database migrations, formulas, AI behavior, n8n behavior, object-storage behavior, report issue behavior, approval behavior, work-order behavior, external CMMS integration, full API 579, full API 581, 3D processing, or copied API/API-ASME formulas.

AI/n8n/service actors cannot accept security evidence, approve accepted risks, waive missing evidence, sign the security review, or authorize production go-live.

## P5-2 Deployment and Environment Hardening

Status: Phase 5 documentation/evidence-control package.

P5-2 adds concrete deployment and environment evidence records for release baseline traceability, build provenance, environment variable inventory, `.env.example` parity, production configuration validation, PostgreSQL privilege review, migration and seed rehearsal, object-storage configuration validation, n8n environment boundary review, deployment smoke testing, rollback readiness, and human deployment signoff.

P5-2 does not add runtime APIs, database migrations, formulas, AI behavior, n8n behavior, object-storage behavior, report issue behavior, approval behavior, work-order behavior, external CMMS integration, full API 579, full API 581, 3D processing, or copied API/API-ASME formulas.

AI/n8n/service actors cannot accept deployment evidence, approve environment readiness, accept rollback readiness, waive missing evidence, sign deployment readiness, or authorize production go-live.

## P5-3 Observability and Incident Response

Status: Phase 5 documentation/evidence-control package.

P5-3 adds concrete observability and incident-response evidence records for monitoring ownership, dashboard baseline, service health checks, alert routing verification, audit/error/workflow/correlation log review, log retention/redaction, incident severity triage, incident response tabletop, governance incident routing, hypercare cadence, incident closure evidence, and human observability signoff.

P5-3 does not add runtime APIs, database migrations, formulas, AI behavior, n8n behavior, object-storage behavior, report issue behavior, approval behavior, work-order behavior, external CMMS integration, full API 579, full API 581, 3D processing, or copied API/API-ASME formulas.

AI/n8n/service actors cannot accept observability evidence, close incidents, accept residual operational risk, approve hypercare handoff, or authorize production go-live.

## P5-4 Backup, Restore, and DR

Status: Phase 5 documentation/evidence-control package.

P5-4 adds concrete backup, restore, and disaster-recovery evidence records for PostgreSQL backup ownership, PostgreSQL restore rehearsal, object-storage backup/restore validation, configuration and secret recovery ownership, RPO/RTO definition and measurement, DR scenario rehearsal, governance recovery validation, recovery escalation, accepted-risk review, and human DR signoff.

P5-4 does not add runtime APIs, database migrations, formulas, AI behavior, n8n behavior, object-storage behavior, report issue behavior, approval behavior, work-order behavior, external CMMS integration, full API 579, full API 581, 3D processing, or copied API/API-ASME formulas.

AI/n8n/service actors cannot accept backup evidence, approve restore readiness, approve DR signoff, accept residual DR risk, waive missing recovery evidence, close DR gaps, or authorize production go-live.


## P5-5 Performance, Scale, and Data Lifecycle

Status: Phase 5 documentation/evidence-control package.

P5-5 adds concrete performance, scale, reliability, and data-lifecycle evidence records for performance baseline ownership, API load smoke testing, report export throughput, object-storage upload/download throughput, database query and pagination review, frontend route responsiveness, capacity assumptions, timeout/retry/error policy, data retention matrix, archive/export/purge lifecycle procedure, accepted-risk review, and human performance/lifecycle signoff.

P5-5 does not add runtime APIs, database migrations, formulas, AI behavior, n8n behavior, object-storage behavior, report issue behavior, approval behavior, work-order behavior, external CMMS integration, full API 579, full API 581, 3D processing, or copied API/API-ASME formulas.

AI/n8n/service actors cannot accept performance evidence, approve performance readiness, approve data-retention exceptions, close lifecycle gaps, accept residual performance risk, or authorize production go-live.

## P5-6 Integration Readiness

Status: Phase 5 documentation/evidence-control package.

P5-6 adds concrete integration-readiness evidence records for integration ownership and inventory, AIM API contract boundary review, n8n workflow boundary review, object-storage handoff boundaries, external CMMS readiness and internal work-order fallback, notification and webhook routing, retry/replay/idempotency policy, integration error/audit/correlation logging, service-account and credential review, sandbox/test-data validation, accepted-risk review, and human integration readiness signoff.

P5-6 does not add runtime APIs, database migrations, formulas, AI behavior, n8n behavior, object-storage behavior, report issue behavior, approval behavior, work-order behavior, external CMMS integration, full API 579, full API 581, 3D processing, or copied API/API-ASME formulas.

AI/n8n/service actors cannot accept integration evidence, approve integration readiness, approve external CMMS cutover, close integration gaps, accept residual integration risk, or authorize production go-live.

## Phase 5 Final Production Hardening Closure Pack

Status: Phase 5 documentation/evidence-control closure package.

The Phase 5 Final Production Hardening Closure Pack consolidates P5-1 through P5-6 into a final evidence-control baseline covering security, deployment/environment, observability/incident response, backup/restore/DR, performance/scale/data lifecycle, integration readiness, residual risks, evidence archive readiness, and final human closure signoff.

P5-1 through P5-6 are closed as evidence-control baseline. Phase 5 final closure is not production go-live approval.

Phase 5 final closure does not add runtime APIs, database migrations, formulas, AI behavior, n8n behavior, object-storage behavior, report issue behavior, approval behavior, work-order behavior, external CMMS integration, full API 579, full API 581, 3D processing, or copied API/API-ASME formulas.

AI/n8n/service actors cannot accept Phase 5 closure evidence, approve production go-live, accept residual risks, waive missing evidence, close Phase 5 final closure gaps, or sign Phase 5 final closure.
### Production Pilot Evidence Execution Pack

The Production Pilot Evidence Execution Pack starts after Phase 5 Final Production Hardening Closure. It converts the Phase 5 evidence-control baseline into a controlled limited production-pilot execution package.

It adds:

- production pilot evidence execution pack;
- production pilot execution plan;
- production pilot UAT and business validation record;
- production pilot operational readiness record;
- production pilot defect, risk, and decision record;
- production pilot evidence execution runbook;
- regression coverage for the pilot evidence package.

Production pilot evidence execution does not add runtime APIs, database migrations, formulas, AI behavior, n8n behavior, object-storage behavior, approval behavior, report issue behavior, work-order behavior, external CMMS integration, full API 579, full API 581, 3D processing, or copied API/API-ASME formulas.

Production pilot evidence execution is not production-wide go-live approval. AI/n8n/service actors cannot accept production pilot evidence, approve pilot completion, approve production-wide go-live, accept residual pilot risks, close pilot defects, or sign the final pilot decision. AIM remains the system of record and n8n remains orchestration-only.


## Final Production Go-Live Authorization Evidence Pack

Status: Final documentation/evidence-control authorization package after Production Pilot Evidence Execution Pack.

The Final Production Go-Live Authorization Evidence Pack converts the completed production pilot evidence baseline into a controlled human-only production-wide go-live authorization package. It adds final go-live evidence mapping, final authorization record, final cutover/hypercare activation record, final residual-risk and business acceptance record, and final authorization runbook.

Final production go-live authorization does not add runtime APIs, database migrations, formulas, AI behavior, n8n behavior, object-storage behavior, approval behavior, report issue behavior, work-order behavior, external CMMS integration, full API 579, full API 581, 3D processing, or copied API/API-ASME formulas.

Final production go-live authorization requires `GOLIVE-001` through `GOLIVE-012`, production pilot closure, Phase 5 closure confirmation, human signoff for security/deployment/observability/DR/performance/integration, residual-risk business acceptance, cutover and rollback authorization, hypercare activation, and final human production go-live authorization.

AI/n8n/service actors cannot approve final production go-live, accept final residual risks, authorize cutover, approve hypercare activation, close go-live gaps, waive missing evidence, or sign final production authorization. AIM remains the system of record and n8n remains orchestration-only.

## Post-Go-Live Hypercare and Production Stabilization Evidence Pack

Status: prepared as post-production authorization documentation/evidence-control package after Final Production Go-Live Authorization Evidence Pack.

The Post-Go-Live Hypercare and Production Stabilization Evidence Pack adds `HYPERCARE-001` through `HYPERCARE-012`, covering hypercare baseline, cadence, production monitoring, incident intake and severity, defect/problem management, governance workflow monitoring, user support/adoption, security/access watch, performance/capacity watch, rollback/watch conditions, BAU handoff readiness, and final human hypercare closure signoff.

Post-go-live hypercare does not add runtime APIs, database migrations, formulas, AI/n8n behavior, object-storage behavior, approval/report/work-order behavior, external CMMS integration, full API 579/API 581 implementation, 3D processing, or copied API/API-ASME formulas.

AI/n8n/service actors cannot accept hypercare evidence, close production incidents, approve BAU handoff, approve residual operational risk, waive missing evidence, or sign hypercare closure.

## Post-Go-Live Hypercare Closure and BAU Transition Authorization Pack

The Post-Go-Live Hypercare Closure and BAU Transition Authorization Pack follows the Post-Go-Live Hypercare and Production Stabilization Evidence Pack and converts completed hypercare into a controlled BAU transition decision.

It adds `BAU-001` through `BAU-012` and reconciles hypercare evidence completion, production incident closure, residual defect carryover, BAU support ownership, monitoring ownership transfer, governance control continuity, security/access handoff, backup/restore/DR ownership, performance/capacity ownership, evidence archive readiness, and final human BAU transition authorization.

BAU transition authorization does not add runtime APIs, database migrations, formulas, AI/n8n behavior, object-storage behavior, report/work-order behavior, external CMMS integration, full API 579, full API 581, 3D processing, or copied API/API-ASME formulas.

AI/n8n/service actors cannot accept BAU transition evidence, approve BAU transition, approve support handoff, accept residual BAU risks, close BAU defects, waive BAU transition evidence, or sign BAU transition authorization.

## Final Production Operations Closure and Continuous Improvement Backlog Pack

Status: Documentation/evidence-control package prepared after Post-Go-Live Hypercare Closure and BAU Transition Authorization Pack.

The Final Production Operations Closure and Continuous Improvement Backlog Pack adds `OPS-CLOSE-001` through `OPS-CLOSE-012` to close the production operations evidence-control baseline and move governed work into a continuous-improvement backlog. It verifies final production operations baseline, BAU ownership, KPI/SLA operating-state review, incident/problem reconciliation, residual operational risk, continuous-improvement prioritization, governance continuity, evidence/data lifecycle archive ownership, security/access watch, backup/restore/DR ownership, enterprise-readiness carryover, and final human operations closure signoff.

Operations closure does not add runtime APIs, database migrations, formulas, AI/n8n behavior, object-storage behavior, approval/report/work-order behavior, external CMMS integration, full API 579/API 581 implementation, 3D processing, or copied API/API-ASME formulas.

AI/n8n/service actors cannot accept operations closure evidence, approve continuous improvement priority, approve KPI/SLA exceptions, close operations closure gaps, accept residual operational risks, or sign final operations closure.

## Final Productization and Commercial Readiness Roadmap Pack

Status: Documentation/evidence-control roadmap package after final production operations closure.

The Final Productization and Commercial Readiness Roadmap Pack adds `PROD-READY-001` through `PROD-READY-012`, covering productization baseline, product packaging scope, tenant/customer model, commercial support model, compliance/governance posture, pricing/licensing assumptions, enterprise readiness gap backlog, customer onboarding/UAT model, change-control and release governance, data residency/legal readiness, demo/sales safety boundaries, and final human productization roadmap signoff.

Productization readiness does not add runtime APIs, database migrations, formulas, AI/n8n behavior, object-storage behavior, approval/report/work-order behavior, tenant billing, payment processing, external CMMS integration, full API 579/API 581 implementation, 3D processing, or copied API/API-ASME formulas.

AI/n8n/service actors cannot accept productization evidence, approve commercial readiness, approve pricing or licensing, accept enterprise readiness gaps, approve customer onboarding readiness, or sign productization roadmap approval. n8n remains orchestration-only. AIM remains the system of record.

## Commercial MVP Launch Control and Customer Onboarding Evidence Pack

The Commercial MVP Launch Control and Customer Onboarding Evidence Pack adds `COMM-LAUNCH-001` through `COMM-LAUNCH-012`, covering commercial launch baseline, launch authority, customer qualification, onboarding plan, tenant/customer environment readiness, demo/sandbox and data safety, support/SLA onboarding, customer UAT/acceptance model, security/legal/compliance onboarding, commercial launch risk register, launch communications and rollback/offboarding, and final human commercial MVP launch authorization.

Commercial launch control does not add runtime APIs, database migrations, formulas, AI/n8n behavior, object-storage behavior, approval/report/work-order behavior, tenant billing, payment processing, contract execution, invoice collection, external CMMS integration, full API 579/API 581 implementation, 3D processing, or copied API/API-ASME formulas.

AI/n8n/service actors cannot accept commercial launch evidence, approve commercial launch, approve customer onboarding, approve customer acceptance, approve SLA commitments, accept commercial launch risks, or sign commercial launch authorization. n8n remains orchestration-only and AIM remains the system of record.


## Customer Success, Commercial Operations, and Renewal Readiness Evidence Pack

Status: documentation/evidence-control package prepared after Commercial MVP Launch Control and Customer Onboarding Evidence Pack.

The Customer Success, Commercial Operations, and Renewal Readiness Evidence Pack adds `CS-OPS-001` through `CS-OPS-012` to govern post-launch customer success ownership, customer health, adoption/value realization, support operations, SLA/KPI review, commercial operations handoff, customer issue escalation, renewal readiness, expansion readiness, customer lifecycle risks, evidence archive ownership, and final human customer lifecycle signoff.

Customer success/commercial operations readiness does not add runtime APIs, database migrations, formulas, AI behavior, n8n behavior, object-storage behavior, report issue behavior, approval behavior, work-order behavior, tenant billing, payment processing, contract execution, external CMMS integration, full API 579, full API 581, 3D processing, or copied API/API-ASME formulas.

AI/n8n/service actors cannot accept customer success evidence, approve customer success readiness, approve renewal readiness, approve expansion readiness, approve commercial operations handoff, approve SLA exceptions, accept customer lifecycle risks, or sign customer lifecycle closure.

AIM remains the system of record. n8n remains orchestration-only.


## Commercial Governance, Sales Enablement, and Scale Readiness Evidence Pack

Status: Documentation/evidence-control package prepared.

The commercial governance and scale readiness pack adds `COMM-GOV-001` through `COMM-GOV-012` to convert customer success/commercial operations readiness into controlled sales enablement, commercial governance, partner/channel readiness, implementation scale, support/SLA scale, residual commercial risk, and final human commercial scale-readiness signoff.

Commercial governance and scale readiness does not add runtime APIs, database migrations, formulas, AI/n8n behavior, object-storage behavior, approval/report/work-order behavior, tenant billing, payment processing, contract execution, partner contract execution, external CMMS integration, full API 579/API 581 implementation, 3D processing, or copied API/API-ASME formulas.

AI/n8n/service actors cannot accept commercial governance evidence, approve sales enablement materials, approve pricing or discount exceptions, approve customer commitments, approve partner/channel readiness, approve scale readiness, accept commercial scale risks, or sign commercial governance closure.

## Commercial Scale Operating Model and Partner Implementation Readiness Pack

The Commercial Scale Operating Model and Partner Implementation Readiness Pack follows commercial governance, sales enablement, and scale readiness. It converts scale planning into a controlled operating model for repeatable delivery, partner implementation, multi-customer rollout, support escalation, capacity assumptions, implementation evidence archive, and final human scale operating-model signoff.

This package introduces `SCALE-OPS-001` through `SCALE-OPS-012` and preserves the production/commercial baseline without reopening runtime scope.

Commercial scale operating model does not add runtime APIs, database migrations, formulas, AI/n8n behavior, object-storage behavior, report/work-order behavior, external CMMS implementation, tenant billing, payment processing, partner portal functionality, full API 579, full API 581, 3D processing, or copied API/API-ASME formulas.

AI/n8n/service actors cannot accept scale operating model evidence, approve partner implementation readiness, approve multi-customer rollout readiness, approve delivery role assignments, approve support escalation handoff, accept scale operating risks, or sign scale operating model closure.
