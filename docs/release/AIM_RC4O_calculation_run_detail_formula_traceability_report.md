# AIM RC4-O Calculation Run Detail and Formula Traceability Readiness Report

## Summary

RC4-O closes the calculation-run operational visibility gap after RC4-N by adding a read-only formula traceability readiness endpoint and improving the calculation detail UI.

The package keeps the deterministic calculation engine unchanged. It makes calculation final-use readiness visible before downstream integrity decision, report, or work-order workflows rely on a calculation run.

## Implemented controls

- Added `GET /api/v1/engineering/calculations/{runId}/readiness`.
- Added calculation readiness gates for formula version snapshot, deterministic output snapshot, validation status, evidence linkage, engineering review, approval, downstream decision visibility, and AI/n8n finalization boundary.
- Extended calculation detail response with linked evidence, formula traceability, readiness, linked context, and audit traceability.
- Updated `/calculations/[runId]` to show formula traceability readiness, snapshot hashes, readiness gates, linked evidence, downstream integrity decision/report/work-order traceability, review/approval timeline, and audit events.
- Updated the calculation run list to link users into the detail-level formula readiness workflow.

## Read-only boundary

The readiness endpoint is display-only. It does not write audit logs, insert review gates, update calculation runs, approve calculations, reject calculations, lock calculations, recalculate outputs, issue reports, create decisions, create work orders, or call n8n.

## Exclusions

RC4-O does not add formulas, API 579/API 581 quantitative logic, RBI quantitative logic, object-storage changes, schema migrations, external CMMS integration, automatic final-use approval, or AI/n8n/service finalization.

## Validation focus

- Calculation readiness endpoint exists and is protected by `calculation.read`.
- The endpoint is read-only.
- Calculation detail page shows readiness gates and formula traceability.
- Existing review/approval/report/work-order governance remains authoritative.
