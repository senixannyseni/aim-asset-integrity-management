# RC4-P Patch Manifest — NDT Measurement Detail + Inspection Traceability Readiness

## Changed files

- `04_API/openapi.yaml`
- `README.md`
- `apps/api/src/routes/ndt.ts`
- `apps/api/tests/rc4-p-ndt-measurement-detail-inspection-traceability.test.ts`
- `apps/web/app/ndt/NdtDataRoomClient.tsx`
- `apps/web/app/ndt/[measurementId]/page.tsx`
- `docs/release/AIM_RC4P_ndt_measurement_detail_inspection_traceability_report.md`
- `docs/sprint-status.md`
- `docs/uat/uat_rc4p_ndt_measurement_detail_inspection_traceability.md`

## Scope

Adds read-only NDT measurement inspection traceability readiness for evidence, inspection context, findings, deterministic calculation input usage, review/approval trace, and audit timeline.

## Boundaries

No formulas, no FFS/RBI/API 579/API 581 calculations, no object-storage changes, no AI/n8n finalization, and no approval bypass.
