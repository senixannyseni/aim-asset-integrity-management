# Phase 2.2 UAT Dry-Run Procedure

## 1. Purpose

This procedure defines how the AIM Tank Integrity MVP release-candidate dry run is executed before formal UAT sign-off or go-live planning. It converts the Phase 2.0 readiness pack and Phase 2.1 controlled UAT dataset into a repeatable rehearsal.

The dry run must prove that the controlled path works end to end:

```text
asset / inspection context -> evidence metadata and linkage -> AI extraction staging -> human review -> manual override where required -> calculation governance -> integrity decision -> report issue gates -> internal work order fallback -> workflow/error logs -> audit logs
```

This procedure is documentation and execution support only. It does not add product features, does not implement frontend UI, does not implement full API 579, does not implement full API 581, does not implement SAP/Maximo/CMMS integration, does not implement 3D processing, and does not add invented API/ASME formulas.

## 2. Entry Criteria

The dry run may start only when all of the following are true:

| Entry Criterion | Required Evidence | Owner | Status |
|---|---|---|---|
| Source branch/tag baseline identified | Branch/tag/commit recorded in UAT results template | UAT Lead | Pending |
| Clean working tree confirmed | `git status` screenshot or command log | Developer | Pending |
| Phase 1 governance tests passed | Test output attached | Developer | Pending |
| Phase 2.0 readiness test passed | Test output attached | Developer | Pending |
| Phase 2.1 UAT support test passed | Test output attached | Developer | Pending |
| Full API test suite passed | Test output attached | Developer | Pending |
| Database migration completed in local/UAT | Migration log attached | IT Admin / DevOps | Pending |
| Foundation seed completed | Seed log attached | IT Admin / DevOps | Pending |
| UAT sample seed loaded in local/UAT only | UAT seed log attached | IT Admin / DevOps | Pending |
| UAT roles/accounts available | Role/account checklist completed | UAT Lead | Pending |
| No production credentials used | Environment review note attached | IT Admin / DevOps | Pending |

## 3. Environment Prerequisites

The dry-run environment must be isolated from production and must use synthetic/local UAT data only.

Required environment conditions:

- Node.js and pnpm installed according to the repository baseline.
- PostgreSQL reachable through the local/UAT environment variable.
- AIM API can start locally or in the UAT environment.
- Object storage references are metadata placeholders only unless a dedicated UAT object store is approved.
- No real client evidence files are required.
- No production object storage URI is used.
- No n8n PostgreSQL credentials exist.
- n8n, if used, calls AIM backend APIs only.

## 4. Branch / Tag Baseline

Record the dry-run baseline before starting:

```powershell
git branch --show-current
git rev-parse --short HEAD
git status
```

The dry run must not be conducted from a dirty working tree unless the UAT Lead explicitly records why.

## 5. Database Migration / Seed Prerequisite

Run in local/UAT only:

```powershell
pnpm db:migrate
pnpm db:seed
psql $env:DATABASE_URL -f .\db\seeds\0002_uat_sample_data.sql
```

Do not paste database usernames, passwords, or database connection strings into this document or into the UAT result record.

## 6. UAT Seed Loading Prerequisite

Before module dry run, confirm the Phase 2.1 UAT seed is loaded:

```sql
select count(*) as uat_assets from assets where asset_tag = 'AIM-UAT-T-001';
select count(*) as uat_evidence from evidence_files where storage_uri like 'uat-placeholder://%';
select count(*) as uat_work_orders from internal_work_orders where work_order_code like 'UAT-WO-%';
select count(*) as uat_audit from audit_logs where request_id like 'uat-%';
```

Expected result: each query returns one or more rows where the current schema supports the referenced entity.

## 7. Role / Account Prerequisite

The dry run requires role coverage for:

| Role | Purpose |
|---|---|
| Admin | User/role and system setup verification |
| Inspector | Inspection and evidence preparation |
| Engineer | AI staging review, manual override, calculation run/review |
| Lead Engineer | Escalation and engineering gate review |
| Approver | Report issue and controlled approval checks |
| IT Admin | Workflow/error/migration/operational checks |
| Management | Read-only dashboard/report visibility checks |
| AI/service user | Negative test: cannot approve/promote/issue/finalize |
| n8n service user | Negative test: workflow orchestration only |

## 8. Dry-Run Sequence by Module

