# UAT RC4-J Engineering Review and Approval Detail

## Objective

Verify that Engineering Review and Approval can be completed through review detail pages with structured checklist, threaded comments, controlled reject/override actions, revision creation, and readable calculation audit timeline.

## Test Cases

| ID | Scenario | Expected Result |
|---|---|---|
| RC4J-UAT-001 | Open `/reviews` as Engineer | Review list loads; create review button visible only if `engineering_review.create` is granted. |
| RC4J-UAT-002 | Create review from calculation run | Review is created as `submitted_for_review` with pending structured checklist. |
| RC4J-UAT-003 | Open `/reviews/[reviewId]` | Detail page shows status, checklist, comments, approval actions, revision action, and audit timeline. |
| RC4J-UAT-004 | Try to mark review `reviewed` with pending/fail checklist | Backend blocks with `STRUCTURED_CHECKLIST_REQUIRED`. |
| RC4J-UAT-005 | Mark all checklist items pass/not_applicable and mark reviewed | Review becomes `reviewed`; calculation review status is updated and audited. |
| RC4J-UAT-006 | Add top-level and reply comment | Comments include comment/thread metadata and are displayed in detail page. |
| RC4J-UAT-007 | Request approval before review is `reviewed` | Backend blocks with `REVIEW_COMPLETION_REQUIRED`. |
| RC4J-UAT-008 | Request approval after review is `reviewed` | Approval record is created as `submitted_for_approval`. |
| RC4J-UAT-009 | Reject approval without reason | Backend blocks with required reason/comment. |
| RC4J-UAT-010 | Reject approval with reason | Approval is rejected and audit event is written. |
| RC4J-UAT-011 | Approve controlled override without evidence/reason | Backend blocks with `OVERRIDE_REASON_AND_EVIDENCE_REQUIRED`. |
| RC4J-UAT-012 | Approve controlled override with all required fields/evidence | Approval is completed and locked; override audit is written. |
| RC4J-UAT-013 | Create new revision from locked review | New revision is created and supersedes prior review without mutating locked record. |
| RC4J-UAT-014 | Open calculation detail | Reviews/approvals and audit events render as readable timeline, with raw JSON only as fallback. |
| RC4J-UAT-015 | Login as AI agent/service actor | Approval, reject, override, and lock actions are not permitted by backend. |

## Evidence to Capture

- Screenshots of `/reviews`, `/reviews/[reviewId]`, and `/calculations/[runId]` timeline.
- API responses for blocked checklist, blocked approval request, rejection, override, and revision creation.
- Audit log entries for review status update, comment, approval/rejection, override, and revision.
