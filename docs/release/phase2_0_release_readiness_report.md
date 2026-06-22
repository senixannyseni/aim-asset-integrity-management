# AIM Phase 2.0 Release Readiness Report

**Sprint:** Phase 2.0 — MVP Release Readiness Pack  
**Baseline:** After Phase 1 Governance Closure / Phase 1.7 final reconciliation  
**Status:** Release-readiness documentation and static test pack prepared for local/UAT validation.

## 1. Sprint Objective

Prepare the Phase 1 Governance Closure baseline for controlled developer handoff, UAT execution, deployment rehearsal, training, migration validation, and go-live readiness.

Phase 2.0 is documentation-first and readiness-test focused. It does not add new functional business modules and does not alter Phase 1 governance behavior.

## 2. Source-of-Truth Basis

Phase 2.0 addresses execution-critical gaps identified in the source-of-truth package:

- UAT scripts,
- deployment runbook,
- sample dataset,
- training pack,
- migration plan,
- go-live checklist.

The following non-negotiable rules remain preserved:

- AIM is the system of record.
- PostgreSQL stores final structured engineering data.
- Object storage stores original evidence files.
- n8n is workflow orchestration only and must call AIM backend APIs only.
- n8n must not write directly to PostgreSQL.
- AI extraction output goes to extraction/staging entities only.
- AI must not approve engineering data, calculations, integrity decisions, work orders, or reports.
- Engineer review is mandatory before staging data is promoted.
- Calculation engine must be deterministic, testable, versioned, and auditable.
- No API/ASME formulas may be invented or copied from standards.
- Evidence linkage is mandatory for findings, NDT measurements, calculations, integrity decisions, reports, manual overrides, and work orders where applicable.
- Report issue is blocked unless all required gates pass.
- Internal AIM work order fallback is required before external CMMS integration.
- Every approval, rejection, correction, calculation, report issue, work order action, workflow failure, and evidence action must be auditable.

## 3. Changed Files

Phase 2.0 adds the following release-readiness files:

| File | Purpose |
|---|---|
| `docs/uat/uat_scripts.md` | UAT execution scripts for the complete controlled MVP journey. |
| `docs/uat/uat_traceability_matrix.md` | Maps UAT cases to source requirements, modules, roles, endpoints, tables, and audit expectations. |
| `docs/sample_data/sample_dataset_manifest.md` | Synthetic-only UAT sample data manifest. |
| `docs/deployment/deployment_runbook.md` | Local/UAT deployment rehearsal, test, smoke, rollback, and troubleshooting guide. |
| `docs/deployment/migration_plan.md` | Clean DB setup, upgrade path, validation checks, rollback, and acceptance criteria. |
| `docs/deployment/go_live_checklist.md` | Governance, technical, security, UAT, operational, and sign-off checklist. |
| `docs/training/user_training_pack.md` | Role-based training and operating guide. |
| `docs/release/phase2_0_release_readiness_report.md` | This readiness summary report. |
| `apps/api/tests/phase2-0-release-readiness.test.ts` | Static validation test for required Phase 2.0 readiness deliverables. |

## 4. Deliverables Created

### 4.1 UAT Pack

Created:

- `docs/uat/uat_scripts.md`
- `docs/uat/uat_traceability_matrix.md`

Coverage includes:

- auth/RBAC,
- asset and inspection setup,
- evidence governance,
- AI extraction and staging,
- human review and manual override,
- NDT/reviewed data path,
- calculation governance,
- integrity decision,
- report approval and issue gates,
- internal work order fallback,
- n8n workflow/error boundary,
- audit verification.

### 4.2 Sample Dataset Manifest

Created:

- `docs/sample_data/sample_dataset_manifest.md`

The manifest defines synthetic-only UAT data for:

- users/roles,
- atmospheric storage tank asset,
- inspection,
- evidence metadata placeholders,
- evidence links,
- extraction job and fields,
- staging record,
- manual override,
- data quality check,
- formula version fixture reference,
- calculation validation cases,
- integrity decision,
- report lifecycle,
- internal work order,
- workflow event and error log samples.

