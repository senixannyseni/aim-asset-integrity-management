# Phase 2.3 UAT Cycle 1 Execution Plan

**Status:** Template / pending execution  
**Scope:** Controlled UAT execution only  
**Data rule:** Synthetic UAT data only  
**Governance rule:** This document does not claim UAT has passed. Actual pass/fail status must be filled only after evidence is produced by the UAT team.

## 1. Purpose

This plan defines how the team executes UAT Cycle 1 for AIM Tank Integrity MVP after Phase 2.2 release-candidate stabilization. The plan converts the Phase 2.0 readiness pack, Phase 2.1 controlled UAT dataset, and Phase 2.2 dry-run controls into a formal UAT cycle.

The purpose is to confirm that the controlled MVP workflow can be exercised by authorized roles while preserving these boundaries:

- AIM remains the system of record.
- PostgreSQL stores final structured engineering data through AIM backend services only.
- Object storage stores original evidence files; UAT may use metadata placeholders.
- n8n is workflow orchestration only and must call AIM backend APIs only.
- AI extraction output remains extraction/staging data until human review.
- AI and n8n must not approve, promote, issue, close, or finalize engineering records.
- Calculations must use explicit approved formula versions only.
- Evidence linkage, audit logs, report gates, and internal work order controls must remain enforced.

## 2. UAT Cycle Scope

UAT Cycle 1 covers the controlled end-to-end AIM MVP path using synthetic sample data and non-production credentials managed outside this repository.

Covered modules:

| Module | UAT objective |
|---|---|
| auth/RBAC | Verify login, auth/me, permission boundaries, denied actions, and service-user restrictions. |
| asset and inspection setup | Verify sample atmospheric storage tank asset and inspection workspace are usable for UAT. |
| evidence metadata and linkage | Verify metadata registration, linkage, placeholder evidence handling, and evidence gate behavior. |
| AI extraction/staging review | Verify extraction and staging remain non-final until reviewed. |
| manual override | Verify corrections require reason, reviewer, evidence reference, and audit trace. |
| NDT/reviewed measurement path | Verify reviewed measurement path and evidence dependency where supported by current API. |
| calculation governance | Verify explicit approved formula version, snapshots, warnings, blockers, and required disclaimer. |
| integrity decision | Verify human decision flow, approval boundary, and audit trace. |
| report issue gates | Verify blocked and allowed report issue behavior according to gates. |
| internal work order fallback | Verify internal work order create/update/close path and closure requirements. |
| workflow/error logs | Verify workflow event and error log records exist for orchestration/recovery checks. |
| audit logs | Verify controlled actions are auditable and read access is permission-gated. |

Out of scope for UAT Cycle 1:

- Full API 579 implementation.
- Full API 581 implementation.
- External SAP/Maximo/CMMS integration.
- 3D processing.
- Frontend UI implementation.
- Invented API/ASME formulas.
- Real client data or confidential evidence files.

## 3. Environment Assumptions

| Item | Assumption |
|---|---|
| Environment | Local or isolated UAT environment only. |
| Dataset | `db/seeds/0002_uat_sample_data.sql`, synthetic only. |
| Evidence | Placeholder metadata only unless non-confidential test files are provided. |
| Secrets | Managed via local/UAT environment variables only; never committed. |
| n8n | Boundary validation uses AIM API workflow/error event records; no direct PostgreSQL access. |
| Object storage | Non-production bucket or placeholder object storage metadata. |
| UAT evidence | Stored outside source control under the evidence package convention. |

## 4. Branch / Tag / Build Baseline

Record before execution:

| Field | Value |
|---|---|
| Source branch | `<branch>` |
| Release candidate tag | `<tag or pending>` |
| Commit SHA | `<commit>` |
| Build identifier | `<build>` |
| API package version | `<version>` |
| UAT cycle | `UAT-CYCLE-1` |

The UAT Lead must confirm that the working tree is clean and that the release candidate branch/tag matches the go/no-go decision template.

## 5. Entry Criteria

UAT Cycle 1 may start only when all entry criteria are met:

| Entry criterion | Required evidence |
|---|---|
| Phase 1 governance tests pass | Test output reference. |
| Phase 2.0 readiness test passes | Test output reference. |
| Phase 2.1 UAT support test passes | Test output reference. |
| Phase 2.2 release-candidate stabilization test passes | Test output reference. |
| Full API test suite passes | Test output reference or approved exception. |
| Clean database migration completed | Migration log reference. |
| Foundation seed completed | Seed log reference. |
| UAT sample seed loaded in local/UAT only | UAT seed log reference. |
| UAT accounts/roles prepared | Account/role checklist reference. |
| UAT defect log is ready | Defect log location. |
| Smoke-test evidence checklist is ready | Checklist location. |
| No blocker, critical, or governance defect is open before execution | Defect log review. |

