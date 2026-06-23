# AIM Tank Integrity MVP — Phase 2 Release Candidate Notes Draft

## 1. Release Summary

This release-candidate draft summarizes the AIM Tank Integrity MVP baseline after Phase 1 Governance Closure, Phase 2.0 MVP Release Readiness Pack, Phase 2.1 Controlled UAT Dataset + UAT Execution Support, and Phase 2.2 UAT Dry Run / Defect Closure / Release Candidate Stabilization.

The candidate is intended for controlled UAT and release-candidate review. It is not a production go-live authorization by itself.

## 2. Included Phases

| Phase | Summary |
|---|---|
| Phase 1.1–1.7 | Governance closure: auth/RBAC, AI staging, evidence governance, calculation governance, report issue gates, internal work order fallback, final governance reconciliation |
| Phase 2.0 | Release readiness documents: UAT scripts, traceability matrix, deployment runbook, migration plan, go-live checklist, training pack, release readiness report |
| Phase 2.1 | Controlled synthetic UAT seed, UAT execution guide, UAT result template, smoke guide, defect triage guide, static validation test |
| Phase 2.2 | UAT dry-run procedure, defect log template, release candidate checklist, smoke-test evidence checklist, release notes draft, static stabilization test |

## 3. Governance Highlights

The release candidate preserves the following controls:

- AIM remains the system of record.
- PostgreSQL stores final structured engineering data.
- Object storage stores original evidence files.
- n8n remains orchestration only and must call AIM backend APIs only.
- AI extraction output remains extraction/staging data only.
- Engineer review remains mandatory before promotion.
- AI/n8n/service users must not approve, promote, issue, or finalize engineering data.
- Calculation use remains deterministic, versioned, testable, auditable, and based on approved MVP/test-fixture formula metadata only.
- The disclaimer `Engineering review required before final use.` must be retained on calculation outputs.
- Evidence linkage remains mandatory for controlled engineering records.
- Report issue remains blocked until required gates pass.
- Internal AIM work order remains the MVP fallback before any future external integration.
- Audit logs remain required for approvals, rejections, corrections, calculations, report issue, work-order actions, workflow failures, and evidence actions.

## 4. UAT Readiness

UAT readiness assets now include:

- UAT scripts.
- UAT traceability matrix.
- Synthetic sample dataset manifest.
- Controlled local/UAT seed.
- UAT seed execution guide.
- UAT execution results template.
- UAT smoke-test guide.
- UAT defect triage guide.
- UAT dry-run procedure.
- UAT defect log template.
- Smoke-test evidence checklist.
- Release candidate checklist.

## 5. Known Limitations

The release candidate remains limited to the approved atmospheric storage tank MVP. Known limitations:

- No full API 579 implementation is included.
- No full API 581 implementation is included.
- No SAP/Maximo/CMMS integration is included.
- No 3D processing is included.
- No frontend UI implementation is included in this release-candidate stabilization pack.
- No invented API/ASME formulas are included.
- Evidence files in the UAT seed are metadata placeholders only.
- The UAT seed must be applied only to local/UAT databases.
- Formal production go-live still requires operator approval, UAT sign-off, backup verification, and release-candidate checklist completion.

## 6. Out-of-Scope Confirmation

The following are explicitly out of scope for this release candidate:

- full API 579 implementation;
- full API 581 implementation;
- external SAP/Maximo/CMMS integration;
- 3D processing;
- frontend UI implementation;
- invented API/ASME formulas;
- production credentials, production object storage keys, or real client evidence.

Mentions of these topics in the repository are boundary, future, placeholder, negative-test, or out-of-scope statements only.

## 7. Deployment Notes

Deployment rehearsal must follow:

- `docs/deployment/deployment_runbook.md`
- `docs/deployment/migration_plan.md`
- `docs/deployment/go_live_checklist.md`
- `docs/release/release_candidate_checklist.md`

Required checks before a release-candidate decision:

```powershell
pnpm --filter @aim/api typecheck
pnpm --filter @aim/api test -- tests/phase2-2-release-candidate-stabilization.test.ts
pnpm --filter @aim/api test -- tests/phase2-1-uat-execution-support.test.ts
pnpm --filter @aim/api test -- tests/phase2-0-release-readiness.test.ts
pnpm --filter @aim/api test -- tests/phase1-7-governance-closure.test.ts
pnpm --filter @aim/api test
```

## 8. Rollback Note

Rollback must follow the deployment runbook and migration plan. If migration or UAT seed execution fails in a release-candidate rehearsal:

1. stop the API service;
2. restore the previous commit/image/container;
3. restore the database backup where required;
4. disable problematic workflow triggers;
5. verify health;
6. record the rollback in the defect log and release candidate checklist.

## 9. Recommended Next Action

Recommended next action after Phase 2.2:

```text
Phase 2.3 — Controlled UAT Execution and Release Candidate Sign-Off
```

Phase 2.3 should execute the dry run and smoke evidence checklist, close blocker/critical/governance defects, complete sign-offs, and decide go/no-go. It should not add new product scope unless a defect fix is explicitly approved.


## UAT Cycle 1 Release-Hardening Addendum

Controlled UAT Cycle 1 completed with result `PASS_WITH_LOCAL_FIXES` on branch `phase2-3-uat-signoff`.

Release hardening after UAT adds:

- Direct evidence-link enforcement before integrity decision approval.
- Per-entity evidence gates before report issue for the report, calculation run, and approved integrity decision.
- Resolution of prior `REPORT_ISSUE_GATE_BLOCKED` error logs after successful report issue.
- Controlled 400 validation for invalid NDT `extraction_source` values.
- Safe calculation read handling for UUID calculation IDs versus text run codes.
- Documentation reconciliation for `AUTH_JWT_SECRET`, `$token = $login.data.accessToken`, integrity decision audit event names, and external CMMS out-of-scope status.

External SAP/Maximo/CMMS integration remains out of MVP scope. Internal AIM work order fallback remains the MVP action path.

## RC2 Runtime and Frontend UAT Closure Addendum

This RC2 addendum adds runtime/front-end closure for UAT Cycle 2:

- FFS/RBI calculation-run lookup is UUID/text-aware to prevent PostgreSQL UUID/text operator errors.
- Frontend API client uses JWT bearer tokens by default and sends demo headers only when `NEXT_PUBLIC_AIM_DEMO_HEADERS_ENABLED=true`.
- New `/login`, `/integrity-decisions`, and `/work-orders` frontend workflows support governed UAT execution.
- Report UI exposes per-entity evidence gate actions for `report`, `calculation_run`, and `integrity_decision`.
- UAT Cycle 2 documents cover runtime regression, frontend walkthrough, and signoff checklist.

Source-of-truth boundaries remain unchanged: AI must not approve or finalize engineering outputs; n8n remains orchestration-only; External CMMS integration remains out of MVP scope; internal AIM work order fallback remains active.
