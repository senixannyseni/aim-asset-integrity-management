# UAT Defect Triage Guide

## 1. Purpose

This guide defines how AIM UAT defects are classified, triaged, fixed, retested, and closed. It gives special priority to governance defects because AIM is an engineering-controlled, evidence-linked, audit-first system.

## 2. Defect Categories

| Category | Meaning | Example |
|---|---|---|
| blocker | UAT cannot continue | login unavailable, migrations fail, API unavailable |
| critical | high-risk business/governance failure | report issued without gates, missing audit log |
| major | core workflow impaired but workaround exists | staging review list unavailable for one role |
| minor | limited impact | confusing message, non-critical field label |
| cosmetic | visual/copy issue only | typo in training guide |
| governance defect | control failure affecting source-of-truth rules | AI promoted final data, n8n direct DB access |
| data defect | sample data or migration issue | seed missing formula version fixture |
| test data issue | UAT data incomplete or wrong | evidence placeholder missing checksum |
| environment issue | infrastructure/configuration problem | object storage endpoint not configured |

## 3. Severity Rules

A defect is at least critical when it affects:

- AI staging-only enforcement;
- human review before promotion;
- evidence linkage gates;
- explicit approved formula version requirement;
- report issue gates;
- internal work order close gate;
- RBAC/segregation-of-duty;
- immutable audit trail;
- n8n no-direct-DB boundary.

## 4. Triage Workflow

1. Log defect with test case ID, environment, build/commit/tag, role used, screenshots/evidence, API response, and expected result.
2. Classify severity and category.
3. Assign owner: Developer, Lead Engineer, IT Admin, Product Owner, or UAT Lead.
4. Reproduce in local or UAT environment.
5. Identify whether it is code, configuration, migration, sample data, documentation, or environment issue.
6. Fix through controlled branch and PR.
7. Rerun targeted test.
8. Retest original UAT case.
9. Close only after evidence, audit references, and reviewer sign-off are captured.
10. Preserve audit trail and defect history.

## 5. Governance Defect Special Handling

Immediately escalate the following as governance defects:

| Governance Defect | Required Action |
|---|---|
| AI promoted final data | Stop UAT path, preserve evidence, open critical defect, block release. |
| Missing audit log | Identify missing event, block affected workflow, require fix before go-live. |
| Report issued without gates | Treat as critical release blocker; verify `REPORT_ISSUE_BLOCKED` behavior. |
| Evidence deletion bypassed | Block release; verify linked evidence deletion restrictions. |
| n8n direct DB access | Stop workflow integration; remove DB credential; require boundary review. |
| Calculation run without approved formula version | Block calculation approval; verify formula registry and route validation. |
| Work order closed without required note/evidence | Block release; verify close endpoint gate and audit event. |

## 6. Defect Register Template

| Defect ID | Test Case ID | Severity | Category | Summary | Owner | Status | Retest Result | Closure Evidence |
|---|---|---|---|---|---|---|---|---|
| AIM-UAT-DEF-001 |  | blocker/critical/major/minor/cosmetic | governance/data/test data/environment |  |  | open/fixing/retest/closed | pass/fail |  |

## 7. Status Definitions

| Status | Meaning |
|---|---|
| open | defect logged and awaiting triage |
| triaged | severity/category/owner assigned |
| fixing | owner is preparing fix |
| ready for retest | fix merged/deployed to UAT |
| retest failed | defect persists |
| closed | tester and reviewer sign-off complete |
| deferred | accepted as known limitation by Product Owner and Lead Engineer |

## 8. Go/No-Go Impact

A no-go recommendation is required when any of the following remain open:

- blocker defect;
- critical governance defect;
- missing audit for controlled actions;
- report issue gate bypass;
- calculation formula version bypass;
- evidence deletion bypass;
- n8n direct database access;
- seeded data suspected to contain real or confidential data.

## 9. Closure Criteria

A defect may be closed only when:

- targeted fix is merged;
- targeted test passes;
- original UAT case is retested;
- evidence/screenshot link is attached;
- audit/workflow/error log reference is captured where applicable;
- reviewer sign-off is recorded.