No SQL seed is added in Phase 2.0. This avoids accidental data insertion before local/UAT schema verification.

### 4.3 Deployment Runbook

Created:

- `docs/deployment/deployment_runbook.md`

Coverage includes:

- purpose and audience,
- prerequisites,
- environment variables,
- local startup sequence,
- test commands,
- deployment sequence,
- smoke tests,
- rollback,
- troubleshooting.

### 4.4 Migration Plan

Created:

- `docs/deployment/migration_plan.md`

Coverage includes:

- expected migration baseline through Phase 1 Governance Closure,
- clean DB setup,
- upgrade from Phase 1.6/1.7 baseline to Phase 2.0,
- validation queries/checks,
- rollback and restore,
- migration acceptance criteria.

### 4.5 Go-Live Checklist

Created:

- `docs/deployment/go_live_checklist.md`

Coverage includes:

- governance readiness,
- technical readiness,
- security readiness,
- UAT readiness,
- operational readiness,
- sign-off roles,
- no-go conditions.

### 4.6 Training Pack

Created:

- `docs/training/user_training_pack.md`

Coverage includes practical instructions for:

- Admin,
- Inspector,
- Engineer,
- Lead Engineer,
- Approver,
- IT Admin,
- Management.

## 5. UAT Coverage Summary

| Area | Coverage Status | Notes |
|---|---|---|
| Auth/RBAC | Covered | Login, logout, refresh/me, unauthenticated/unauthorized blocks, demo auth boundary. |
| Asset/inspection setup | Covered | Asset and inspection create/retrieve workflow. |
| Evidence governance | Covered | Evidence metadata, validation, signed URL, audit, deletion block, malware placeholder. |
| AI extraction/staging | Covered | Extraction job, staging-only output, confidence/validation flags, AI action block. |
| Human review/manual override | Covered | Approve/correct/reject/promote with evidence and reason. |
| NDT/reviewed data path | Partial/Covered by current API capability | Script verifies evidence/review requirement where current route supports it. |
| Calculation governance | Covered | Approved formula version, no default, snapshots, warnings, disclaimer, edge cases. |
| Integrity decision | Covered | Human-only decision and approval with comment/SoD controls. |
| Report issue gates | Covered | Gate checklist, blocked issue, legacy tokens, service-user blocks. |
| Internal work orders | Covered | Create/update/close, completion note/evidence, internal fallback only. |
| n8n workflow/error boundary | Covered | API-only workflow events, error logs, no final action by n8n. |
| Audit logs | Covered | Critical actions and read permissions. |

## 6. Deployment Readiness Summary

The deployment runbook is ready for local/UAT rehearsal. It includes:

- environment variable checklist,
- local Docker/PostgreSQL startup,
- migration/seed sequence,
- test commands,
- health/login smoke tests,
- object storage and signed URL checks,
- workflow/error smoke tests,
- report/work-order gate smoke checks,
- rollback and troubleshooting.

Production deployment still requires environment-specific infrastructure/security review.

## 7. Migration Readiness Summary

The migration plan is ready for clean database rehearsal. It confirms:

- current migration baseline,
- no new Phase 2.0 schema migration expected,
- migrations must be run by AIM/operator, not n8n,
- clean DB and upgrade path checks,
- validation queries for required tables, permissions, roles, calculation/report/work-order entities,
- rollback/restore procedure.

## 8. Training Readiness Summary

The training pack is role-based and practical. It explains:

- AI is staging assistance only,
- AI confidence is not approval,
- evidence linkage is mandatory,
- calculations require explicit approved formula version,
- engineering review disclaimer must remain visible,
- report issue gates must pass,
- n8n is orchestration only,
- internal work orders are fallback only,
- audit logs are expected for controlled actions.

## 9. Go-Live Readiness Summary

The go-live checklist is ready for controlled UAT or MVP release rehearsal. It includes:

- governance readiness,
- technical readiness,
- security readiness,
- UAT readiness,
- operational readiness,
- sign-off roles,
- no-go conditions.

