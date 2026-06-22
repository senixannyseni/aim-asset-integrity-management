# Phase 2.2 Smoke-Test Evidence Checklist

## 1. Purpose

This checklist defines the evidence that must be captured during release-candidate smoke testing for AIM Tank Integrity MVP. Each smoke item must record the command/API/page reference, expected result, evidence artifact to save, reviewer initials, and pass/fail result.

Do not capture tokens, credentials, database connection strings, production object storage paths, or real client evidence.

## 2. Evidence Capture Table

| ID | Smoke Area | Command / API / Page Reference | Expected Result | Evidence Artifact to Save | Reviewer Initials | Pass/Fail |
|---|---|---|---|---|---|---|
| SMK-001 | API health | `GET /api/health` or health route used by current API | API returns healthy status | Terminal/API client output |  |  |
| SMK-002 | Login / auth/me | `POST /api/auth/login`, then `GET /api/auth/me` using local/UAT credentials from environment variables | Login succeeds and current user/role is returned | API response with sensitive values redacted |  |  |
| SMK-003 | RBAC denied request | Attempt an action using a role without permission | API returns forbidden/unauthorized without changing state | API response and audit/error reference if applicable |  |  |
| SMK-004 | Evidence metadata registration | `POST /api/evidence-files` or current evidence metadata route | Evidence metadata record created for UAT placeholder only | API response showing evidence ID/code |  |  |
| SMK-005 | Evidence link | `POST /api/evidence-links` | Evidence link created to UAT entity | API response or SQL result |  |  |
| SMK-006 | Extraction job | `POST /api/extraction-jobs` or current route | Extraction job created; output remains staging/review only | API response or query result |  |  |
| SMK-007 | Staging review | Review/approve/correct/reject staging field using current staging route | Human review action recorded; manual override required for correction | API response and audit reference |  |  |
| SMK-008 | Calculation run | Run calculation using explicit approved formula version | Run created with input/output snapshot and disclaimer | API response showing formula version and disclaimer |  |  |
| SMK-009 | Calculation approval / rejection | Approve or reject calculation with authorized human role | Approval/rejection writes audit log; AI/n8n cannot approve | API response and audit reference |  |  |
| SMK-010 | Integrity decision approval / rejection | Approve/reject decision using authorized human role | Decision gate enforced and audit written | API response and audit reference |  |  |
| SMK-011 | Report issue blocked | Attempt issue with missing/failed gate | API returns blocked result such as `REPORT_GATES_NOT_SATISFIED` or `REPORT_ISSUE_BLOCKED` | API response and error/audit reference |  |  |
| SMK-012 | Report issue success where gates pass | Issue report only when all gates and comments are satisfied | Report status becomes issued/locked where current API supports success path | API response and audit reference |  |  |
| SMK-013 | Internal work order create / update / close | Use work-order create, update, and close routes | Work order remains internal AIM fallback; closure note/evidence rule enforced | API responses and audit references |  |  |
| SMK-014 | Workflow event | `POST /api/workflow-events` or current workflow event route | Workflow event stored through AIM backend only | API response or query result |  |  |
| SMK-015 | Error log | `POST /api/error-logs` or current error route | Error log created for simulated UAT failure | API response or query result |  |  |
| SMK-016 | Audit log | `GET /api/audit-logs` or current audit route | Audit log is readable only by authorized role and remains read-only | API response |  |  |

## 3. Evidence Storage Rules

- Store smoke-test evidence in the UAT evidence folder or controlled project folder designated by the UAT Lead.
- Redact access tokens, session values, environment variables, database connection strings, object storage keys, and any real client data before attaching evidence.
- Use UAT sample IDs only.
- Link each smoke evidence artifact to the UAT execution result and defect log if applicable.

## 4. Pass/Fail Rules

A smoke item passes only when:

- expected result is observed;
- evidence artifact is saved;
- reviewer initials are recorded;
- no uncontrolled production data, real client evidence, or secrets appear in the artifact;
- any governance-relevant action has audit or error/workflow reference where applicable.

A smoke item fails when:

- API response differs materially from expectation;
- gate bypass is observed;
- audit/error/workflow evidence is missing where required;
- a service user performs a human-only action;
- external SAP/Maximo/CMMS integration is invoked during MVP smoke testing.

