# AIM Tank Integrity Data Dictionary — Current Implemented Schema

Status: Governance hardening baseline after Sprint 2. Sprint 3 Evidence/NDT functional tables are marked planned if not implemented in the current local repo.

## Governance Boundary

- AIM/PostgreSQL is the system of record for structured engineering data, metadata, workflow events, error logs, and audit logs.
- n8n may call AIM backend APIs only. n8n must not write directly to PostgreSQL.
- AI extraction output remains future/planned and must be stored in extraction/staging tables only when implemented.
- No engineering calculation or API/ASME formula is implemented in this hardening patch.

## Implemented Tables

| Table | Status | Owner Role | Notes |
|---|---|---|---|
| users | Implemented | admin | Demo identity baseline. Password auth is not production-ready yet. |
| roles | Implemented | admin | Includes admin, data_entry, inspector, engineer, senior_engineer, qa_qc, client_viewer, ai_agent. |
| permissions | Implemented | admin | Includes governance additions: workflow_event.create, error_log.create, error_log.read. |
| user_roles | Implemented | admin | Role assignment mapping. |
| role_permissions | Implemented | admin | RBAC permission mapping. |
| assets | Implemented | engineer | Tank asset master data. Uses `asset_tag` internally and exposes `tank_tag` in API response. |
| tank_geometry | Implemented | engineer | Tank geometry master data. Length values normalized to meters. |
| shell_courses | Implemented | engineer | Shell course master data. Height and thickness normalized to millimeters. |
| materials | Implemented | engineer / qa_qc | Material master selector. |
| inspection_events | Implemented baseline | inspector | Baseline table only; full workspace not implemented. |
| evidence_files | Implemented baseline | inspector | Metadata table exists; full evidence upload UI/API not implemented until Sprint 3. |
| evidence_links | Implemented baseline | inspector / engineer | Link table exists; linked entity validation will be enforced as routes are implemented. |
| formula_registry | Implemented baseline | senior_engineer / qa_qc | Placeholder registry only. No executable formula implemented. |
| calculation_runs | Implemented baseline | engineer | Baseline table only. No calculation engine implemented. |
| calculation_inputs | Implemented baseline | engineer | Baseline table only. |
| calculation_outputs | Implemented baseline | engineer | Baseline table only. |
| engineering_reviews | Implemented baseline | engineer | Baseline review record table. |
| approval_records | Implemented baseline | senior_engineer / qa_qc | Baseline approval table. Approval endpoints must be RBAC protected. |
| ffs_cases | Implemented baseline | senior_engineer | FFS trigger case shell only. No API 579 assessment implemented. |
| rbi_cases | Implemented baseline | engineer | RBI interface shell only. No API RP 581 quantitative RBI implemented. |
| audit_logs | Implemented | admin / qa_qc | Critical create/update/delete/governance actions write audit logs. |
| workflow_events | Implemented | admin / ai_agent / n8n service role | AIM API endpoint for n8n orchestration events. |
| error_logs | Implemented | admin / qa_qc / service role | AIM API endpoint for workflow/system error logging. |

## Future / Planned Tables

These are in the source-of-truth pack but not functionally implemented in this repo state:

| Table | Planned Sprint | Rule |
|---|---:|---|
| extraction_jobs | AI Extraction sprint | AI output must go to extraction/staging only. |
| extraction_fields | AI Extraction sprint | Every field requires source, confidence, and field_status. |
| staging_records | AI Extraction sprint | Engineer review required before promotion. |
| manual_overrides | AI Extraction sprint | Reviewer corrections require reason. |
| data_quality_checks | AI Extraction / staging sprint | Stores data quality validation outcomes. |
| ndt_measurements | Sprint 3 | Must require evidence gate for critical approval. |
| cml_points | Sprint 3+ | CML/TML location master. |
| thickness_readings | Sprint 3+ | Thickness reading detail table. |
| report_templates | Reporting sprint | No report generation in this patch. |
| reports | Reporting sprint | Issue gate requires evidence/calculation/review/approval. |
| report_versions | Reporting sprint | Issued report versions immutable. |
| internal_work_orders | Work Order sprint | MVP internal work order fallback before CMMS integration. |

## Important Current Field Notes

### assets

