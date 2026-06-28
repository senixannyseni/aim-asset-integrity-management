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


## RC4-J Review Addendum — Approval Request Gate Hardening

Additional review hardening applied after final static review:

- Approval requests now require `review_id`; direct approval-record creation without a reviewed engineering review is blocked with `REVIEW_ID_REQUIRED`.
- Approval request entity context must match the reviewed engineering review entity; mismatch is blocked with `APPROVAL_REVIEW_ENTITY_MISMATCH`.
- Approved, rejected, or locked review records are immutable for status/comment mutation and require a new revision.
- Approved, rejected, or locked approval records are immutable and cannot be re-approved or re-rejected.
- Approval/rejection actions require the approval record to be `submitted_for_approval`.
- Rejected approval records are locked, and the linked review is marked rejected/locked so later changes require a revision.

## RC4-J DB Final-State Lock Hotfix

Final-state immutability was hardened so approved, rejected, and locked review/approval records cannot be changed through generic status routes or direct database updates. Existing final records are backfilled to `locked_flag = true` in the RC4-J migration, and final transitions remain restricted to approval-record endpoints.

## RC4-J Review Completion Gate Hotfix

Review completion was hardened so new reviews/revisions cannot be created directly as `reviewed` or `submitted_for_approval`. Completion must pass through the structured checklist status workflow, and approval requests require both `review_status = reviewed` and a recorded `reviewed_at` timestamp.


## RC4-J Submitted Review Mutation Lock Hotfix

Approval-submitted review records are now immutable through generic review status/comment routes. `submitted_for_approval` can only be set by creating an approval request, while `approved`, `rejected`, and `locked` remain restricted to approval-record finalization endpoints. Approval records also snapshot the reviewed checklist when no checklist is supplied in the approval request body.

## RC4-J final contract/UI lock cleanup

- Added `RC4J_CONTRACT_UI_LOCK_HOTFIX_PATCH_MANIFEST.md`.
- Approval request OpenAPI contract now requires `review_id`, matching backend gates.
- Submitted/final review mutation lock is reflected in detail UI disabled states.
- Approval request/finalization reads use row-level transaction locks.
