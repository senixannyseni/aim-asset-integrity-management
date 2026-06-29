# RC3-C AI Staging Promotion Governance Patch Manifest

## Package

RC3-C — AI Staging Promotion Governance Closure

## Scope

This patch hardens the existing AIM AI extraction/staging workflow. It does not add dashboard, admin UI, audit log UI, n8n console, NDT visualization, hypercare dashboard, external CMMS integration, or new API/API-ASME formulas.

## Files changed

- `README.md`
- `04_API/openapi.yaml`
- `apps/api/src/routes/ai-extraction.ts`
- `apps/api/tests/rc3-c-ai-staging-promotion-governance.test.ts`
- `05_n8n/rc3c_ai_staging_promotion_workflow_addendum.md`
- `docs/sprint-status.md`
- `docs/uat/uat_rc3_ai_staging_promotion_scripts.md`
- `docs/release/AIM_RC3C_ai_staging_promotion_governance_report.md`
- `RC3C_AI_STAGING_PROMOTION_PATCH_MANIFEST.md`

## Governance controls implemented

- Human-only AI field approve/correct/reject enforcement.
- Meaningful reason enforcement for correction, rejection, low-confidence approval, and promotion.
- Verified object-storage evidence requirement before review/promotion where evidence is required.
- Rejected, validation-rejected, and low-confidence-not-corrected fields blocked from promotion.
- Segregation-of-duty check between reviewer and promoter.
- Job-level promotion readiness and promotion endpoints.
- Transactional promotion gate evaluation.
- Audit events for field review, manual override, promotion requested, promotion blocked, promotion successful, and promotion failure.
- n8n API-only orchestration boundary documented.

## Validation to run locally

```powershell
pnpm db:migrate
pnpm db:seed
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter @aim/api test -- rc3-c-ai-staging-promotion-governance.test.ts
pnpm --filter @aim/api test -- rc3-b-object-storage-governance.test.ts
pnpm --filter @aim/api test -- phase1-7-governance-closure.test.ts
pnpm --filter @aim/api test -- report-generation.test.ts
```
