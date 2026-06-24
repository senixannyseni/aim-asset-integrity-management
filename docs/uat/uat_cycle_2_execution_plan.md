# UAT Cycle 2 Execution Plan - RC2 Runtime and Frontend Closure

## Purpose

UAT Cycle 2 verifies the stricter Release Candidate 2 controls after UAT Cycle 1 `PASS_WITH_LOCAL_FIXES`. The focus is runtime/API behavior and user-facing workflow closure, not merely static code presence.

## Source-of-Truth Constraints

- AIM remains the system of record.
- PostgreSQL stores final structured engineering data.
- Object storage stores original evidence files.
- AI output must remain staging-only until human review.
- AI must not approve engineering data, calculations, integrity decisions, issued reports, or work orders.
- n8n is orchestration only and must not write directly to PostgreSQL.
- External CMMS integration remains out of MVP scope.
- Internal AIM work order fallback must remain active.
- Do not invent API/API-ASME formulas or reproduce copyrighted standard clauses.

## Scope

| Area | UAT Cycle 2 Goal |
|---|---|
| JWT/RBAC | Frontend and API use real bearer token flow by default. |
| Evidence | Evidence can be linked directly to calculation_run, integrity_decision, and report. |
| Integrity Decision | Approval is blocked without direct evidence and succeeds after direct evidence link. |
| Report Issue | Final issue is blocked unless report, calculation_run, and approved integrity_decision each have direct evidence. |
| NDT | Invalid extraction_source returns controlled 400 validation. |
| FFS/RBI | UUID and text run_id calculation lookup do not produce database operator errors. |
| Work Orders | Internal AIM work order fallback works; External CMMS is rejected. |
| Frontend | Gate failures, missing evidence, RBAC denial, and locked issued report states are visible. |

## Entry Criteria

- Branch created from latest `phase2-3-uat-signoff` or RC2 hardening branch.
- `pnpm --filter @aim/api typecheck` passes.
- `pnpm --filter @aim/api test` passes.
- `pnpm --filter @aim/web typecheck` passes when frontend changes are included.
- Seeded UAT dataset is available.

## Exit Criteria

- UAT Cycle 2 runtime regression scripts completed.
- Frontend walkthrough completed for engineer and senior engineer personas.
- AI/service-user approval and finalization denials are confirmed.
- Report issue succeeds only after per-entity evidence gates pass.
- Internal work order fallback is created and closed through authorized role.
- Residual risks are documented for go/no-go.

## Result Classification

- PASS: all critical source-of-truth controls pass without local hotfix.
- PASS_WITH_LOCAL_FIXES: controls pass after local fixes that are committed and pushed.
- FAIL: any source-of-truth governance rule is bypassed or cannot be validated.
