# AIM+n8n Tank Integrity Module

Sprint status: **RC2 merged/tagged; Sprint 2.6 / RC3-A hardening in progress — repository hygiene, config alignment, root route, and demo route gating**

This repository implements the AIM+n8n Tank Integrity Module MVP through RC2 controlled UAT closure and RC3-A hardening preparation: Tank Asset Register, governance hardening, Evidence Repository, AI extraction/staging, NDT Data Room, Engineering Validation Engine, controlled Formula Registry metadata/versioning, universal deterministic calculation execution, FFS trigger workflow governance, RBI interface trigger governance, report generation/issue gates, integrity decision approval, and internal AIM work order fallback. It does **not** implement API/API-ASME formula expressions, full API 579/API 581 assessment, 3D processing, or external CMMS integration.

## Non-negotiable Architecture Boundary

- AIM is the system of record.
- PostgreSQL stores final structured engineering data, metadata, validation snapshots, audit logs, workflow events, and error logs.
- Object storage stores original evidence files; RC3-A aligns configuration for future RC3-B object-storage implementation, while the current MVP still stores object-storage-compatible evidence metadata/path.
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
- RBAC roles: `admin`, `data_entry`, `inspector`, `engineer`, `senior_engineer`, `qa_qc`, `client_viewer`, `ai_agent`.
- Health endpoints: `GET /health`, `GET /health/db`.
- Idempotent seed data and CI-ready test commands.

### Sprint 2 — Tank Asset Register and Engineering Master Data

- Asset CRUD APIs and UI.
- Tank geometry and shell course master data.
- Material selector.
- Unit-normalized validation for geometry and thickness inputs.
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

Seed scripts are idempotent and can be re-run safely.

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
- Evidence binary upload/signed object-storage URL flow is not production-ready.
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

RC3-A focuses on repository hygiene, configuration alignment, frontend root-route handling, and production-safe demo route gating. Correct runtime endpoints for RC2/RC3 are:

- API health: `GET /health` and `GET /health/db`.
- JWT login: `POST /api/v1/auth/login`.
- Authenticated user: `GET /api/v1/auth/me`.
- RBAC demo routes: local/development/test only when `AUTH_ALLOW_LOCAL_DEMO=true`; unavailable in production-like environments.

The controlled deployment/hypercare evidence generated against `127.0.0.1:5433/aim_tank_integrity` is a confirmed local deployment database. Treat it as controlled production-like evidence unless that database is explicitly the production target. Final real-production closure remains human-gated and pending hypercare completion.

RC3-A does not implement evidence object-storage upload/download, report artifact object storage, or AI staging-to-final promotion. Those remain assigned to later RC3 work packages.
