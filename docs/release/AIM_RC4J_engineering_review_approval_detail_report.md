# AIM RC4-J Engineering Review and Approval Detail Report

## Scope

RC4-J completes the Engineering Review and Approval workflow UX and governance hardening on top of the corrected RC4-I branch.

Included:

- Engineering review detail page at `/reviews/[reviewId]`.
- Structured checklist UI with pass / fail / not_applicable / pending statuses.
- Threaded review comments with `comment_id`, `parent_comment_id`, and `thread_id` metadata.
- Permission-aware frontend actions for review, comment, approval request, approve, reject, override, and revision creation.
- Backend gate requiring structured checklist completion before review status can become `reviewed`.
- Backend gate requiring review status `reviewed` before an approval request can be created.
- Controlled override approval payload requiring affected field, original value, override value, reason, and evidence.
- Rejection action requiring explicit human reason/comment.
- New review revision endpoint to avoid mutating locked records.
- Calculation detail readable review/approval/audit timeline, replacing the previous raw JSON-only audit display.
- DB-backed permission alignment for `lead_engineer` and `approver` approval authority while preserving AI-agent denial.

## Out of Scope

RC4-J does not implement:

- New engineering formulas.
- API 579/API 581 quantitative logic.
- Report issue workflow changes.
- Work order integration changes.
- n8n direct database access.
- AI approval or AI finalization.

## Governance Boundaries

- AIM remains the system of record.
- PostgreSQL writes occur only through AIM backend services.
- AI agents cannot approve, reject, override, lock, or finalize engineering review/approval records.
- Locked records remain immutable; changes require a new revision.
- Frontend permission visibility is advisory only; backend RBAC and gate validation remain authoritative.

## Validation Commands

```bash
pnpm --filter @aim/api test -- rc4-j-engineering-review-approval-ui.test.ts
pnpm --filter @aim/api test -- engineering-review-approval.test.ts
pnpm -r lint
pnpm -r test
```


## Final Review Hardening Addendum

The approval request flow was hardened so approval records require a reviewed `review_id`, entity context cannot be changed during approval request creation, and approved/rejected/locked review or approval records are immutable. Rejected approvals are locked and further changes require a new review revision.

## RC4-J DB Final-State Lock Hotfix

Final-state immutability was hardened so approved, rejected, and locked review/approval records cannot be changed through generic status routes or direct database updates. Existing final records are backfilled to `locked_flag = true` in the RC4-J migration, and final transitions remain restricted to approval-record endpoints.

## RC4-J Review Completion Gate Hotfix

Review completion was hardened so new review and revision records cannot be created directly in `reviewed` or `submitted_for_approval` status. Approval requests now require a reviewed engineering review with `reviewed_at` recorded by the structured checklist status workflow, and the checklist is revalidated before approval request creation.


## Submitted Review Lock Addendum

Final review hardening blocks generic status/comment mutation once a review has been submitted for approval. The `submitted_for_approval` transition is controlled only by approval request creation, and approval records snapshot the reviewed checklist basis when created.


## RC4-J contract/UI lock cleanup

- Approval request API contract requires `review_id`, matching backend validation.
- `entity_type`/`entity_id` are optional cross-checks and must match the linked reviewed engineering review when supplied.
- Submitted-for-approval and finalized reviews are disabled from status/checklist/comment mutation in the detail UI and blocked by backend gates.
- Approval request and approval finalization database reads use row-level locks to reduce transition race risk.
