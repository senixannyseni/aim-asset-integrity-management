# RC4-K Report Detail and Issue Readiness UAT

## Objective

Verify that report users can inspect report detail, preview issue readiness gates, link required evidence, approve/issue reports through human-controlled actions, and inspect object-storage exports without weakening backend governance.

## Preconditions

- User is authenticated as a human role with report read permission.
- At least one generated report exists.
- At least one verified evidence object exists.
- A calculation run and approved integrity decision are available for the report path when testing successful issue readiness.

## Test Cases

| ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| RC4K-UAT-001 | Open report detail | Open `/reports`, click a report code/detail link. | `/reports/{reportId}` loads status, traceability, sections, evidence register, exports, and readiness gates. |
| RC4K-UAT-002 | Preview issue readiness | Open the report detail page before required evidence is linked. | Readiness gates show blocking failures without mutating report status. |
| RC4K-UAT-003 | Link report evidence | Select verified evidence and link it to `report`. | Evidence link succeeds if backend same-asset/ownership rules pass; readiness refreshes. |
| RC4K-UAT-004 | Link calculation evidence | Link selected evidence to `calculation_run`. | Readiness evidence counts update for calculation run evidence. |
| RC4K-UAT-005 | Link approved integrity decision evidence | Link selected evidence to the approved integrity decision target returned by readiness context. | Readiness evidence counts update for integrity decision evidence. |
| RC4K-UAT-006 | Approve report | As senior/lead/approver/admin, submit approval comment. | Report becomes approved unless backend segregation/lock rules block it. |
| RC4K-UAT-007 | Issue report | Submit issue comment after all gates except comment pass. | Backend issue endpoint issues and locks report; if any gate fails, response shows blocking gates. |
| RC4K-UAT-008 | Export artifact | Create JSON/HTML/DOCX export and final PDF only after issued. | Export record shows status and checksum; signed URL open action uses backend report export download route. |
| RC4K-UAT-009 | Permission visibility | Login as read-only/user without report export/issue permission. | Buttons are disabled/hidden by UI, and backend remains authoritative. |
| RC4K-UAT-010 | AI/n8n boundary | Attempt issue/export with AI/n8n/service actor headers where available. | Backend denies final report artifact/final issue actions. |

## Acceptance Criteria

- Issue readiness preview is read-only and does not write review gates, audit logs, or report status.
- Issue remains controlled by `POST /api/v1/reports/{reportId}/issue`.
- Direct evidence shortcuts never bypass backend evidence validation.
- Final PDF export remains disabled until report status is `issued`.
- No raw signed URL or object-storage secret is displayed in the UI.
