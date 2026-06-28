# RC4-J Review Entity Context Source Hotfix Patch Manifest

## Patch
`fix(rc4-j): source review context from resolved entity`

## Purpose
Close the final RC4-J context-governance gap where engineering review creation could accept client-supplied `asset_id` or `calculation_run_id` as stored review context. Review context must be derived from the reviewed entity, while request-provided asset/calculation identifiers are only optional cross-checks.

## Changed files
- `apps/api/src/routes/engineering-reviews.ts`
- `apps/api/tests/engineering-review-approval.test.ts`
- `apps/api/tests/rc4-j-engineering-review-approval-ui.test.ts`
- `04_API/openapi.yaml`
- `docs/release/AIM_RC4J_engineering_review_approval_detail_report.md`
- `docs/uat/uat_rc4j_engineering_review_approval_detail.md`
- `RC4J_ENGINEERING_REVIEW_APPROVAL_DETAIL_PATCH_MANIFEST.md`

## Governance fixes
- Engineering review creation now stores `asset_id` from the resolved review target context.
- Engineering review creation now stores `calculation_run_id` from the resolved review target context.
- Client-supplied `asset_id` is treated only as an optional cross-check and is rejected on mismatch.
- Client-supplied `calculation_run_id` is treated only as an optional cross-check and is rejected on mismatch.
- Finding reviews now resolve context from the `findings` table instead of allowing asset-less review context.
- OpenAPI documents `asset_id` and `calculation_run_id` on review creation as optional cross-check fields, not override fields.

## Validation
Run locally:

```powershell
pnpm --filter @aim/api test -- rc4-j-engineering-review-approval-ui.test.ts
pnpm --filter @aim/api test -- engineering-review-approval.test.ts
pnpm -r lint
pnpm -r test
```
