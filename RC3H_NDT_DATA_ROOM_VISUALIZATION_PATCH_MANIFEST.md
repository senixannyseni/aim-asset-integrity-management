# RC3-H NDT Data Room / Visualization Governance Patch Manifest

## Scope

Implements RC3-H only: read-only NDT data room / visualization governance visibility.

## Files changed or added

- `apps/api/src/routes/ndt-data-room.ts`
- `apps/api/src/app.ts`
- `apps/api/src/rbac/roles.ts`
- `apps/api/tests/rc3-h-ndt-data-room-visualization.test.ts`
- `apps/api/tests/migration-sequence.test.ts`
- `apps/web/app/ndt-data-room/page.tsx`
- `apps/web/app/ndt-data-room/NdtDataRoomClient.tsx`
- `apps/web/app/page.tsx`
- `db/migrations/0025_ndt_data_room_visualization.sql`
- `db/seeds/0001_foundation_seed.sql`
- `04_API/openapi.yaml`
- `README.md`
- `docs/sprint-status.md`
- `docs/uat/uat_rc3_ndt_data_room_visualization_scripts.md`
- `05_n8n/rc3h_ndt_data_room_boundary_addendum.md`
- `docs/release/AIM_RC3H_ndt_data_room_visualization_report.md`

## Governance boundaries

- Read-only API/UI only.
- No POST/PATCH/DELETE NDT data room routes.
- No API 579/API 581/FFS/RBI/corrosion-rate/remaining-life calculation implementation.
- No NDT mutation, approval, promotion, report issue, admin mutation, audit mutation, n8n execution, or hypercare controls.
- AI/service/n8n/integration/workflow-style actors are blocked from broad NDT data room visibility.
- Sensitive metadata and raw artifact fields are redacted/omitted.