## 6. Roles and Responsibilities

| Role | Responsibility |
|---|---|
| Product Owner | Confirms scope, accepts business risk, and participates in go/no-go decision input. |
| UAT Lead | Coordinates UAT Cycle 1, assigns cases, controls evidence package, and runs defect triage routine. |
| Inspector | Executes inspection and evidence-related UAT cases. |
| Engineer | Executes AI extraction/staging review, manual override, NDT/reviewed measurement, and calculation checks. |
| Lead Engineer | Reviews engineering governance outcomes, stop-the-line conditions, and unresolved engineering defects. |
| Approver | Executes report issue gate checks and approval-boundary checks. |
| IT Admin / DevOps | Runs migration/seed, validates environment, and monitors workflow/error/audit infrastructure. |
| Security Owner if applicable | Reviews RBAC, secrets, service-user restrictions, and evidence access controls. |

## 7. Required UAT Accounts

UAT Cycle 1 requires role-appropriate accounts for Admin, Inspector, Engineer, Lead Engineer, Approver, IT Admin / DevOps, UAT Lead, and Security Owner if applicable. Service users for AI and n8n may be used only to verify that non-human actors cannot approve, promote, issue, close, or finalize engineering records.

## 8. Required Synthetic UAT Data

Required synthetic UAT data comes from the controlled UAT sample seed and its manifest. It must include the sample tank asset, inspection, evidence placeholders, evidence links, extraction/staging examples, manual override example, calculation fixture references, integrity decision precondition, report lifecycle precondition, internal work order sample, workflow event sample, error log sample, and audit log sample.

## 9. Environment Prerequisites

Before execution:

1. Confirm local/UAT environment is not connected to production services.
2. Confirm no production object storage bucket is configured.
3. Confirm no real client data is loaded.
4. Confirm no direct PostgreSQL credential is configured in n8n.
5. Confirm API health endpoint is reachable.
6. Confirm environment variables are loaded from local/UAT secure configuration.
7. Confirm audit, workflow event, and error log tables are available.
8. Confirm UAT evidence package folder exists.

## 7. Database Migration / Seed Prerequisite

The operator must run or verify:

```powershell
pnpm db:migrate
pnpm db:seed
psql $env:DATABASE_URL -f .\db\seeds\0002_uat_sample_data.sql
```

Do not paste database URLs or credentials into UAT evidence. Store only sanitized command output and pass/fail status.

## 8. UAT Seed Loading Prerequisite

The UAT sample seed must be applied only to local/UAT databases. The seed is synthetic and must remain separate from production.

Expected seed coverage:

- synthetic role/account references;
- one atmospheric storage tank asset;
- one inspection;
- placeholder evidence metadata;
- evidence links;
- extraction job and extraction fields;
- staging record and manual override scenario;
- data quality check;
- formula/calculation fixture references;
- integrity decision precondition;
- report lifecycle precondition;
- internal work order sample;
- workflow event, error log, and audit log sample references.

## 9. Role / Account Prerequisite

Each UAT participant must use a role-appropriate account. Shared accounts are discouraged.

| Role | Required for |
|---|---|
| Admin | User/role/readiness checks where applicable. |
| Inspector | Evidence and inspection tasks. |
| Engineer | AI staging review, manual override, calculation run/review. |
| Lead Engineer | Escalation, calculation/integrity readiness checks. |
| Approver | Report issue and formal approval checks. |
| IT Admin / DevOps | Migration, seed, workflow/error monitoring, environment checks. |
| UAT Lead | Coordination, defect triage, evidence package control. |
| Security Owner if applicable | Security/governance sign-off review. |

## 10. Dry-Run Prerequisite

The Phase 2.2 UAT dry-run procedure must be executed or formally waived before UAT Cycle 1. Any dry-run defect that affects governance, audit, evidence linkage, report gates, calculation formula control, or n8n boundary must be closed or formally accepted before Cycle 1 starts.

## 11. UAT Execution Sequence

Execute the following sequence. Record each case result in `docs/uat/uat_execution_results_template.md` or the active UAT management system.

