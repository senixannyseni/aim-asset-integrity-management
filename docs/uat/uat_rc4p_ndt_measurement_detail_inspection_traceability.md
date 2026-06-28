# UAT — RC4-P NDT Measurement Detail + Inspection Traceability Readiness

## Precondition

Use a user with `ndt.read`. Use existing NDT measurements with and without evidence, inspection event links, findings, and calculation input usage.

## Test steps

1. Open `/ndt` and confirm the NDT list mentions Inspection Traceability Readiness.
2. Open an NDT measurement detail page `/ndt/{measurementId}`.
3. Confirm the page loads measurement metadata, measured thickness, component, CML/TML/grid, and inspection event reference.
4. Confirm readiness gates are visible.
5. Confirm evidence linkage appears and missing/cross-asset evidence is clearly indicated.
6. Confirm findings/anomalies linked to the measurement are displayed when present.
7. Confirm calculation input usage is displayed when deterministic calculations consumed the measurement.
8. Confirm review/approval trace and audit timeline are displayed when present.
9. Confirm the page does not expose approve/reject/correct/calculate/report issue/work-order closure controls.
10. Confirm no API 579/API 581/FFS/RBI/corrosion-rate/remaining-life calculation is performed.
11. Confirm AI/n8n/service actors cannot finalize NDT measurement readiness.

## Acceptance criteria

- `GET /api/v1/ndt/measurements/{measurementId}/readiness` returns a read-only readiness preview.
- The frontend shows Inspection Traceability Readiness without mutation controls.
- Existing NDT approval and review endpoints remain authoritative.
- AIM remains the system of record.
