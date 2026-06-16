# AIM+n8n Tank Integrity Module

Sprint status: **Sprint 8 RBI Interface and Trigger Workflow Complete**

This repository implements the AIM+n8n Tank Integrity Module foundation through Sprint 8: Tank Asset Register, governance hardening, Evidence Repository, NDT Data Room, Engineering Validation Engine, controlled Formula Registry metadata/versioning, universal deterministic calculation execution, FFS trigger workflow governance, and RBI interface trigger workflow governance. It does **not** implement API/API-ASME formula expressions, AI extraction runtime, report generation, or external CMMS integration.

## Non-negotiable Architecture Boundary

- AIM is the system of record.
- PostgreSQL stores final structured engineering data, metadata, validation snapshots, audit logs, workflow events, and error logs.
- Object storage stores original evidence files; this MVP stores object-storage-compatible evidence metadata/path.
- n8n is orchestration only and must call AIM backend APIs.
- n8n must not write directly to PostgreSQL.
- AI extraction output must go to extraction/staging tables only when implemented.
- AI must not approve engineering data, calculations, integrity decisions, formulas, or issued reports.
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
```

Run from an empty PostgreSQL database:

```powershell
pnpm db:migrate
pnpm db:seed
```

Seed scripts are idempotent and can be re-run safely.

## Frontend Routes

- `/assets`
- `/assets/[assetId]`
- `/evidence`
- `/ndt`
- `/validation`
- `/formulas`
- `/formulas/[formulaId]`
- `/calculations`
- `/ffs`

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

Production authentication/JWT/session hardening must replace demo headers before UAT or release.

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
- AI extraction/staging runtime is not implemented.
- Report Builder and internal work-order fallback are not implemented yet.
- Authentication is development-grade demo-header RBAC, not production auth.


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

This baseline hardens Sprint 7 without implementing API/API-ASME formulas, AI extraction runtime, report generation, RBI calculation, CMMS integration, or work-order integration.

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
