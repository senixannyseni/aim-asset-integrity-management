# Phase 2.2 Release Candidate Checklist

## 1. Purpose

This checklist determines whether the AIM Tank Integrity MVP baseline is stable enough to be treated as a release candidate after Phase 2.0 release readiness and Phase 2.1 controlled UAT execution support.

This checklist does not add new business functionality. It verifies readiness, dry-run evidence, defect closure, rollback, and sign-off.

## 2. Release Candidate Identification

| Item | Value |
|---|---|
| Source Branch / Tag Confirmed |  |
| Commit Hash |  |
| Release Candidate Name |  |
| UAT Cycle |  |
| Environment |  |
| Checklist Owner |  |
| Review Date |  |

## 3. Source and Build Gates

| Gate | Required Result | Evidence | Status |
|---|---|---|---|
| Source branch/tag confirmed | Branch/tag and commit recorded | `git branch --show-current`, `git rev-parse --short HEAD` | Pending |
| Clean working tree | No uncommitted/untracked release files | `git status` output | Pending |
| Typecheck passed | `pnpm --filter @aim/api typecheck` passes | Test output | Pending |
| Full tests passed | `pnpm --filter @aim/api test` passes | Test output | Pending |
| Phase 1 governance tests passed | Phase 1.7 and supporting governance tests pass | Test output | Pending |
| Phase 2.0 readiness tests passed | `phase2-0-release-readiness.test.ts` passes | Test output | Pending |
| Phase 2.1 UAT support tests passed | `phase2-1-uat-execution-support.test.ts` passes | Test output | Pending |
| Phase 2.2 release-candidate test passed | `phase2-2-release-candidate-stabilization.test.ts` passes | Test output | Pending |

## 4. Migration and Seed Gates

| Gate | Required Result | Evidence | Status |
|---|---|---|---|
| Migration from clean DB passed | All migrations apply from zero | Migration log | Pending |
| Foundation seed passed | Required roles/permissions/formula fixtures loaded | Seed log | Pending |
| UAT sample seed applied in local/UAT only | `0002_uat_sample_data.sql` applied to non-production only | UAT seed log | Pending |
| Seed passed | Validation queries return expected UAT records | Query output | Pending |
| No data-destructive migration introduced | No Phase 2.2 schema change or destructive migration | Git diff review | Pending |
| n8n has no direct DB credential | Config reviewed | IT Admin evidence | Pending |

## 5. UAT and Smoke Gates

| Gate | Required Result | Evidence | Status |
|---|---|---|---|
| Smoke tests passed | Smoke-test evidence checklist complete | `docs/uat/smoke_test_evidence_checklist.md` completed copy | Pending |
| UAT dry run completed | Dry-run procedure executed | Dry-run log | Pending |
| Auth/RBAC smoke passed | Login/auth/me/RBAC denial verified | Smoke evidence | Pending |
| Evidence smoke passed | Evidence metadata and link verified | Smoke evidence | Pending |
| AI staging smoke passed | Extraction/staging review path verified | Smoke evidence | Pending |
| Calculation smoke passed | Approved formula version and disclaimer verified | Smoke evidence | Pending |
| Report gate smoke passed | Blocked issue and gate success path verified where applicable | Smoke evidence | Pending |
| Internal work order smoke passed | Create/update/close controls verified | Smoke evidence | Pending |
| Workflow/error/audit smoke passed | Workflow, error, and audit records verified | Smoke evidence | Pending |

## 6. Defect Closure Gates

| Gate | Required Result | Evidence | Status |
|---|---|---|---|
| Critical/blocker defects closed | No open blocker or critical defect | Defect log | Pending |
| Governance defects closed | No open governance defect | Defect log and Lead Engineer approval | Pending |
| Major deferred defects approved | Product Owner and UAT Lead approval | Defect log | Pending |
| Retest complete | Fixed defects retested | Retest evidence | Pending |

## 7. Governance Boundary Gates

| Gate | Required Result | Evidence | Status |
|---|---|---|---|
| No out-of-scope implementation added | No full API 579, full API 581, external SAP/Maximo/CMMS integration, 3D processing, frontend UI implementation, or invented formulas | Static test output and code review | Pending |
| AIM system-of-record preserved | All final data changes through AIM backend | Review evidence | Pending |
| AI staging-only preserved | AI output remains extraction/staging only | UAT evidence | Pending |
| Human review preserved | Promotion/approval/issue gates require human authorization | UAT evidence | Pending |
| Evidence linkage preserved | Required evidence links verified | UAT evidence | Pending |
| Audit logging preserved | Critical actions create audit entries | UAT evidence | Pending |
| Rollback plan confirmed | Rollback steps reviewed | Deployment runbook reference | Pending |
| Release notes drafted | Candidate notes ready for review | Release notes draft | Pending |

## 8. Sign-Off Roles Completed

| Role | Name | Sign-Off | Date | Notes |
|---|---|---|---|---|
| Product Owner |  | Pending |  |  |
| Lead Engineer |  | Pending |  |  |
| Approver |  | Pending |  |  |
| IT Admin / DevOps |  | Pending |  |  |
| Security Owner |  | Pending |  |  |
| UAT Lead |  | Pending |  |  |

## 9. Release Candidate Decision

| Decision | Criteria |
|---|---|
| Go | All gates pass and all required sign-offs are complete |
| Conditional Go | Only non-governance minor/approved major defects remain and risk acceptance is signed |
| No-Go | Any blocker/critical/governance defect remains open, tests fail, migration fails, rollback is not confirmed, or sign-off is missing |