| Step | Area | Required checks |
|---:|---|---|
| 1 | auth/RBAC | Login, auth/me, logout, denied action, role boundary, service user restriction. |
| 2 | asset and inspection setup | Sample asset visible, inspection workspace available, role permission verified. |
| 3 | evidence metadata and linkage | Evidence metadata registered, link created, unsupported access blocked. |
| 4 | AI extraction/staging review | Extraction job visible, low confidence routed, AI output not final. |
| 5 | manual override | Correction requires reason, evidence reference, and audit trace. |
| 6 | NDT/reviewed measurement path | Reviewed measurement path and evidence dependency checked. |
| 7 | calculation governance | Approved formula version explicit, snapshots captured, disclaimer retained. |
| 8 | integrity decision | Human decision flow checked; AI/n8n/service users blocked. |
| 9 | report issue gates | Missing gate blocks issue; satisfied gates allow issue only by authorized human. |
| 10 | internal work order fallback | Create/update/close internal work order; completion note/evidence rule checked. |
| 11 | workflow/error logs | Workflow event and error log behavior checked. |
| 12 | audit logs | Controlled actions have audit references; audit read permission enforced. |

## 12. Daily Execution Routine

For each UAT day:

1. UAT Lead confirms environment availability.
2. IT Admin / DevOps confirms API health, DB connectivity, and no unsafe integration configuration.
3. Testers execute assigned cases.
4. Testers capture evidence artifacts and references.
5. Defects are logged within the same day.
6. Governance defects are triaged immediately.
7. End-of-day summary records executed, passed, failed, blocked, and not run cases.
8. UAT Lead updates go/no-go inputs and open-risk list.

## 13. Defect Triage Routine

Each defect must be reviewed by severity and category:

- blocker;
- critical;
- major;
- minor;
- cosmetic;
- governance defect;
- data defect;
- test data issue;
- environment issue.

Triage workflow:

1. Log defect with test case ID and evidence reference.
2. Assign severity/category.
3. Assign owner.
4. Reproduce or mark as not reproducible with reason.
5. Fix or document accepted risk.
6. Retest.
7. Close only after retest evidence is attached.
8. Preserve audit trail for governance-related fixes.

## 14. Evidence Capture Requirements

For every executed case, capture:

- test case ID;
- tester and role;
- timestamp;
- command/API/page reference;
- expected result;
- actual result;
- screenshot or API response reference;
- audit log reference where applicable;
- workflow event reference where applicable;
- error log reference where applicable;
- defect ID if failed or blocked;
- reviewer initials.

Evidence artifacts must not contain secrets, real client data, production object storage paths, or confidential evidence files.

## 15. Audit / Workflow / Error Log Evidence Requirements

| Evidence type | Minimum requirement |
|---|---|
| Audit log | Required for approval, rejection, correction, promotion, calculation, report issue, and work order action. |
| Workflow event | Required for n8n/orchestration boundary checks and workflow state changes. |
| Error log | Required for failed workflow, blocked gate, failed extraction, and recoverable/rejected failure paths. |

## 16. Stop-the-Line Governance Conditions

Immediately pause affected UAT execution and escalate when any condition appears:

- AI/n8n approval bypass is observed.
- Report can be issued without required gates.
- Staging can promote without engineer review.
- Calculation can run or approve without explicit approved formula version.
- Evidence linkage can be bypassed for required engineering record.
- Audit log missing for a controlled action.
- n8n direct DB access suspicion exists.
- Internal work order can close without required note/evidence.
- Secret or production credential appears in repository or evidence package.
- Unexpected implementation claim appears for full API 579, full API 581, external CMMS, 3D processing, frontend UI, or invented formula.

## 17. Pass / Fail Decision Criteria

| Result | Criteria |
|---|---|
| Pass | Expected result observed, required evidence captured, and audit/workflow/error references recorded where applicable. |
| Fail | Expected result not observed, governance rule broken, or required evidence cannot be produced. |
| Blocked | Environment/test data dependency prevents execution. |
| Not run | Case intentionally deferred with documented reason. |

## 18. Exit Criteria

UAT Cycle 1 can exit only when:

- all planned cases are executed or formally marked not run with reason;
- all blocker and critical defects are closed or no-go is recommended;
- all governance defects are closed or formally accepted by authorized owner with documented risk;
- evidence package is complete;
- UAT execution summary report is completed;
- sign-off register is prepared;
- go/no-go decision input is ready.

## 19. Go / No-Go Decision Input

UAT Lead prepares the following inputs for the release candidate go/no-go decision:

- case execution summary;
- defect summary by severity;
- governance defect summary;
- accepted risk list;
- audit/workflow/error log verification summary;
- evidence package location;
- sign-off status;
- recommendation: go, conditional go, or no-go.

## 20. Execution Status

This document is a plan/template. UAT Cycle 1 is **pending actual execution** until the UAT team supplies completed results and evidence.