| Field | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | API exposes as asset_id. |
| asset_tag | text | yes | API exposes as tank_tag. |
| asset_name | text | yes | Required. |
| facility | text | yes | Required. |
| location / area | text | yes | API exposes location. |
| service_fluid | text | yes | Required. |
| tank_type | text | yes | Default expected value: aboveground_storage_tank. |
| original_design_code | text | yes | Example: API 650. No copyrighted clauses reproduced. |
| current_assessment_code | text | yes | Example: API 653. |
| code_edition | text | yes | Must be user-supplied; missing edition is validation failure. |
| operating_status | text | yes | in_service, out_of_service, mothballed, retired. |

### tank_geometry

Length values are normalized to meters internally. This table stores design basis data only and does not implement design formulas.

### shell_courses

Course height and thickness values are normalized to millimeters internally. Material and joint efficiency are mandatory because future calculations must not run on ambiguous master data.

### workflow_events

Every n8n workflow must post to `/api/v1/workflow-events`. This is an AIM API write, not direct DB access from n8n.

### error_logs

Every workflow/system failure must be recorded through `/api/v1/error-logs` or equivalent AIM backend API.

## Sprint 3 Implemented Tables — Evidence Repository and NDT Data Room

### evidence_files

Status: implemented / extended.

Key fields now used by Sprint 3:

| Field | Purpose | Notes |
|---|---|---|
| id | Evidence UUID | Primary key |
| evidence_code | Evidence convention ID | `EVD-{YYYY}-{running_number}` |
| asset_id | Linked asset | AIM system-of-record asset reference |
| inspection_event_id | Optional inspection reference | Nullable during early metadata registration |
| object_storage_uri | Original object-storage-compatible path | Required legacy field |
| object_storage_path | Current object storage path alias | Used by Sprint 3 UI/API |
| original_filename / file_name | Source filename | Original evidence file name |
| file_extension / file_type | File type | PDF, XLSX, CSV, JPG, PNG, DWG, DXF, STL, ZIP |
| mime_type | MIME type | Derived when not supplied |
| file_size_bytes | File size | 0 allowed for metadata-only MVP registration |
| checksum_sha256 / checksum | Checksum | Required for traceability |
| method | Inspection/NDT method | Example: UT thickness |
| component | Tank component | Example: shell course 1 |
| location | Evidence location reference | Example: orientation/elevation |
| inspection_date | Evidence inspection date | YYYY-MM-DD |
| page_figure_table_reference / page_or_sheet_ref | Source reference | Page/table/sheet reference |
| uploaded_by | User uploading metadata | Nullable in demo header mode |
| status / evidence_status | Evidence lifecycle state | active/superseded/delete_requested/deleted |

### evidence_links

Status: implemented.

Purpose: links evidence to AIM entities. Implemented validation checks target existence where the target table exists.

Supported `linked_entity_type` values:

- `asset`
- `inspection_event`
- `ndt_measurement`
- `calculation_run`
- `finding` *(planned target table; accepted as future placeholder)*
- `ffs_case`
- `rbi_case`

### ndt_measurements

Status: implemented.

| Field | Purpose | Notes |
|---|---|---|
| id | Measurement UUID | Primary key |
| measurement_code | NDT measurement code | `NDT-000001` style local sequence |
| asset_id | Tank asset | Required |
| inspection_event_id | Inspection event | Optional |
| component | Tank component | Required |
| shell_course_no | Shell course number | Optional positive integer |
| cml_tml_id | CML/TML identifier | Optional |
| grid_ref | Grid reference | Optional |
| elevation_m | Elevation | Stored internally in meters |
| orientation | Orientation | Free text, e.g. `90 deg` |
| measured_thickness_mm | Thickness | Stored internally in millimeters |
| reading_date | NDT reading date | Required |
| method | NDT method | Required |
| confidence | Source confidence | 0–1 |
| evidence_file_id | Direct evidence | Optional, but critical approval requires direct evidence or evidence_links |
| extraction_source | Source of data | manual, bulk_import, ai_staging, vendor_import |
| reviewer_status | Review/approval state | needs_review, reviewed, rejected, approved |
| validation_status | Evidence validation result | not_validated, valid, warning, blocked |
| validation_message | Human-readable validation result | Used by UI and API |
| is_critical | Criticality flag | Critical records require evidence before approval |
| created_by/reviewed_by/approved_by | Human/user traceability | AI agent cannot approve |

## Sprint 3 Boundary Notes

- No engineering calculation is implemented.
- No API/ASME formula is implemented.
- Evidence file binary upload is not implemented in this local MVP patch; AIM stores object-storage-compatible metadata/path.
- Critical NDT records cannot be approved without direct evidence or linked evidence.
