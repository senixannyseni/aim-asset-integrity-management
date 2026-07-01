# AIM RC4-D NDT Bulk Import UX and Measurement Detail Page Report

## Package

RC4-D — NDT Bulk Import UX and Measurement Detail Page

## Status

Implemented as a frontend-focused NDT completion package.

## Scope Delivered

RC4-D completes the user-facing NDT data-room workflow using existing AIM backend APIs only:

- NDT measurement list/table at `/ndt`.
- Manual NDT entry panel.
- CSV bulk import panel with preview before commit.
- Row-level frontend validation before bulk commit.
- Import summary after backend commit.
- Asset, component, shell-course, CML/TML/grid, method, and evidence-state filtering.
- Evidence-linked, missing-evidence, and critical missing-evidence markers.
- Display-only CML/TML grid view and UT/MFL/method grouping.
- CSV export for filtered NDT metadata.
- NDT measurement detail page at `/ndt/[measurementId]`.
- Asset-scoped NDT page at `/assets/[assetId]/ndt`.

## Frontend Routes

```text
/ndt
/ndt/[measurementId]
/assets/[assetId]/ndt
```

## Existing Backend APIs Used

```text
GET  /api/v1/assets
GET  /api/v1/evidence
GET  /api/v1/ndt/measurements
GET  /api/v1/ndt/measurements?asset_id={assetId}
GET  /api/v1/ndt/measurements/{measurementId}
POST /api/v1/ndt/measurements
POST /api/v1/ndt/measurements/bulk-import
```

No new backend API route was added.

## Manual Entry UX

The manual entry panel exposes:

```text
asset_id
inspection_event_id
component
shell_course_no
cml_tml_id
grid_ref
elevation
elevation_unit
orientation
measured_thickness
measured_thickness_unit
reading_date
method
confidence
evidence_file_id
extraction_source
is_critical
```

Frontend validation flags missing asset, missing component, missing measured thickness, invalid measured thickness, invalid reading date, unsupported method, missing/ambiguous thickness unit, and critical missing-evidence warnings. Frontend validation is UX-only; backend validation remains authoritative.

## Bulk Import UX

The bulk import panel supports CSV preview before commit. It shows selected file name, size, MIME type, expected columns, row count, mapped columns, row-level validation issues, cancel-before-commit, commit action, and backend import summary.

XLSX file selection is visible for workflow continuity, but this package does not add a heavy XLSX parser dependency. Users should convert XLSX workbooks to CSV unless a future approved parser dependency is added.

## Measurement Detail UX

The detail page shows:

```text
measurement_id
measurement_code
asset link
inspection/event reference
component
shell_course_no
cml_tml_id
grid_ref
elevation
orientation
measured_thickness with unit
reading_date
method
confidence
extraction_source
reviewer_status
validation_status
validation_message
direct evidence link
valid linked evidence
invalid cross-asset evidence
evidence gate status/reason
calculation input link
audit-log link
```

Evidence links route to the RC4-C evidence detail page. Preview/open controls remain governed by the evidence detail page and backend malware/access status checks.

## Governance Boundary

RC4-D is display/input UX only for existing NDT APIs. It does not approve NDT records, does not calculate engineering outcomes, does not infer fitness for service, does not introduce FFS/RBI trigger logic, and does not add any API/API-ASME/API 579/API 581 formula.

AIM remains the system of record. PostgreSQL remains the final structured engineering data store. Object storage remains the evidence/report artifact store. n8n remains orchestration-only. AI extraction remains staging-first. Human review and evidence linkage remain mandatory.

## Files Changed

```text
apps/web/app/ndt/page.tsx
apps/web/app/ndt/NdtDataRoomClient.tsx
apps/web/app/ndt/[measurementId]/page.tsx
apps/web/app/assets/[assetId]/ndt/page.tsx
README.md
docs/sprint-status.md
docs/operations/source_of_truth_alignment_checklist.md
docs/release/AIM_RC4D_ndt_bulk_import_measurement_detail_report.md
docs/uat/uat_rc4d_ndt_bulk_import_measurement_detail.md
```

## Out of Scope Preserved

RC4-D uses a governed boundary instead of Tank Asset Register changes, Evidence upload changes, validation-by-asset UX, Formula Registry synchronization, Calculation UI changes, calculation engine changes, FFS workflow changes, RBI workflow changes, engineering approval UX, report builder changes, n8n webhook integration, AI staging promotion handlers, new formulas, direct n8n database access, or backend NDT schema changes.
