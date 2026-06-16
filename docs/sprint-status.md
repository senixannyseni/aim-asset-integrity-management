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

## Boundary

AIM remains the system of record. n8n may call AIM APIs only and must not write directly to PostgreSQL. AI output remains staging-only when implemented. AI cannot approve. No API/API-ASME formula expression or copyrighted standard clause text is embedded or executed. Sprint 6 executes only universal deterministic calculations and Formula Registry metadata lookups.

## Current Implemented Routes

- Assets and engineering master data: `/api/v1/assets`, `/api/v1/materials`, `/api/v1/assets/{assetId}/geometry`, `/api/v1/assets/{assetId}/shell-courses`
- Evidence Repository: `/api/v1/evidence`, `/api/v1/evidence/{evidenceId}/links`, `/api/v1/evidence/{evidenceId}/open`
- NDT Data Room: `/api/v1/ndt/measurements`, `/api/v1/ndt/measurements/bulk-import`, review and approval endpoints
- Engineering Validation: `/api/v1/engineering/data-dictionary`, `/api/v1/engineering/validate-input`
- Formula Registry: `/api/v1/formulas`, `/api/v1/formulas/approved/{formulaId}`, version/compare/approve/deprecate/test-run endpoints
- Deterministic Calculations: `/api/v1/engineering/calculate`, `/api/v1/engineering/calculations`
- Operations: `/api/v1/workflow-events`, `/api/v1/error-logs`

## Reproducibility Requirement

A clean checkout must contain and apply migrations `0001` through `0007` in order. Use:

```powershell
pnpm db:migrate
pnpm db:seed
pnpm lint
pnpm typecheck
pnpm test
```
