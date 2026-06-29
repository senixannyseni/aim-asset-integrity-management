# UAT — RC4-R Asset Detail + Asset Integrity Package Readiness

## Objective

Validate that users can review an asset integrity package from the asset detail page without mutating engineering records.

## Test cases

1. Open `/assets` and confirm the list links to asset detail records.
2. Open `/assets/[assetId]`.
3. Confirm the page displays **Asset Integrity Package Readiness**.
4. Confirm master data, geometry, shell courses, evidence coverage, inspection history, NDT coverage, findings, calculations, review/approval trace, integrity decisions, reports/work-orders, and audit timeline are visible.
5. Confirm `GET /api/v1/assets/{assetId}/readiness` returns readiness gates and package counts.
6. Confirm the endpoint is read-only and does not update assets, evidence, calculations, reports, work orders, or review gates.
7. Confirm no API 579/API 581/FFS/RBI/corrosion-rate/remaining-life formula is executed.
8. Confirm AI/n8n/service actors cannot finalize asset integrity package readiness.

## Expected result

The asset detail workflow gives engineers package-level traceability visibility while preserving existing authoritative mutation and approval workflows.
