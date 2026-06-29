# RC4-T End-to-End Integrity Package Workspace + Release Candidate Consolidation Patch Manifest

## Package

`RC4-T — End-to-End Integrity Package Workspace + Release Candidate Consolidation`

## Scope

This patch adds a read-only consolidated workspace that connects the AIM integrity chain:

`Asset → Inspection → Evidence → NDT → Findings → Calculation → Review/Approval → Integrity Decision → FFS/RBI → Report → Work Order`

## Changed files

- `04_API/openapi.yaml`
- `README.md`
- `RC4T_END_TO_END_INTEGRITY_WORKSPACE_RELEASE_CONSOLIDATION_PATCH_MANIFEST.md`
- `apps/api/src/app.ts`
- `apps/api/src/routes/integrity-workspace.ts`
- `apps/api/tests/rc4-t-end-to-end-integrity-workspace-release-consolidation.test.ts`
- `apps/web/app/page.tsx`
- `apps/web/app/integrity-workspace/IntegrityWorkspaceClient.tsx`
- `apps/web/app/integrity-workspace/page.tsx`
- `apps/web/app/integrity-workspace/[assetId]/IntegrityWorkspaceDetailClient.tsx`
- `apps/web/app/integrity-workspace/[assetId]/page.tsx`
- `docs/release/AIM_RC4T_end_to_end_integrity_workspace_release_consolidation_report.md`
- `docs/sprint-status.md`
- `docs/uat/uat_rc4t_end_to_end_integrity_workspace_release_consolidation.md`

## Governance boundaries

RC4-T is read-only and does not:

- approve or reject engineering records;
- run calculations or add formulas;
- execute API 579/API 581/FFS/RBI/corrosion-rate/remaining-life logic;
- upload/download/delete object-storage evidence;
- issue reports;
- close work orders;
- promote AI staging records;
- let AI/n8n/service actors finalize release candidate readiness.

## Validation

Run locally:

```powershell
pnpm --filter @aim/api test -- rc4-t-end-to-end-integrity-workspace-release-consolidation.test.ts
pnpm --filter @aim/api test -- rc4-s-ffs-case-detail-disposition-readiness.test.ts
pnpm --filter @aim/api test -- rc4-r-asset-detail-integrity-package-readiness.test.ts
pnpm -r lint
pnpm -r test
```
