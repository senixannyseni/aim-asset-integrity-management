# RC4-N Integrity Decision Detail and Decision Readiness Patch Manifest

## Package

RC4-N adds integrity decision detail UX and read-only decision-readiness governance.

## Changed files

- `04_API/openapi.yaml`
- `README.md`
- `RC4N_INTEGRITY_DECISION_DETAIL_READINESS_PATCH_MANIFEST.md`
- `apps/api/src/routes/integrity-decisions.ts`
- `apps/api/tests/rc4-n-integrity-decision-detail-readiness.test.ts`
- `apps/web/app/integrity-decisions/IntegrityDecisionsClient.tsx`
- `apps/web/app/integrity-decisions/[decisionId]/IntegrityDecisionDetailClient.tsx`
- `apps/web/app/integrity-decisions/[decisionId]/page.tsx`
- `docs/release/AIM_RC4N_integrity_decision_detail_readiness_report.md`
- `docs/sprint-status.md`
- `docs/uat/uat_rc4n_integrity_decision_detail_readiness.md`

## Boundaries

- Read-only readiness endpoint only.
- No formula changes.
- No database migration.
- No object-storage behavior change.
- No report issue or work-order creation automation.
- No AI/n8n/service actor finalization.
