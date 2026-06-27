# AIM RC3-H Release Report — NDT Data Room / Visualization Governance

## Status

Implemented as an RC3-H package candidate.

## Summary

RC3-H adds RBAC-controlled, read-only NDT data room visibility for existing AIM NDT measurements and evidence linkage. It adds the API endpoint `GET /api/v1/ndt-data-room/overview`, the frontend route `/ndt-data-room`, the `ndt_data_room.view` permission, OpenAPI coverage, UAT guidance, n8n boundary documentation, and targeted regression tests.

## Changed areas

- API: read-only NDT data room overview route.
- RBAC: `ndt_data_room.view` permission synchronization.
- Frontend: read-only `/ndt-data-room` page.
- Documentation: README, sprint status, OpenAPI, UAT script, n8n boundary addendum, release report.
- Tests: RC3-H targeted governance/static test and migration sequence update.

## Governance controls

- AIM remains the system of record.
- Dashboard/visualization data is summarized from existing AIM NDT measurement and evidence-linkage state only.
- No NDT data room snapshot table is introduced.
- No POST/PATCH/DELETE NDT data room mutation routes are introduced.
- AI/service/n8n/integration/workflow-style actors are blocked from broad NDT data room visibility.
- Secrets, signed URLs, tokens, credentials, object keys, raw file contents, raw report contents, OCR full text, and unrestricted evidence download URLs are not returned.
- No API 579/API 581/FFS/RBI/corrosion-rate/remaining-life/MAWP/retirement-thickness/inspection-interval calculation is implemented.

## Validation commands

```powershell
pnpm db:migrate
pnpm db:seed
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter @aim/api test -- rc3-h-ndt-data-room-visualization.test.ts
pnpm --filter @aim/api test -- rc3-g-n8n-workflow-console.test.ts
pnpm --filter @aim/api test -- rc3-f-governance-dashboard-readiness.test.ts
pnpm --filter @aim/api test -- rc3-e-admin-governance-console.test.ts
pnpm --filter @aim/api test -- rc3-d-audit-log-governance-visibility.test.ts
pnpm --filter @aim/api test -- rc3-c-ai-staging-promotion-governance.test.ts
pnpm --filter @aim/api test -- rc3-b-object-storage-governance.test.ts
pnpm --filter @aim/api test -- phase1-7-governance-closure.test.ts
pnpm --filter @aim/api test -- phase1-4-openapi-contract.test.ts
pnpm --filter @aim/api test -- report-generation.test.ts
```

## Known limitations

- RC3-H is visualization/readiness governance only. It does not add new measurement ingestion or NDT mutation workflows.
- CML/TML/Grid coverage is based on existing stored references only.
- Missing data is omitted or reported as not available rather than invented.
- Production hardening may later add more granular permission-scoped links and richer visual components.

## Out-of-scope confirmation

RC3-H does not implement API 579/API 581/FFS/RBI calculations, new engineering formulas, deterministic calculation engine changes, AI staging promotion changes, report builder changes, object-storage feature changes, external CMMS integration, hypercare dashboard, n8n workflow execution/editor, admin settings changes beyond permission synchronization, audit mutation, direct database editing, or AI/n8n/service final engineering decision automation.
