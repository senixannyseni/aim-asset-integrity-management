# RC4-K Report Detail and Issue Readiness Patch Manifest

## Package

RC4-K — Report Detail and Issue Readiness

## Files changed

- `04_API/openapi.yaml`
- `README.md`
- `RC4K_REPORT_DETAIL_ISSUE_READINESS_PATCH_MANIFEST.md`
- `apps/api/src/routes/reports.ts`
- `apps/api/tests/rc4-k-report-detail-issue-readiness.test.ts`
- `apps/web/app/globals.css`
- `apps/web/app/reports/ReportsClient.tsx`
- `apps/web/app/reports/[reportId]/ReportDetailClient.tsx`
- `apps/web/app/reports/[reportId]/page.tsx`
- `docs/release/AIM_RC4K_report_detail_issue_readiness_report.md`
- `docs/release/phase2_0_release_readiness_report.md`
- `docs/sprint-status.md`
- `docs/uat/uat_rc4k_report_detail_issue_readiness.md`

## Governance summary

- Adds a read-only report issue readiness endpoint.
- Removes stale merge-conflict markers from the Phase 2.0 readiness report.
- Adds a report detail page with permission-aware actions.
- Does not add formulas, final decision automation, AI approval, n8n finalization, or external CMMS integration.
- Report issue and report export backend gates remain authoritative.

## Required validation

```powershell
pnpm --filter @aim/api test -- rc4-k-report-detail-issue-readiness.test.ts
pnpm --filter @aim/api test -- report-generation.test.ts
pnpm -r lint
pnpm -r test
```