| Sequence | Module | Dry-Run Action | Expected Evidence to Capture | Pass/Fail Decision Criteria |
|---:|---|---|---|---|
| 1 | auth/RBAC | Verify login, auth/me, logout, unauthorized request, and authenticated unauthorized request | API response log, screenshot, or terminal output | Auth succeeds for valid user and RBAC denial returns expected status |
| 2 | asset/inspection setup | Confirm sample atmospheric tank and inspection workspace exist | Query/API response showing `AIM-UAT-T-001` and UAT inspection | Asset and inspection are present and not production data |
| 3 | evidence metadata and linkage | Verify evidence metadata placeholders and evidence links | Query/API response and evidence link IDs | Evidence records use `uat-placeholder://` and required links exist |
| 4 | AI extraction/staging review | Verify extraction job, extraction fields, staging record, low confidence, missing evidence, unit mismatch | Extraction/staging API response or SQL query | AI output remains staging/review data only |
| 5 | manual override | Verify corrected field/manual override scenario | Manual override query/API response | Correction has reason, reviewer, original/corrected value, and evidence reference |
| 6 | NDT/reviewed measurement path | Verify NDT or reviewed measurement prerequisite where current API supports it | Measurement/evidence link query or documented partial result | Measurement data cannot be final without review/evidence gate |
| 7 | calculation governance | Verify explicit approved formula version, calculation fixture, disclaimer, warning/final-use blocker behavior | Calculation query/API response and warning/disclaimer capture | No silent formula selection; disclaimer retained |
| 8 | integrity decision | Verify decision sample/precondition and approval/rejection controls | Decision query/API response | AI/n8n/service users cannot approve decision |
| 9 | report issue gates | Verify report issue blocked when gates fail and success where gates pass | Report gate response with `REPORT_GATES_NOT_SATISFIED` or issue result | Report issue respects gates and issuer comment |
| 10 | internal work order fallback | Verify create/update/close path and closure controls | Work-order API response/query | Work order remains internal AIM fallback; no external CMMS invoked |
| 11 | workflow/error logs | Verify workflow event and error log records | Query/API response | Workflow failures are logged in AIM and n8n remains orchestration-only |
| 12 | audit logs | Verify audit records for critical actions | Audit query/API response | Audit logs exist and are read-only through public APIs |

## 9. Expected Evidence to Capture

For each dry-run item, capture at least one of:

- terminal output;
- API response body with request ID;
- screenshot from API client or UI where available;
- SQL query result from local/UAT only;
- audit log reference;
- workflow event reference;
- error log reference;
- defect ID if failed or blocked.

Do not capture secrets, tokens, database connection strings, production object storage paths, or real evidence files.

## 10. Pass / Fail Decision Criteria

| Result | Meaning |
|---|---|
| Pass | Expected result achieved and required evidence captured |
| Fail | Expected result not achieved or governance rule violated |
| Blocked | Environment, seed, account, or dependency prevents execution |
| Not Run | Case deferred with UAT Lead approval |

Any governance defect must be treated as at least major severity. The following are blocker or critical unless explicitly proven otherwise:

- AI/n8n/service user can approve, promote, issue, or finalize engineering data.
- Report is issued without required gates.
- Calculation runs for final use without explicit approved formula version.
- Evidence linkage is bypassed for controlled records.
- Work order closes without required completion note or closure evidence.
- n8n direct DB access is detected or suspected.
- Required audit log is missing for controlled action.

## 11. Defect Logging Rules

Every failed or blocked dry-run step must create a defect record using `docs/uat/uat_defect_log_template.md`.

A defect must include:

- defect ID;
- UAT cycle;
- environment;
- build/commit/tag;
- test case ID or dry-run sequence number;
- severity and category;
- expected result;
- actual result;
- reproduction steps;
- evidence/screenshot link;
- audit log reference where applicable;
- workflow/error log reference where applicable;
- owner;
- retest result;
- closure approval.

## 12. Go / No-Go Recommendation Rules

Recommend **No-Go** when any of the following is true:

- Any blocker defect remains open.
- Any critical governance defect remains open.
- Full API test suite fails.
- Migration from clean DB fails.
- UAT sample seed cannot be loaded in local/UAT.
- Report issue gates cannot be validated.
- Audit log coverage cannot be validated.
- Rollback plan is not confirmed.
- Required sign-offs are missing.

Recommend **Conditional Go** only when minor/major non-governance defects remain and Product Owner, Lead Engineer, Approver, and IT Admin explicitly accept the risk.

Recommend **Go** only when all entry criteria, dry-run sequence items, smoke evidence checklist, and sign-off roles are complete.

## 13. Exit Criteria

The dry run is complete only when:

- all planned dry-run steps are pass or formally dispositioned;
- blocker and critical defects are closed;
- governance defects are closed or converted to no-go items;
- smoke-test evidence checklist is complete;
- release candidate checklist is complete;
- release notes draft is reviewed;
- rollback plan is confirmed;
- sign-off roles are recorded.

