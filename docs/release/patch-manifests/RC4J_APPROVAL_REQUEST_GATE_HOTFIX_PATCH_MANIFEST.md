# RC4-J Approval Request Gate Hotfix Patch Manifest

## Scope

Hardens the RC4-J Engineering Review & Approval workflow after static review.

## Files Changed

- `apps/api/src/routes/engineering-reviews.ts`
- `apps/api/tests/engineering-review-approval.test.ts`
- `apps/api/tests/rc4-j-engineering-review-approval-ui.test.ts`
- `RC4J_ENGINEERING_REVIEW_APPROVAL_DETAIL_PATCH_MANIFEST.md`
- `RC4J_APPROVAL_REQUEST_GATE_HOTFIX_PATCH_MANIFEST.md`

## Fixes

1. Requires `review_id` for approval request creation.
2. Blocks approval request entity mismatch between request payload and reviewed engineering review.
3. Blocks mutation of approved/rejected/locked review records through status/comment routes.
4. Blocks re-approval or re-rejection of approved/rejected/locked approval records.
5. Requires approval records to be `submitted_for_approval` before approve/reject.
6. Locks rejected approval records and linked review records.

## Governance Outcome

Approval records can only originate from a completed human engineering review, final approval/rejection is immutable, and any later change must use the revision path.
