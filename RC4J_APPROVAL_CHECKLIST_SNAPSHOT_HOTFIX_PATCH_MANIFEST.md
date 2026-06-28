# RC4-J Approval Checklist Snapshot Hotfix Patch Manifest

## Scope
Final RC4-J traceability cleanup for approval request creation.

## Fixes
- Approval records always snapshot the linked reviewed engineering checklist from `engineering_reviews.checklist_json`.
- Client-supplied approval-request checklist payloads can no longer replace the reviewed checklist basis.
- Review detail UI no longer sends a synthetic `review_status_confirmed` checklist.
- OpenAPI contract removes approval-request `checklist` input and documents immutable reviewed-checklist snapshot behavior.
- Static regression tests assert the reviewed-checklist snapshot source.

## Changed Files
- 04_API/openapi.yaml
- RC4J_ENGINEERING_REVIEW_APPROVAL_DETAIL_PATCH_MANIFEST.md
- RC4J_APPROVAL_CHECKLIST_SNAPSHOT_HOTFIX_PATCH_MANIFEST.md
- apps/api/src/routes/engineering-reviews.ts
- apps/api/tests/engineering-review-approval.test.ts
- apps/api/tests/rc4-j-engineering-review-approval-ui.test.ts
- apps/web/app/reviews/[reviewId]/EngineeringReviewDetailClient.tsx
- docs/release/AIM_RC4J_engineering_review_approval_detail_report.md
- docs/uat/uat_rc4j_engineering_review_approval_detail.md
