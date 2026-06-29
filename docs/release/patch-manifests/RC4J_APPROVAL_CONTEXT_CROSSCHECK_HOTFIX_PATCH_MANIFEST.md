# RC4-J Approval Context Cross-Check Hotfix Patch Manifest

## Scope

Final RC4-J cleanup for approval request context validation. This hotfix keeps `review_id` as the mandatory source of truth and treats optional `entity_type`, `entity_id`, and `calculation_run_id` as separate cross-checks.

## Fixes

- `calculation_run_id` is no longer used as fallback `entity_id` during approval request validation.
- Optional `entity_id` cross-check only compares to the linked review entity.
- Optional `calculation_run_id` cross-check compares to the linked review calculation context.
- Approval records persist calculation context resolved from the linked reviewed engineering review, not arbitrary client input.
- Adds regression/static tests and OpenAPI/documentation updates.

## Changed files

- `apps/api/src/routes/engineering-reviews.ts`
- `apps/api/tests/engineering-review-approval.test.ts`
- `apps/api/tests/rc4-j-engineering-review-approval-ui.test.ts`
- `04_API/openapi.yaml`
- `docs/release/AIM_RC4J_engineering_review_approval_detail_report.md`
- `docs/uat/uat_rc4j_engineering_review_approval_detail.md`
- `RC4J_ENGINEERING_REVIEW_APPROVAL_DETAIL_PATCH_MANIFEST.md`
- `RC4J_CONTRACT_UI_LOCK_HOTFIX_PATCH_MANIFEST.md`
- `RC4J_APPROVAL_CHECKLIST_SNAPSHOT_HOTFIX_PATCH_MANIFEST.md`

## Validation

Run locally:

```powershell
pnpm --filter @aim/api test -- rc4-j-engineering-review-approval-ui.test.ts
pnpm --filter @aim/api test -- engineering-review-approval.test.ts
pnpm -r lint
pnpm -r test
```
