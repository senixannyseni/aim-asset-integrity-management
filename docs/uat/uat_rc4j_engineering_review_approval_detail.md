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


## Additional Negative UAT Cases

- Attempt to create an approval request without `review_id`; expected: `REVIEW_ID_REQUIRED`.
- Attempt to create an approval request with a `review_id` that points to a different entity; expected: `APPROVAL_REVIEW_ENTITY_MISMATCH`.
- Attempt to approve or reject an already approved/rejected/locked approval record; expected: `FINAL_APPROVAL_STATE_LOCKED`.
- Attempt to change status or add comment to an approved/rejected/locked review; expected: final review state lock response.

## RC4-J DB Final-State Lock Hotfix

Final-state immutability was hardened so approved, rejected, and locked review/approval records cannot be changed through generic status routes or direct database updates. Existing final records are backfilled to `locked_flag = true` in the RC4-J migration, and final transitions remain restricted to approval-record endpoints.

## RC4-J Review Completion Gate Hotfix

Additional negative UAT cases:

- Attempt to create a new engineering review directly with `review_status = reviewed`; expected: blocked with `REVIEW_STATUS_TRANSITION_REQUIRED`.
- Attempt to create a new engineering review directly with `review_status = submitted_for_approval`; expected: blocked with `REVIEW_STATUS_TRANSITION_REQUIRED`.
- Attempt to create a new revision directly with `review_status = reviewed`; expected: blocked with `REVISION_START_STATUS_INVALID`.
- Attempt to create an approval request for a review where `review_status = reviewed` but `reviewed_at` is missing; expected: blocked with `REVIEW_COMPLETION_REQUIRED`.
