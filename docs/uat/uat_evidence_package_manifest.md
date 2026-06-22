# Phase 2.3 UAT Evidence Package Manifest

**Status:** Template / pending evidence package  
**Purpose:** Define expected UAT evidence artifacts and naming conventions for controlled UAT Cycle 1.

## 1. Evidence Package Rule

UAT evidence artifacts must not contain secrets, real client data, production object storage paths, or confidential evidence files. Use sanitized screenshots, redacted API responses, and synthetic dataset references.

## 2. Folder Naming Convention

Use this folder naming convention outside source control:

```text
/uat_evidence/{cycle}/{date}/{artifact_type}/
```

Example:

```text
/uat_evidence/UAT-CYCLE-1/2026-06-23/test_outputs/
/uat_evidence/UAT-CYCLE-1/2026-06-23/audit_references/
/uat_evidence/UAT-CYCLE-1/2026-06-23/defects/
```

## 3. Expected Evidence Artifacts

| Artifact type | Expected content | Required? | Notes |
|---|---|---:|---|
| Test execution results | Completed UAT result template or exported test-management result. | Yes | Include pass/fail/blocked/not-run status. |
| Screenshots or API responses | Sanitized screenshots or API response extracts. | Yes | Do not include secrets or real client data. |
| Smoke-test evidence checklist | Completed `smoke_test_evidence_checklist.md`. | Yes | Include reviewer initials. |
| Defect log | Completed defect log with retest status. | Yes | Include governance defect flag where applicable. |
| Audit log exports/references | Audit IDs or sanitized exports for controlled actions. | Yes | Required for approval/rejection/correction/promote/calculation/report/work-order checks. |
| Workflow event references | Workflow event IDs for orchestration checks. | Conditional | Required when workflow scenario is executed. |
| Error log references | Error log IDs for blocked/failed/recovery paths. | Conditional | Required for negative tests and failure paths. |
| Migration/seed logs | Sanitized migration and seed command outputs. | Yes | Do not include connection strings. |
| Typecheck/test outputs | Typecheck and test output files or logs. | Yes | Include Phase 2.3 and full suite result. |
| Release candidate checklist | Completed checklist reference. | Yes | `docs/release/release_candidate_checklist.md`. |
| Sign-off register | Completed sign-off register. | Yes before Go. | `docs/uat/uat_signoff_register.md`. |
| Go/no-go decision | Completed decision template. | Yes before release. | `docs/release/release_candidate_go_no_go_decision.md`. |

## 4. Evidence Index Template

| Evidence ID | Artifact type | File/path/reference | Related UAT case | Reviewer | Notes |
|---|---|---|---|---|---|
| UAT-EVD-001 | Test execution results | `<path>` | `<case>` | `<initials>` |  |
| UAT-EVD-002 | Audit log reference | `<audit ID>` | `<case>` | `<initials>` |  |
| UAT-EVD-003 | Workflow event reference | `<workflow event ID>` | `<case>` | `<initials>` |  |
| UAT-EVD-004 | Error log reference | `<error log ID>` | `<case>` | `<initials>` |  |

## 5. Retention and Access

- Store the evidence package in a controlled UAT project location.
- Restrict access to UAT Lead, Product Owner, Lead Engineer, Approver, IT Admin / DevOps, and Security Owner if applicable.
- Keep raw secrets out of the package.
- Redact bearer tokens, cookies, database URLs, object storage keys, and production paths.
- Do not store original real inspection reports or confidential evidence in this UAT package.

## 6. Completion Criteria

The evidence package is complete when:

- all executed UAT cases have evidence references;
- all failed/blocked cases have defect references;
- governance tests have audit/workflow/error evidence where applicable;
- migration/seed/test logs are attached or referenced;
- release candidate checklist is complete;
- sign-off register is complete or explicitly pending;
- go/no-go decision template is complete or explicitly pending.
