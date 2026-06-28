# UAT — RC4-D NDT Bulk Import UX and Measurement Detail Page

## Purpose

Validate that RC4-D completes the NDT bulk import, manual entry, asset-scoped NDT view, and measurement detail frontend without weakening AIM governance.

## Preconditions

- User can log in with a role allowed to read NDT measurements.
- Test asset records exist.
- Test evidence records exist for the same asset where evidence-linked NDT records are expected.
- API service is running.
- Web service is running.

## UAT-01 — NDT list page loads

1. Open `/ndt`.
2. Confirm the page shows NDT list/table, manual entry panel, and bulk import panel.
3. Confirm loading, empty, error, or permission-denied states appear appropriately.

Expected result: NDT page loads existing measurements from AIM APIs and does not display raw object keys, signed URLs, tokens, or raw evidence contents.

## UAT-02 — Manual NDT entry validation

1. Open `/ndt`.
2. Try to submit manual entry with missing `asset_id`, `component`, `measured_thickness`, or `reading_date`.
3. Enter invalid measured thickness, invalid date, unsupported method, and missing thickness unit where possible.

Expected result: UI shows clear validation messages before calling the backend for blocking frontend errors. Backend validation remains authoritative.

## UAT-03 — Manual NDT entry creation

1. Fill asset, component, measured thickness, unit, reading date, method, confidence, and evidence file where applicable.
2. Submit the form.

Expected result: UI calls `POST /api/v1/ndt/measurements`, shows created measurement status, refreshes the list, and does not approve the measurement.

## UAT-04 — Critical missing-evidence warning

1. Create or preview a critical NDT record without `evidence_file_id`.
2. Confirm the UI warns that the backend evidence gate remains blocked until evidence is linked.

Expected result: Critical missing evidence is visible as a blocking/warning state. The UI does not bypass evidence linkage requirements.

## UAT-05 — CSV bulk import preview

1. Select a CSV with columns such as `asset_id`, `component`, `measured_thickness`, `reading_date`, `method`, `evidence_file_id`, and `extraction_source`.
2. Confirm selected file name, size, MIME type, expected columns, row count, mapped columns, and preview rows are shown.

Expected result: CSV preview is displayed before commit.

## UAT-06 — CSV row-level validation

1. Select a CSV with invalid rows: missing asset, missing component, missing thickness, invalid thickness, invalid date, unsupported method, and critical missing evidence.
2. Review validation messages.

Expected result: Row-level errors and warnings are shown before commit. Blocking errors prevent commit.

## UAT-07 — CSV bulk import commit

1. Select a valid CSV.
2. Review preview.
3. Click commit bulk import.

Expected result: UI calls `POST /api/v1/ndt/measurements/bulk-import`, shows created/rejected summary and backend errors if returned, then refreshes the list.

## UAT-08 — XLSX handling

1. Select an `.xlsx` file.

Expected result: UI shows that XLSX selection is visible but no heavy parser dependency was added in RC4-D; user is instructed to convert to CSV unless a future approved parser dependency is introduced.

## UAT-09 — Filtering and display-only visualization

1. Filter by asset, component, shell course, CML/TML/grid, method, and evidence state.
2. Review method grouping and CML/TML grid table.

Expected result: Filters apply to the displayed measurements. Visualization remains display-only and does not compute API/ASME/API 579/API 581/FFS/RBI values.

## UAT-10 — Measurement detail page

1. Open `/ndt/[measurementId]` from a measurement link.
2. Confirm metadata, asset link, inspection/event reference, component/course/grid/elevation/orientation, measured thickness, method, confidence, extraction source, reviewer status, validation status, evidence linkage, missing-evidence state, calculation input link, and audit-log link are shown.

Expected result: Detail page loads the measurement and evidence gate state from AIM API. It does not expose signed URLs, object keys, tokens, or raw evidence contents.

## UAT-11 — Asset-scoped NDT page

1. Open `/assets/[assetId]/ndt`.
2. Confirm the list is filtered to the selected asset.
3. Confirm manual entry has the selected asset prefilled.
4. Confirm bulk import uses the selected asset as fallback where the CSV row omits `asset_id`.

Expected result: Asset-scoped page works without adding a new backend model.

## UAT-12 — Governance regression

Confirm RC4-D does not add:

```text
new backend schema
new backend routes
new migrations
new formulas
calculation engine changes
FFS/RBI trigger logic
approval automation
AI/n8n/service actor boundary changes
direct n8n database access
raw object key/signed URL display
```

Expected result: AIM governance boundaries remain preserved.
