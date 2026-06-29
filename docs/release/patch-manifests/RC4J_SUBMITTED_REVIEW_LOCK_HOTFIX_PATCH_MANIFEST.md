# RC4-J Submitted Review Lock Hotfix Patch Manifest

## Scope

Hardens RC4-J so engineering reviews cannot be changed through generic status/comment routes after an approval request has been created.

## Changes

- Blocks `/engineering/reviews/{reviewId}/status` from setting `submitted_for_approval` directly.
- Blocks `/engineering/reviews/{reviewId}/status` and `/comments` when the review is already `submitted_for_approval`, `approved`, `rejected`, or `locked`.
- Keeps `submitted_for_approval` transition controlled by `POST /approval-records` only.
- Preserves approval basis by copying the reviewed checklist into the approval record when no approval-request checklist is supplied.
- Adds regression/static coverage for submitted-review mutation locking.
- Updates OpenAPI descriptions to document the status/comment mutation boundary.

## Changed Files

- `04_API/openapi.yaml`
- `RC4J_ENGINEERING_REVIEW_APPROVAL_DETAIL_PATCH_MANIFEST.md`
- `RC4J_SUBMITTED_REVIEW_LOCK_HOTFIX_PATCH_MANIFEST.md`
- `apps/api/src/routes/engineering-reviews.ts`
- `apps/api/tests/engineering-review-approval.test.ts`
- `apps/api/tests/rc4-j-engineering-review-approval-ui.test.ts`
- `docs/release/AIM_RC4J_engineering_review_approval_detail_report.md`
- `docs/uat/uat_rc4j_engineering_review_approval_detail.md`

## Validation

Run:

```bash
pnpm --filter @aim/api test -- rc4-j-engineering-review-approval-ui.test.ts
pnpm --filter @aim/api test -- engineering-review-approval.test.ts
pnpm -r lint
pnpm -r test
```
