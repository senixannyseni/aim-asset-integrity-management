# RC4-J Review Completion Gate Hotfix Patch Manifest

## Scope

Hardens RC4-J so engineering reviews cannot be created or revised directly into completed/approval-ready states.

## Changes

- Blocks new review creation with `reviewed`, `submitted_for_approval`, `approved`, `rejected`, or `locked` status.
- Blocks new review revisions with `reviewed`, `submitted_for_approval`, `approved`, `rejected`, or `locked` status.
- Requires approval requests to reference a review that is both `reviewed` and has `reviewed_at` recorded by the structured checklist status workflow.
- Revalidates structured checklist blockers when creating an approval request.
- Updates OpenAPI create/revision schemas so initial statuses are limited to pre-completion workflow states.
- Adds regression/static coverage for the review completion gate.

## Changed Files

- `04_API/openapi.yaml`
- `RC4J_ENGINEERING_REVIEW_APPROVAL_DETAIL_PATCH_MANIFEST.md`
- `RC4J_REVIEW_COMPLETION_GATE_HOTFIX_PATCH_MANIFEST.md`
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
