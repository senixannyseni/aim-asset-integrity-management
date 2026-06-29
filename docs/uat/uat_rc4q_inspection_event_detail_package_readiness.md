# UAT — RC4-Q Inspection Event Detail + Inspection Package Readiness

## Objective

Validate that inspection users can review an inspection package, its evidence/NDT/calculation/downstream traceability, and package readiness without triggering engineering finalization or mutation.

## Preconditions

- User has `inspection.read` permission.
- At least one `inspection_events` record exists.
- Optional linked records may include evidence files, NDT measurements, findings, calculation runs, reviews, approvals, reports, and internal work orders.

## Test cases

### 1. Open inspection list

1. Navigate to `/inspections`.
2. Confirm the page loads inspection events.
3. Confirm the page contains `Inspection Package Readiness` links.

Expected result: inspection event list is visible and no mutation control is required.

### 2. Open inspection package detail

1. Select an inspection package.
2. Confirm `/inspections/[inspectionEventId]` loads.
3. Confirm the detail page displays inspection scope, evidence coverage, NDT measurement coverage, findings, calculations, review/approval trace, downstream traceability, and audit timeline.

Expected result: inspection package traceability is readable from one page.

### 3. Validate readiness endpoint

1. Call `GET /api/v1/inspections/{inspectionEventId}/readiness`.
2. Confirm response includes `readiness_gates`, `gate_summary`, `package_counts`, `linked_context`, and `governance_notes`.
3. Confirm no approval, report issue, work-order close, evidence upload, or calculation execution occurs.

Expected result: endpoint is read-only and returns an inspection package readiness preview.

### 4. Validate governance boundary

Confirm the API and UI state that no API 579/API 581/FFS/RBI/corrosion-rate/remaining-life formula is executed and AI/n8n/service actors cannot finalize inspection package readiness.

Expected result: RC4-Q preserves AIM human-governed source-of-truth boundaries.

## Pass criteria

- `/inspections` and `/inspections/[inspectionEventId]` load for authorized users.
- Readiness gates are visible.
- Missing evidence/NDT/calculation/review/downstream traceability is surfaced as fail or warning gates.
- No read-only readiness endpoint mutates PostgreSQL.
- No object-storage behavior changes occur.
