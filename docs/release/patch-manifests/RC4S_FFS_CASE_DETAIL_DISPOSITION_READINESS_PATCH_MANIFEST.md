# RC4-S FFS Case Detail + FFS Disposition Readiness Patch Manifest

## Scope

RC4-S adds FFS case detail and final disposition readiness visibility.

## Changed Files

- `04_API/openapi.yaml`
- `README.md`
- `RC4S_FFS_CASE_DETAIL_DISPOSITION_READINESS_PATCH_MANIFEST.md`
- `apps/api/src/routes/ffs.ts`
- `apps/api/tests/rc4-s-ffs-case-detail-disposition-readiness.test.ts`
- `apps/web/app/page.tsx`
- `apps/web/app/ffs/FfsWorkflowClient.tsx`
- `apps/web/app/ffs/[caseId]/FfsCaseDetailClient.tsx`
- `apps/web/app/ffs/[caseId]/page.tsx`
- `docs/release/AIM_RC4S_ffs_case_detail_disposition_readiness_report.md`
- `docs/sprint-status.md`
- `docs/uat/uat_rc4s_ffs_case_detail_disposition_readiness.md`

## Governance Boundaries

- Readiness endpoint is read-only.
- No API 579/API 581/FFS/RBI/corrosion-rate/remaining-life formula is executed.
- No automatic fitness-for-service declaration is introduced.
- Final disposition remains senior human-approved.
- AI/n8n/service actors cannot finalize FFS cases.
