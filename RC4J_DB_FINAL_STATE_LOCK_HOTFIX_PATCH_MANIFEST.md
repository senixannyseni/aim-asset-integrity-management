# RC4-J DB Final State Lock Hotfix Patch Manifest

## Scope

Hardens RC4-J engineering review and approval final-state immutability at both API and database levels.

## Changes

- Blocks `approved`, `rejected`, and `locked` engineering review statuses from generic create/status/revision routes.
- Keeps final approval/rejection/lock transitions restricted to approval-record endpoints.
- Updates DB migration backfill so existing `approved`, `rejected`, and `locked` review/approval records become immutable.
- Updates DB triggers so direct database updates/deletes are blocked for `approved`, `rejected`, and `locked` states, not only `locked`.
- Adds regression/static coverage for final-state lock behavior.

## Changed Files

- `apps/api/src/routes/engineering-reviews.ts`
- `apps/api/tests/engineering-review-approval.test.ts`
- `apps/api/tests/rc4-j-engineering-review-approval-ui.test.ts`
- `db/migrations/0010_engineering_review_approval_workflow.sql`
- `RC4J_DB_FINAL_STATE_LOCK_HOTFIX_PATCH_MANIFEST.md`
- `RC4J_ENGINEERING_REVIEW_APPROVAL_DETAIL_PATCH_MANIFEST.md`
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
