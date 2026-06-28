# RC4-M Evidence Traceability Matrix UAT

## Objective
Confirm that AIM users can view cross-module evidence coverage without triggering evidence upload/download, approval, report issue, work-order closure, or engineering data mutation.

## Test Cases

### UAT-01 — Open Evidence Traceability Matrix
1. Login as an engineer, senior engineer, lead engineer, or admin.
2. Open `/evidence-traceability`.
3. Confirm summary cards, coverage matrix, missing evidence indicators, recent evidence links, and governance notes are visible.

Expected result: page loads without mutating records.

### UAT-02 — Apply Optional Filters
1. Enter a valid `asset_id` UUID.
2. Optionally enter a valid `inspection_event_id` UUID.
3. Refresh evidence coverage.

Expected result: matrix narrows to that scope and shows coverage percentages and missing evidence counts.

### UAT-03 — Invalid UUID Validation
1. Enter an invalid `asset_id` or `inspection_event_id` value.
2. Refresh evidence coverage.

Expected result: backend rejects the request with a controlled validation error.

### UAT-04 — Missing Evidence Indicators
1. Use a scope with records lacking evidence links.
2. Review the Missing Evidence Indicators panel.

Expected result: missing records are shown by module with recommended evidence-link actions.

### UAT-05 — Read-Only Boundary
1. Open browser developer tools and inspect the endpoint usage.
2. Confirm only `GET /api/v1/evidence/traceability-matrix` is used for the matrix.

Expected result: no upload, download, delete, approval, issue, close, or promote action is triggered.

## Acceptance Criteria
- Matrix covers asset, inspection, NDT, finding, calculation, integrity decision, RBI, report, and internal work-order modules.
- Endpoint requires `evidence.read`.
- Endpoint is read-only and emits no audit mutation event.
- Object storage behavior is unchanged.
- Evidence coverage is clearly labeled as traceability/readiness visibility, not approval.
