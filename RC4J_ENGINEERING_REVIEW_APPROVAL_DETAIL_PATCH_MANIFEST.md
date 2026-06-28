# RC4-J Engineering Review and Approval Detail Patch Manifest

## Package

RC4-J Engineering Review and Approval Detail

## Scope

- Review detail page `/reviews/[reviewId]`.
- Structured checklist UI and backend review gate.
- Threaded comments.
- Reject action with mandatory reason.
- Controlled override approval with evidence/reason.
- New revision creation from existing review.
- Calculation detail readable audit timeline.
- Permission-aware frontend actions.
- DB-backed approval permission alignment for lead_engineer and approver.

## Changed Files

- `03_Database/data_dictionary_current.md`
- `04_API/openapi.yaml`
- `README.md`
- `RC4J_ENGINEERING_REVIEW_APPROVAL_DETAIL_PATCH_MANIFEST.md`
- `apps/api/src/rbac/roles.ts`
- `apps/api/src/routes/engineering-reviews.ts`
- `apps/api/tests/rc4-j-engineering-review-approval-ui.test.ts`
- `apps/web/app/calculations/[runId]/CalculationDetailClient.tsx`
- `apps/web/app/globals.css`
- `apps/web/app/reviews/EngineeringReviewClient.tsx`
- `apps/web/app/reviews/[reviewId]/EngineeringReviewDetailClient.tsx`
- `apps/web/app/reviews/[reviewId]/page.tsx`
- `db/migrations/0010_engineering_review_approval_workflow.sql`
- `db/seeds/0001_foundation_seed.sql`
- `docs/erd_current.md`
- `docs/release/AIM_RC4J_engineering_review_approval_detail_report.md`
- `docs/sprint-status.md`
- `docs/uat/uat_rc4j_engineering_review_approval_detail.md`

## Validation

Run locally:

```bash
pnpm --filter @aim/api test -- rc4-j-engineering-review-approval-ui.test.ts
pnpm --filter @aim/api test -- engineering-review-approval.test.ts
pnpm -r lint
pnpm -r test
```

## Boundaries

No new formulas, no API 579/API 581 quantitative logic, no AI finalization, no direct n8n database access, and no report issue changes.
