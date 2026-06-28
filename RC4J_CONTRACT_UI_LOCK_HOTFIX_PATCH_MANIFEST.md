# RC4-J Contract/UI Lock Hotfix Patch Manifest

## Purpose

Final RC4-J cleanup after submitted-review lock review. This patch aligns the OpenAPI approval request contract with the backend gate, tightens frontend disabled states for submitted/final reviews, and adds row-level transaction locks for approval request/finalization reads.

## Changed files

- `04_API/openapi.yaml`
- `apps/api/src/routes/engineering-reviews.ts`
- `apps/api/tests/engineering-review-approval.test.ts`
- `apps/api/tests/rc4-j-engineering-review-approval-ui.test.ts`
- `apps/web/app/reviews/[reviewId]/EngineeringReviewDetailClient.tsx`
- `docs/release/AIM_RC4J_engineering_review_approval_detail_report.md`
- `docs/uat/uat_rc4j_engineering_review_approval_detail.md`
- `RC4J_ENGINEERING_REVIEW_APPROVAL_DETAIL_PATCH_MANIFEST.md`
- `RC4J_CONTRACT_UI_LOCK_HOTFIX_PATCH_MANIFEST.md`

## Governance fixes

1. OpenAPI `ApprovalRecordCreateRequest` now requires `review_id`, matching backend behavior.
2. `entity_type` and `entity_id` are documented as optional cross-checks that must match the linked reviewed engineering review when supplied.
3. Review detail UI now disables status, checklist, comment, and approval-request actions when a review is submitted for approval or finalized, not only when `locked_flag=true`.
4. Detail UI now treats only `submitted_for_approval` approval records as open approval actions.
5. Backend approval request and approval finalization reads now use `for update` to reduce race risk during submission/approval/rejection transitions.

## Validation expectation

Run:

```powershell
pnpm --filter @aim/api test -- rc4-j-engineering-review-approval-ui.test.ts
pnpm --filter @aim/api test -- engineering-review-approval.test.ts
pnpm -r lint
pnpm -r test
```


## RC4-J approval context cross-check hotfix

Approval request creation now treats `entity_type`/`entity_id` and `calculation_run_id` as separate optional cross-checks. `calculation_run_id` is treated as a calculation-context cross-check only; it is no longer used as a fallback `entity_id`. The approval record stores the calculation context resolved from the linked reviewed engineering review, preventing valid non-calculation reviews from being rejected and preventing client-supplied calculation context drift.