This does not by itself authorize production go-live. Production go-live requires executed UAT, resolved critical defects, environment hardening, security acceptance, and formal sign-off.

## 10. Tests to Run

Recommended validation commands:

```powershell
pnpm --filter @aim/api typecheck
pnpm --filter @aim/api test -- tests/phase2-0-release-readiness.test.ts
pnpm --filter @aim/api test -- tests/phase1-7-governance-closure.test.ts
pnpm --filter @aim/api test -- tests/phase1-4-openapi-contract.test.ts
pnpm --filter @aim/api test -- tests/migration-sequence.test.ts
pnpm --filter @aim/api test
pnpm db:migrate
pnpm db:seed
```

## 11. Remaining Gaps

| Gap | Status | Recommended Owner |
|---|---|---|
| UAT scripts must be executed and signed off. | Open | UAT Lead, Lead Engineer, Approver. |
| Clean DB migration rehearsal must be performed locally/UAT. | Open | DevOps / IT Admin. |
| Object storage/signed URL must be verified in target environment. | Open | IT Admin / DevOps. |
| Production secrets management must be configured outside repo. | Open | Security Owner / DevOps. |
| Security testing and penetration review are not included in Phase 2.0. | Future | Security Owner. |
| Frontend implementation/prototype remains outside this sprint. | Future | Product Owner / Frontend team. |
| External CMMS integration remains outside MVP. | Future | Product Owner / Integration team. |

## 12. Explicit Out-of-Scope Confirmation

Phase 2.0 does not implement:

- full API 579 implementation,
- full API 581 implementation,
- SAP/Maximo/CMMS integration,
- 3D processing,
- frontend UI implementation,
- invented API/ASME formulas,
- production security hardening such as SSO, SIEM, WAF, DLP, or penetration remediation,
- real client dataset import.

Mentions of these topics are only boundary rules, out-of-scope confirmations, placeholders, or future items.

## 13. Recommended Next Sprint

Recommended next sprint:

**Phase 2.1 — Controlled UAT Dataset and UAT Execution Support**

Scope should include:

- optional safe UAT sample seed after local schema verification,
- UAT execution evidence template,
- defect triage register,
- smoke-test automation where practical,
- local object storage test fixture setup,
- API smoke collection for auth/evidence/extraction/calculation/report/work-order paths.

Do not proceed to major new business functionality until Phase 2.0 artifacts are reviewed and the UAT path is executable.


## Phase 2.1 Follow-Up: Controlled UAT Execution Support

Phase 2.1 adds controlled UAT execution support on top of the Phase 2.0 readiness pack:

- `db/seeds/0002_uat_sample_data.sql` provides synthetic local/UAT seed data only.
- `docs/sample_data/uat_seed_execution_guide.md` explains how to apply and validate the seed in local/UAT only.
- `docs/uat/uat_execution_results_template.md` provides pass/fail/blocked/not-run tracking, defect references, audit references, and sign-off fields.
- `docs/uat/uat_smoke_test_guide.md` provides PowerShell-oriented smoke checks.
- `docs/uat/uat_defect_triage_guide.md` defines severity, governance defect handling, retest, and closure criteria.

The UAT seed remains synthetic and local/UAT only. Production use requires operator approval, environment confirmation, backup/restore readiness, and Product Owner / Lead Engineer / IT Admin sign-off. The follow-up does not add external CMMS, full API 579/API 581, 3D processing, frontend UI, or invented API/ASME formula implementation.

## Phase 2.1 Follow-Up

Phase 2.1 created controlled UAT execution support, including a synthetic and local/UAT only seed, UAT execution guide, smoke test guide, defect triage guide, and UAT result template.

The UAT seed is synthetic and local/UAT only. Production use requires operator approval.

Boundary confirmation:

- no external CMMS
- no invented API/ASME formula implementation
- no full API 579 implementation
- no full API 581 implementation
- no SAP/Maximo/CMMS integration
- no 3D processing
- no frontend UI implementation