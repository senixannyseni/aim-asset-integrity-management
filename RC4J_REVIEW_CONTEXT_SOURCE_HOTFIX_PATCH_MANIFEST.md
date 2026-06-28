# RC4-J Review Context Source Hotfix Patch Manifest

## Scope
Final RC4-J cleanup for approval request context traceability. This hotfix keeps the completed engineering review as the single source of truth for approval-record asset and calculation context.

## Governance fix
- Approval request `asset_id` is treated only as an optional cross-check, never as the stored source of truth.
- Approval request `calculation_run_id` is treated only as an optional cross-check, never as a fallback entity identifier.
- Approval records store `asset_id` from the linked reviewed engineering review, falling back to resolved target context only when the review does not carry the field.
- Approval records store `calculation_run_id` from the linked reviewed engineering review, falling back to resolved target context only when the review does not carry the field.
- Client-supplied asset/calculation context drift is blocked with explicit mismatch errors.

## Changed files
- `apps/api/src/routes/engineering-reviews.ts`
- `apps/api/tests/engineering-review-approval.test.ts`
- `apps/api/tests/rc4-j-engineering-review-approval-ui.test.ts`
- `04_API/openapi.yaml`
- `docs/release/AIM_RC4J_engineering_review_approval_detail_report.md`
- `docs/uat/uat_rc4j_engineering_review_approval_detail.md`
- `RC4J_ENGINEERING_REVIEW_APPROVAL_DETAIL_PATCH_MANIFEST.md`
- `RC4J_REVIEW_CONTEXT_SOURCE_HOTFIX_PATCH_MANIFEST.md`

## Validation notes
Run:

```powershell
pnpm --filter @aim/api test -- rc4-j-engineering-review-approval-ui.test.ts
pnpm --filter @aim/api test -- engineering-review-approval.test.ts
pnpm -r lint
pnpm -r test
```
