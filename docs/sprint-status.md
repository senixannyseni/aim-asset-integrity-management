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

## Boundary

AIM remains the system of record. n8n may call AIM APIs only and must not write directly to PostgreSQL. AI output remains staging-only when implemented. AI cannot approve. No API/API-ASME formula expression or copyrighted standard clause text is embedded or executed. Sprint 6 executes only universal deterministic calculations and Formula Registry metadata lookups. Sprint 7 creates FFS trigger workflow cases only; it does not execute FFS calculations or declare fitness for service. Sprint 8 creates RBI interface workflow cases only; it does not implement proprietary quantitative API RP 581 rules.

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
