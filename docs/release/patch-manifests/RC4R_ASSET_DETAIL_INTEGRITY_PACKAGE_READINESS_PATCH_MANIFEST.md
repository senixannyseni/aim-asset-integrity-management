# RC4-R Asset Detail + Asset Integrity Package Readiness Patch Manifest

## Scope

Adds a read-only asset integrity package readiness workflow.

## Changed files

- `04_API/openapi.yaml`
- `README.md`
- `RC4R_ASSET_DETAIL_INTEGRITY_PACKAGE_READINESS_PATCH_MANIFEST.md`
- `apps/api/src/routes/assets.ts`
- `apps/api/tests/rc4-r-asset-detail-integrity-package-readiness.test.ts`
- `apps/web/app/page.tsx`
- `apps/web/app/assets/page.tsx`
- `apps/web/app/assets/[assetId]/AssetDetailClient.tsx`
- `apps/web/app/assets/[assetId]/page.tsx`
- `docs/release/AIM_RC4R_asset_detail_integrity_package_readiness_report.md`
- `docs/sprint-status.md`
- `docs/uat/uat_rc4r_asset_detail_integrity_package_readiness.md`

## Boundaries

- Read-only readiness endpoint only.
- No asset update behavior change.
- No evidence upload/download/delete behavior change.
- No calculation/formula change.
- No report issue or work-order closure change.
- No AI/n8n/service finalization.
