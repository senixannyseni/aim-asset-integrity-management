# AIM RC4-E Validation-by-Asset UX, Validation History, and Data Dictionary Expansion Report

## Package

RC4-E — Validation-by-Asset UX, Validation History, and Data Dictionary Expansion.

## Baseline

RC3-A through RC3-J, RC4-A, RC4-B, RC4-C, and RC4-D are treated as merged, tagged, and closed. RC4-E does not reopen prior packages.

## Scope Completed

RC4-E completes the user-facing validation/readiness visibility layer:

- Validation overview route at `/validation`.
- Asset-specific validation route at `/assets/{assetId}/validation`.
- Validation history route at `/validation/history`.
- Searchable data dictionary route at `/data-dictionary`.
- Minimal read-only API adapters for validation history and asset-specific validation visibility.
- Data dictionary documentation expansion in `03_Database/data_dictionary_current.md`.
- UAT coverage in `docs/uat/uat_rc4e_validation_by_asset_history_data_dictionary.md`.

## Frontend Behavior

The validation overview shows dashboard counts, rule categories, affected entity groups, latest validation runs, and asset validation launcher. It states that validation is a control/readiness layer and is not engineering approval.

The asset-specific page shows asset context, latest validation result, grouped validation checks, field-level messages, unit-related warnings/errors, material completeness visibility, related links, and asset-specific validation history.

The validation history page is read-only. It supports filters by asset, entity type, status, severity, and date range where practical, and displays validation run details without allowing historical edits.

The data dictionary page is searchable and grouped by domain. It shows required/optional status, data type, units, validation summary, source table/entity, evidence linkage requirement, frontend/API usage, and governance notes.

## Backend/API Behavior

RC4-E adds minimal read-only API adapters:

- `GET /api/v1/engineering/validation-history`
- `GET /api/v1/engineering/validation-history/{validationRunId}`
- `GET /api/v1/assets/{assetId}/validation`

The existing `POST /api/v1/engineering/validate-input` remains the validation run creation endpoint. The adapters expose stored validation snapshots and latest asset validation state only. They do not introduce formulas, calculations, approvals, or schema changes.

## Data Dictionary Expansion

`03_Database/data_dictionary_current.md` now documents validation traceability for:

- Asset identity and tank metadata
- Tank geometry
- Shell courses
- Material master
- Inspection events
- Evidence metadata
- Evidence object-storage governance
- Evidence linkage
- NDT measurement fields
- NDT import fields
- Validation run/history fields
- Calculation input/output snapshot references
- Formula version references
- Review gate fields
- Integrity decision fields
- Report version/export fields
- Audit log fields

## Governance Confirmation

RC4-E preserves AIM governance boundaries:

- Validation may flag, warn, block, or route to review, but it does not approve engineering data automatically.
- No engineering calculations are introduced.
- No API, ASME, API 579, API 581, FFS, RBI, or regulatory formulas are introduced.
- No FFS/RBI trigger logic is introduced.
- No AI/n8n/service actor governance boundaries are changed.
- No backend schema or migration is introduced.
- AIM remains the system of record.
- n8n remains orchestration-only and must not write directly to PostgreSQL.
- AI extraction remains staging-first and cannot bypass human review.
- Evidence linkage remains mandatory.

## Known Limitations

- Validation history visibility depends on stored `validation_runs` snapshots.
- Asset-specific validation shows groups and field-level messages returned by the existing validation engine; it does not invent additional engineering checks.
- Data dictionary frontend includes RC4-E documentation expansion fields in addition to backend dictionary rows for traceability.
- Frontend filtering is UX-only; backend validation remains authoritative.
