# Phase 2.2 UAT Defect Log Template

## 1. Purpose

This template standardizes how UAT defects are captured, triaged, fixed, retested, and closed during AIM Tank Integrity MVP release-candidate stabilization.

A defect record must preserve enough evidence to support controlled engineering governance, auditability, and release decision-making.

## 2. Defect Log Summary

| Field | Value |
|---|---|
| UAT Cycle |  |
| Environment |  |
| Build / Commit / Tag |  |
| Defect Log Owner |  |
| Review Date |  |
| Go/No-Go Impact |  |

## 3. Defect Record Template

| Field | Required | Value / Notes |
|---|---:|---|
| Defect ID | Yes | `UAT-DEF-0001` |
| Discovery Date | Yes | Date/time found |
| UAT Cycle | Yes | Cycle 1, Cycle 2, dry run, regression |
| Environment | Yes | local, UAT, release-candidate |
| Build / Commit / Tag | Yes | Git commit/tag under test |
| Test Case ID | Yes | UAT case ID or dry-run sequence number |
| Module | Yes | auth, evidence, AI extraction, calculation, report, work order, workflow, audit, etc. |
| Severity | Yes | blocker, critical, major, minor, cosmetic |
| Category | Yes | governance defect, data defect, test data issue, environment issue, functional defect, documentation defect |
| Title | Yes | Short defect title |
| Description | Yes | Detailed defect narrative |
| Steps to Reproduce | Yes | Numbered steps or command/API sequence |
| Expected Result | Yes | Expected behavior or gate result |
| Actual Result | Yes | Observed behavior |
| Evidence / Screenshot Link | Yes | Screenshot, terminal output, API response, or query result |
| Audit Log Reference | Conditional | Required for controlled actions or missing-audit defects |
| Workflow / Error Log Reference | Conditional | Required for n8n/workflow/error path defects |
| Owner | Yes | Responsible person/team |
| Status | Yes | new, triaged, in progress, fixed, retest ready, closed, deferred, rejected |
| Fix Commit | Conditional | Commit or PR reference when fixed |
| Retest Date | Conditional | Date retested |
| Retest Result | Conditional | pass, fail, blocked, not run |
| Closure Approval | Yes | UAT Lead / Product Owner / Lead Engineer as applicable |

## 4. Severity Definitions

| Severity | Definition | Release Impact |
|---|---|---|
| blocker | Prevents UAT continuation or violates a non-negotiable governance rule | No-Go |
| critical | Major workflow/gate failure with high integrity, audit, or security impact | No-Go until fixed or formally accepted as no-go |
| major | Important function or control fails but workaround may exist | Conditional Go only after approval |
| minor | Low-impact issue with clear workaround | May be deferred |
| cosmetic | Formatting/copy issue with no governance or operational impact | May be deferred |

## 5. Defect Categories

| Category | Description |
|---|---|
| governance defect | Breaks AIM source-of-truth, AI staging, review, evidence, calculation, report, work-order, n8n, or audit control |
| data defect | Synthetic UAT data missing, inconsistent, or incorrectly linked |
| test data issue | UAT seed or fixture does not support planned test |
| environment issue | Local/UAT environment, database, object storage placeholder, or service startup issue |
| functional defect | Expected implemented endpoint/behavior fails |
| documentation defect | Guide, procedure, checklist, or test instruction is incomplete or misleading |

## 6. Governance Defect Flag

Mark the governance defect flag as **Yes** when any of the following occurs or is suspected:

- Missing audit log.
- AI/n8n approval bypass.
- Report issued without gates.
- Evidence linkage bypass.
- Calculation without approved formula version.
- Work order closed without required note/evidence.
- n8n direct DB access suspicion.
- AI promoted final data.
- n8n writes final engineering data.
- External SAP/Maximo/CMMS integration is invoked during MVP UAT.

Governance defects must be reviewed by the UAT Lead and Lead Engineer before closure.

## 7. Triage Workflow

1. Log defect with required fields.
2. Classify severity.
3. Classify category.
4. Assign owner.
5. Reproduce using the same UAT seed and environment where possible.
6. Attach evidence and relevant audit/workflow/error log references.
7. Fix or document accepted limitation.
8. Retest.
9. Close only after closure approval.
10. Preserve audit trail and do not delete defect history.

## 8. Retest Rules

A defect may be retested only when:

- fix commit or documented configuration correction is available;
- environment baseline is recorded;
- impacted UAT cases are identified;
- audit/workflow/error logs are preserved;
- no production or real client data is used.

## 9. Closure Approval

Closure approval requires:

- retest result = pass, rejected, or formally deferred;
- evidence/screenshot link attached;
- fix commit recorded where applicable;
- UAT Lead approval;
- Lead Engineer approval for governance defects;
- Product Owner approval for deferred major defects.

