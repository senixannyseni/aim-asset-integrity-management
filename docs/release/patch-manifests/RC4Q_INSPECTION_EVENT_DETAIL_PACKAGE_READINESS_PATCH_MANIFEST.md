# RC4-Q Patch Manifest — Inspection Event Detail + Inspection Package Readiness

## Patch name

`rc4-q-inspection-event-detail-package-readiness`

## Changed files

```text
04_API/openapi.yaml
README.md
RC4Q_INSPECTION_EVENT_DETAIL_PACKAGE_READINESS_PATCH_MANIFEST.md
apps/api/src/app.ts
apps/api/src/routes/inspections.ts
apps/api/tests/rc4-q-inspection-event-detail-package-readiness.test.ts
apps/web/app/page.tsx
apps/web/app/inspections/InspectionsClient.tsx
apps/web/app/inspections/page.tsx
apps/web/app/inspections/[inspectionEventId]/InspectionEventDetailClient.tsx
apps/web/app/inspections/[inspectionEventId]/page.tsx
docs/release/AIM_RC4Q_inspection_event_detail_package_readiness_report.md
docs/sprint-status.md
docs/uat/uat_rc4q_inspection_event_detail_package_readiness.md
```

## Scope

RC4-Q adds a read-only inspection package readiness endpoint and frontend detail workspace.

## Boundaries

This patch uses a governed boundary instead of formulas, FFS/RBI calculations, evidence storage changes, approval bypasses, report issue actions, work-order closure, AI finalization, or n8n finalization.

## Validation

Run:

```powershell
pnpm --filter @aim/api test -- rc4-q-inspection-event-detail-package-readiness.test.ts
pnpm --filter @aim/api test -- rc4-p-ndt-measurement-detail-inspection-traceability.test.ts
pnpm -r lint
pnpm -r test
```
