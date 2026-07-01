# AIM Tank Integrity Data Dictionary — Current Implemented Schema Through Sprint 8.5

Status: aligned to the implemented AIM+n8n Tank Integrity Module baseline through Sprint 8.5.

Completed implementation state covered by this dictionary:

- Foundation Sprint — monorepo, RBAC baseline, core PostgreSQL schema, seed data, health checks.
- Sprint 2 — Tank Asset Register and Engineering Master Data.
- Governance Hardening — workflow events, error logs, API/OpenAPI baseline, and AIM/n8n boundary hardening.
- Sprint 3 — Evidence Repository and NDT Data Room.
- Sprint 4 — Engineering Data Dictionary and Validation Engine.
- Sprint 5 — Formula Registry.
- Sprint 5.5 — baseline reproducibility and documentation alignment.
- Sprint 6 — deterministic universal calculation engine and calculation traceability records.
- Sprint 7 — API 579-1/ASME FFS-1 trigger workflow governance cases.
- Sprint 8 — API RP 580/581 RBI interface and trigger workflow governance cases.
- Sprint 8.5 — evidence linkage and security boundary hardening.

## Governance Boundary

- AIM/PostgreSQL is the system of record for structured engineering data, metadata, workflow events, error logs, validation snapshots, formula registry metadata, and audit logs.
- n8n may call AIM backend APIs only. n8n must not write directly to PostgreSQL.
- AI extraction/staging workflow exists within AIM API governance boundaries. AI output must go to extraction/staging tables only and must not write final engineering tables directly.
- AI must not approve engineering data, NDT records, formulas, calculations, integrity decisions, or reports.
- No API/API-ASME formula expression is hard-coded or invented in this schema. Formula Registry stores controlled metadata and fixtures only unless an authorized engineer enters licensed/approved source content.
- Universal deterministic engineering calculations are implemented for AIM-owned screening logic only. Report issue gates, internal work-order fallback, AI extraction/staging runtime, and RC3-B evidence/report object storage are implemented inside AIM governance. API/API-ASME formula execution, external CMMS integration, full FFS calculations, and quantitative API RP 581 calculations remain outside the implemented baseline.

## Implemented Table Inventory

| Table | Status | Primary Owner Role | Notes |
|---|---|---|---|
| users | Implemented | admin / IT admin | DB-backed JWT/RBAC user baseline with local demo fallback gated by RC3-A configuration. Enterprise SSO/MFA remains future hardening. |
| roles | Implemented | admin | Stores role master data. |
| permissions | Implemented | admin | Stores permission master data used by RBAC middleware. |
| user_roles | Implemented | admin | User-to-role mapping. |
| role_permissions | Implemented | admin | Role-to-permission mapping. |
| assets | Implemented | engineer / senior_engineer | Tank asset master data. API exposes `asset_id` and `tank_tag` while DB uses `id` and `asset_tag`. |
| tank_geometry | Implemented | engineer | Tank geometry/design basis master data. Length values are normalized to meters. |
| shell_courses | Implemented | engineer | Shell course master data. Thickness and course height values are normalized to millimeters. |
| materials | Implemented | engineer / qa_qc | Material reference selector with Sprint 4 allowable-stress readiness fields. |
| evidence_files | RC3-B implemented | inspector / engineer | Evidence metadata, object key, bucket, checksum, upload/access status, and traceability registry. Original binaries are stored in private S3-compatible object storage. |
| evidence_links | Implemented | inspector / engineer | Evidence-to-entity traceability table. Same-asset linkage is enforced for asset, inspection_event, ndt_measurement, calculation_run, ffs_case, and rbi_case targets. Used by NDT approval evidence gate. |
| ndt_measurements | Implemented | inspector / engineer / qa_qc | NDT UT thickness measurement records with review/approval status and evidence gate. |
| workflow_events | Implemented | service / admin | AIM API event intake for n8n orchestration events. |
| error_logs | Implemented | service / admin / qa_qc | AIM API error/failure logging baseline. |
| engineering_data_dictionary | Implemented | senior_engineer / qa_qc | Field registry used by deterministic validation. |
| validation_runs | Implemented | engineer / senior_engineer / qa_qc | Stores validation result snapshots. |
| formula_registry | Implemented | admin / senior_engineer | Controlled formula metadata/versioning registry. No executable API/API-ASME formulas are embedded. |
| formula_test_runs | Implemented | admin / senior_engineer | Fixture formula test-run records. No API/API-ASME formula execution. |
| calculation_runs | Sprint 6 implemented | engineer / senior_engineer | Deterministic calculation run headers, input snapshot hash, formula version trace, validation status, output summary, review/approval fixtures, and lock protection. |
| calculation_inputs | Sprint 6 implemented | engineer / senior_engineer | Field-level normalized calculation inputs, including NDT source entity and evidence reference where available. |
| calculation_outputs | Sprint 6 implemented | engineer / senior_engineer | Field-level deterministic outputs and engineering warnings. |
| ffs_trigger_rules | Sprint 7 implemented | senior_engineer | Configured trigger rules for FFS case creation. Trigger only; no fitness declaration. |
| ffs_cases | Sprint 7 implemented | engineer / senior_engineer | FFS trigger workflow cases requiring engineer review and senior engineer/admin final disposition approval. |
| rbi_trigger_rules | Sprint 8 implemented | senior_engineer / lead_engineer | Configured RBI interface trigger rules mapped to deterministic calculation warnings and engineering review. No quantitative API RP 581 rules. |
| rbi_cases | Sprint 8 implemented | engineer / senior_engineer / lead_engineer | RBI interface workflow cases with qualitative/semi-quantitative fixture inputs, risk category, recommended interval, inspection plan reference, reviewer, approver, and calculation/evidence links. |
| audit_logs | Implemented | admin / qa_qc | Audit trail for critical create/update/delete/review/approval/governance actions. |

Supporting baseline tables also exist in the clean-clone schema and are used as references or future integration points: `inspection_events`, `engineering_reviews`, and `approval_records`. Sprint 6 promotes `calculation_runs`, `calculation_inputs`, and `calculation_outputs` from supporting schema to implemented deterministic calculation traceability tables. Sprint 7 promotes `ffs_cases` to an implemented FFS trigger workflow governance table and adds `ffs_trigger_rules`. Sprint 8 promotes `rbi_cases` to an implemented RBI interface workflow table and adds `rbi_trigger_rules`.

## Role and Access Tables

### users

| Field | Type | Required | Key / Reference | Notes |
|---|---|---:|---|---|
| id | uuid | yes | PK | Internal user identifier. |
| email | text | yes | unique | User email. Demo-only identity baseline. |
| full_name | text | yes |  | User display name. |
| password_hash | text | yes |  | Password hash used by the DB-backed auth baseline; production hardening may replace or extend this with SSO/MFA. |
| status | text | yes | allowed: active, inactive, locked | User lifecycle. |
| created_at | timestamptz | yes | default now() | Creation timestamp. |
| updated_at | timestamptz | yes | default now() | Last update timestamp. |

### roles

| Field | Type | Required | Key / Reference | Notes |
|---|---|---:|---|---|
| id | uuid | yes | PK | Role identifier. |
| role_code | text | yes | unique | Includes `admin`, `data_entry`, `inspector`, `engineer`, `senior_engineer`, `qa_qc`, `client_viewer`, `ai_agent`. |
| role_name | text | yes |  | Human-readable role name. |
| description | text | no |  | Role description. |
| created_at | timestamptz | yes | default now() | Creation timestamp. |

### permissions

| Field | Type | Required | Key / Reference | Notes |
|---|---|---:|---|---|
| id | uuid | yes | PK | Permission identifier. |
| permission_code | text | yes | unique | Permission code consumed by RBAC middleware. |
| description | text | no |  | Permission description. |
| created_at | timestamptz | yes | default now() | Creation timestamp. |

Implemented permission families include:

- Asset: `asset.read`, `asset.create`, `asset.update`, `asset.delete`, `asset.approve`.
- Inspection/evidence/NDT: `inspection.read`, `inspection.create`, `inspection.update`, `inspection.approve`, `evidence.read`, `evidence.upload`, `evidence.link`, `evidence.open`, `ndt.read`, `ndt.create`, `ndt.import`, `ndt.review`, `ndt.approve`.
- Validation/formula: `validation.read`, `validation.run`, `formula.read`, `formula.create`, `formula.update`, `formula.approve`, `formula.retire`, `formula.test`.
- Governance/operations: `workflow_event.create`, `error_log.create`, `error_log.read`, `audit.read`.

### user_roles

| Field | Type | Required | Key / Reference | Notes |
|---|---|---:|---|---|
| user_id | uuid | yes | PK/FK users.id | User receiving the role. |
| role_id | uuid | yes | PK/FK roles.id | Assigned role. |
| assigned_at | timestamptz | yes | default now() | Assignment timestamp. |

### role_permissions

| Field | Type | Required | Key / Reference | Notes |
|---|---|---:|---|---|
| role_id | uuid | yes | PK/FK roles.id | Role granted the permission. |
| permission_id | uuid | yes | PK/FK permissions.id | Granted permission. |
| granted_at | timestamptz | yes | default now() | Grant timestamp. |

Formula Registry RBAC policy in this baseline: `admin` and `senior_engineer` may create/update/approve/deprecate/test formulas. `qa_qc` has formula read/audit visibility only and cannot approve formulas. `ai_agent` cannot approve formulas.

## Asset and Engineering Master Data

### assets

| Field | Type | Required | Key / Reference | Unit | Notes |
|---|---|---:|---|---|---|
| id | uuid | yes | PK |  | API exposes as `asset_id`. |
| asset_tag | text | yes | unique |  | API exposes as `tank_tag`. |
| asset_name | text | yes |  |  | Tank name. |
| asset_type | text | yes | allowed: aboveground_storage_tank |  | MVP is aboveground storage tank only. |
| facility | text | conditional |  |  | Required by Sprint 2 validation/UI. |
| area | text | no |  |  | Legacy area field. |
| location | text | conditional |  |  | Sprint 2 location field used by UI/API. |
| service_fluid | text | conditional |  |  | Service fluid. |
| status | text | yes | draft, active, inactive, retired, approved |  | Legacy lifecycle state. |
| design_code | text | no |  |  | Legacy design code. |
| design_code_edition | text | no |  |  | Legacy design edition. |
| original_design_code | text | conditional |  |  | Example high-level code basis such as API 650; no clauses reproduced. |
| current_assessment_code | text | conditional |  |  | Example high-level assessment basis such as API 653. |
| code_edition | text | required for validation |  |  | Must be user-supplied; AIM must not infer standard edition. |
| tank_type | text | conditional |  |  | Expected: aboveground_storage_tank. |
| construction_year | integer | optional |  | year | Construction year. |
| owner | text | conditional |  |  | Business owner text. |
| operating_status | text | conditional | allowed: in_service, out_of_service, mothballed, retired |  | Operational status used by UI/API. |
| inspection_due_date | date | optional |  | date | Next inspection due date. |
| owner_user_id | uuid | optional | FK users.id |  | Legacy owner user reference. |
| approved_by | uuid | optional | FK users.id |  | Human approval reference. |
| approved_at | timestamptz | optional |  |  | Approval timestamp. |
| deleted_at | timestamptz | optional |  |  | Soft-delete timestamp. |
| deleted_by | uuid | optional | FK users.id |  | Soft-delete actor. |
| created_at | timestamptz | yes | default now() |  | Creation timestamp. |
| updated_at | timestamptz | yes | default now() |  | Last update timestamp. |

Validation notes: missing `code_edition`, required design basis fields, and ambiguous asset state may produce warning or blocking validation depending on validation scope.

### tank_geometry

| Field | Type | Required | Key / Reference | Unit | Notes |
|---|---|---:|---|---|---|
| id | uuid | yes | PK |  | Geometry record ID. |
| asset_id | uuid | yes | unique/FK assets.id |  | One geometry record per asset. |
| diameter_m | numeric(12,4) | conditional |  | m | Tank diameter normalized to meters. Missing diameter blocks calculation readiness. |
| height_m | numeric(12,4) | optional |  | m | Legacy total height field. |
| shell_height_m | numeric(12,4) | conditional |  | m | Shell height normalized to meters. Missing shell height blocks calculation readiness. |
| nominal_capacity_m3 | numeric(14,4) | optional |  | m3 | Nominal capacity. |
| design_liquid_level_m | numeric(12,4) | optional |  | m | Design liquid level. |
| number_of_courses | integer | optional |  | count | Number of shell courses. |
| bottom_type | text | optional |  |  | Bottom configuration reference. |
| roof_type | text | optional |  |  | Roof type reference. |
| foundation_type | text | optional |  |  | Foundation type reference. |
| construction_year | integer | optional |  | year | Geometry-level construction year. |
| design_pressure_kpa | numeric(12,4) | optional |  | kPa | Design pressure. No design formula is implemented. |
| design_temperature_c | numeric(12,4) | optional |  | deg C | Design temperature. |
| specific_gravity | numeric(8,4) | optional |  | ratio | Product specific gravity. |
| vacuum_design_basis | text | optional |  |  | User-entered design basis note. |
| unit_system | text | yes | default metric |  | Current implementation normalizes to metric. |
| source_evidence_id | uuid | optional |  |  | Legacy evidence reference; use evidence_links for traceability where possible. |
| status | text | yes | draft, in_review, approved, rejected |  | Geometry review state. |
| created_at | timestamptz | yes | default now() |  | Creation timestamp. |
| updated_at | timestamptz | yes | default now() |  | Last update timestamp. |

### shell_courses

| Field | Type | Required | Key / Reference | Unit | Notes |
|---|---|---:|---|---|---|
| id | uuid | yes | PK |  | Shell course record ID. |
| asset_id | uuid | yes | FK assets.id; unique with course_no |  | Parent tank asset. |
| course_no | integer | yes | check > 0 | count | Shell course number. |
| material_id | uuid | conditional | FK materials.id |  | Required for calculation readiness when material properties are needed. |
| nominal_thickness_mm | numeric(10,3) | conditional |  | mm | Nominal thickness normalized to millimeters. |
| minimum_required_thickness_mm | numeric(10,3) | optional |  | mm | Baseline/future calculation input. No formula implemented. |
| measured_min_thickness_mm | numeric(10,3) | conditional |  | mm | Measured minimum thickness. |
| height_mm | numeric(12,3) | optional |  | mm | Legacy height field. |
| course_height_mm | numeric(12,3) | conditional |  | mm | Course height normalized to millimeters. |
| material_specification | text | conditional |  |  | Material specification text copied from material master if not supplied. |
| joint_efficiency | numeric(6,4) | conditional |  | ratio | Must not be inferred. Missing joint efficiency can block validation. |
| corrosion_allowance_mm | numeric(10,3) | optional |  | mm | Corrosion allowance. |
| coating_lining_status | text | optional |  |  | Coating/lining condition status. |
| unit_system | text | yes | default metric |  | Current implementation normalizes to metric. |
| source_evidence_id | uuid | optional |  |  | Legacy direct evidence reference. |
| status | text | yes | draft, in_review, approved, rejected |  | Shell course review state. |
| created_at | timestamptz | yes | default now() |  | Creation timestamp. |
| updated_at | timestamptz | yes | default now() |  | Last update timestamp. |

### materials

| Field | Type | Required | Key / Reference | Unit | Notes |
|---|---|---:|---|---|---|
| id | uuid | yes | PK |  | Material record ID. |
| material_code | text | yes | unique |  | Material code. |
| material_name | text | yes |  |  | Material name. |
| material_specification | text | optional |  |  | Specification reference text. |
| material_family | text | optional |  |  | Example: carbon_steel. |
| material_allowable_stress_mpa | numeric(12,3) | conditional |  | MPa | Required only when an approved Formula Registry object explicitly requires it. Do not invent values. |
| allowable_stress_basis | text | conditional |  |  | Engineer-approved basis for allowable stress when used. |
| notes | text | optional |  |  | Notes and applicability warning. |
| is_active | boolean | yes | default true |  | Active selector flag. |
| created_at | timestamptz | yes | default now() |  | Creation timestamp. |
| updated_at | timestamptz | yes | default now() |  | Last update timestamp. |

## Evidence Repository and NDT Data Room

### evidence_files

| Field | Type | Required | Key / Reference | Notes |
|---|---|---:|---|---|
| id | uuid | yes | PK | Evidence file metadata ID. |
| evidence_code | text | yes | unique | Evidence convention ID such as `EVD-{YYYY}-{running_number}`. |
| asset_id | uuid | optional | FK assets.id | Asset reference. |
| inspection_event_id | uuid | optional | FK inspection_events.id | Inspection event reference. |
| object_storage_uri | text | yes | unique with checksum_sha256 | Legacy object storage URI. |
| object_storage_path | text | conditional |  | Current object-storage-compatible path alias used by Sprint 3 API/UI. |
| original_filename | text | yes |  | Original source filename. |
| file_name | text | conditional |  | Current filename alias used by Sprint 3 API/UI. |
| file_extension | text | yes |  | Legacy file extension. |
| file_type | text | conditional |  | Normalized file type: PDF, XLSX, CSV, JPG, PNG, DWG, DXF, STL, ZIP. |
| mime_type | text | yes |  | MIME type. |
| file_size_bytes | bigint | yes | check >= 0 | File size. RC3-B gate-eligible evidence must also have verified `size_bytes` from object storage. |
| checksum_sha256 | text | yes | unique with object_storage_uri | Legacy checksum. |
| checksum | text | conditional |  | Current checksum alias used by Sprint 3 API/UI. |
| method | text | optional |  | Inspection/NDT method. |
| component | text | optional |  | Tank component reference. |
| cml_tml_grid_reference | text | optional |  | CML/TML/grid reference. |
| location | text | optional |  | Evidence location. |
| inspection_date | date | optional |  | Evidence/inspection date. |
| page_figure_table_reference | text | optional |  | Legacy page/figure/table reference. |
| page_or_sheet_ref | text | optional |  | Current page/sheet reference alias. |
| evidence_category | text | optional |  | Category label for UI/API filtering. |
| uploaded_by | uuid | optional | FK users.id | Uploading user. |
| status | text | yes | active, superseded, delete_requested, deleted | Legacy lifecycle status. |
| evidence_status | text | optional |  | Current lifecycle alias. |
| created_at | timestamptz | yes | default now() | Creation timestamp. |
| updated_at | timestamptz | yes | default now() | Last update timestamp. |

Evidence governance notes:

- AIM stores metadata, object storage path/URI, checksum, and traceability data.
- Binary object storage and signed URL handling remain storage-layer work; this baseline uses a governed boundary instead of production object upload streaming.
- Evidence deletion remains restricted by governance and should require approval in future hardening.

### evidence_links

| Field | Type | Required | Key / Reference | Notes |
|---|---|---:|---|---|
| id | uuid | yes | PK | Evidence link record ID. |
| evidence_file_id | uuid | yes | FK evidence_files.id | Linked evidence file. |
| linked_entity_type | text | yes | unique with evidence_file_id + linked_entity_id | Supported values include `asset`, `inspection_event`, `ndt_measurement`, `calculation_run`, `finding`, `ffs_case`, `rbi_case`. |
| linked_entity_id | uuid | yes |  | Target entity ID. Existence is validated where implemented. |
| link_reason | text | yes |  | Reason for traceability link. |
| linked_by | uuid | optional | FK users.id | User who linked the evidence. |
| created_at | timestamptz | yes | default now() | Link timestamp. |

### ndt_measurements

| Field | Type | Required | Key / Reference | Unit | Notes |
|---|---|---:|---|---|---|
| id | uuid | yes | PK |  | Measurement UUID. |
| measurement_code | text | yes | unique |  | Human-readable NDT measurement code. |
| asset_id | uuid | yes | FK assets.id |  | Parent tank asset. |
| inspection_event_id | uuid | optional | FK inspection_events.id |  | Inspection event reference. |
| component | text | yes |  |  | Component, e.g. shell. |
| shell_course_no | integer | optional | check > 0 | count | Shell course number. |
| cml_tml_id | text | optional |  |  | CML/TML identifier. |
| grid_ref | text | optional |  |  | Grid reference. |
| elevation_m | numeric(12,4) | optional |  | m | Elevation normalized to meters. |
| orientation | text | optional |  |  | Orientation, e.g. `90 deg`. |
| measured_thickness_mm | numeric(10,3) | yes | check > 0 | mm | Thickness normalized to millimeters. |
| reading_date | date | yes |  | date | Reading date. |
| method | text | yes |  |  | NDT method, e.g. UT thickness. |
| confidence | numeric(5,4) | yes | 0 to 1 | ratio | Data confidence. |
| evidence_file_id | uuid | optional | FK evidence_files.id |  | Direct evidence reference. Critical approval requires direct evidence or evidence_links. |
| extraction_source | text | yes | manual, bulk_import, ai_staging, vendor_import |  | Source of NDT record. Allowed values are validated before insert/update; `ai_staging` identifies records promoted from reviewed AI staging output. |
| reviewer_status | text | yes | needs_review, reviewed, rejected, approved |  | Review/approval state. |
| validation_status | text | yes | not_validated, valid, warning, blocked |  | Validation state. |
| validation_message | text | optional |  |  | Human-readable validation message. |
| is_critical | boolean | yes | default true |  | Critical records require evidence before approval. |
| created_by | uuid | optional | FK users.id |  | Creator. |
| reviewed_by | uuid | optional | FK users.id |  | Reviewer. |
| approved_by | uuid | optional | FK users.id |  | Approver. AI agent cannot approve. |
| reviewed_at | timestamptz | optional |  |  | Review timestamp. |
| approved_at | timestamptz | optional |  |  | Approval timestamp. |
| created_at | timestamptz | yes | default now() |  | Creation timestamp. |
| updated_at | timestamptz | yes | default now() |  | Last update timestamp. |

Approval/evidence gate: critical NDT records cannot be approved unless either `evidence_file_id` is present and valid for the same asset or a valid same-asset `evidence_links` record exists for the NDT measurement. Cross-asset linked evidence is blocked with `CROSS_ASSET_EVIDENCE_LINK_BLOCKED`.

## Workflow and Error Governance

### workflow_events

| Field | Type | Required | Key / Reference | Notes |
|---|---|---:|---|---|
| id | uuid | yes | PK | Workflow event record ID. |
| workflow_event_code | text | yes | unique | Event code. |
| workflow_id | text | yes |  | n8n or workflow catalog ID. |
| workflow_name | text | optional |  | Human-readable workflow name. |
| event_type | text | yes |  | Workflow event type. |
| event_status | text | yes | received, accepted, rejected, processed, failed | Event processing status. |
| source_system | text | yes | default n8n | Source system. n8n must call AIM API. |
| related_entity_type | text | optional |  | Related AIM entity type. |
| related_entity_id | uuid | optional |  | Related AIM entity ID. |
| payload_json | jsonb | yes | default {} | Event payload snapshot. |
| created_by | uuid | optional | FK users.id | Actor/service user. |
| created_at | timestamptz | yes | default now() | Event timestamp. |

### error_logs

| Field | Type | Required | Key / Reference | Notes |
|---|---|---:|---|---|
| id | uuid | yes | PK | Error log ID. |
| error_code | text | yes |  | Error code. |
| error_message | text | yes |  | Error message. |
| severity | text | yes | low, medium, high, critical | Severity. |
| source_module | text | yes |  | Source module. |
| source_system | text | yes | default aim | Source system. |
| related_entity_type | text | optional |  | Related AIM entity type. |
| related_entity_id | uuid | optional |  | Related AIM entity ID. |
| workflow_event_id | uuid | optional | FK workflow_events.id | Related workflow event. |
| request_id | text | optional |  | Request/correlation ID. |
| stack_trace | text | optional |  | Development diagnostic field; production hygiene should avoid exposing sensitive stack details. |
| payload_json | jsonb | yes | default {} | Error payload snapshot. |
| status | text | yes | open, triaged, resolved, ignored | Error lifecycle. |
| created_by | uuid | optional | FK users.id | Actor/service user. |
| created_at | timestamptz | yes | default now() | Error timestamp. |
| resolved_at | timestamptz | optional |  | Resolution timestamp. |

## Engineering Validation

### engineering_data_dictionary

| Field | Type | Required | Key / Reference | Notes |
|---|---|---:|---|---|
| id | uuid | yes | PK | Field registry record ID. |
| group_name | text | yes |  | Validation group: asset, geometry, shell_course, material, ndt, evidence, formula, approval. |
| field_name | text | yes | unique | Canonical field name. |
| label | text | yes |  | Human-readable label. |
| unit | text | optional |  | Canonical unit when applicable. |
| data_type | text | yes |  | Expected data type. |
| allowed_range_json | jsonb | optional |  | Deterministic range metadata. |
| required_status | text | yes | required, conditional, optional, future | Requiredness rule. |
| source_preference | text | yes | default engineer_entered | Preferred source of field value. |
| validation_severity | text | yes | info, warning, blocking | Default validation severity. |
| engineering_note | text | yes |  | Engineering governance note. |
| is_active | boolean | yes | default true | Active field registry flag. |
| created_at | timestamptz | yes | default now() | Creation timestamp. |
| updated_at | timestamptz | yes | default now() | Last update timestamp. |

Validation examples currently represented: missing code edition, missing tank diameter/shell height, missing joint efficiency, missing material allowable stress when required, missing NDT evidence, formula registry readiness, and final approval blocking gate.

### validation_runs

| Field | Type | Required | Key / Reference | Notes |
|---|---|---:|---|---|
| id | uuid | yes | PK | Validation run ID. |
| run_code | text | yes | unique | Validation run code. |
| validation_scope | text | yes | default general | Scope such as general, calculation_readiness, thickness_check, final_approval. |
| asset_id | uuid | optional | FK assets.id | Validated asset, when applicable. |
| request_payload_json | jsonb | yes |  | Input/context snapshot. |
| result_json | jsonb | yes |  | Deterministic validation result snapshot. |
| blocking_count | integer | yes | default 0 | Count of blocking issues. |
| warning_count | integer | yes | default 0 | Count of warnings. |
| info_count | integer | yes | default 0 | Count of info messages. |
| run_by | uuid | optional | FK users.id | User who triggered validation. |
| created_at | timestamptz | yes | default now() | Run timestamp. |

## Formula Registry

### formula_registry

| Field | Type | Required | Key / Reference | Notes |
|---|---|---:|---|---|
| id | uuid | yes | PK | Formula record UUID. |
| formula_id | text | conditional | unique with version | Stable logical formula identifier used by APIs. |
| formula_code | text | conditional |  | Legacy/formula code alias. |
| formula_name | text | yes |  | Formula name. |
| code_basis | text | yes |  | High-level engineering/code basis reference. No standard clauses reproduced. |
| code_edition | text | conditional |  | User-supplied licensed edition reference. |
| edition | text | optional |  | Legacy/alias edition field. |
| clause_reference | text | yes |  | High-level clause/reference identifier only; do not reproduce copyrighted text. |
| component | text | optional |  | Component, e.g. shell. |
| damage_mechanism | text | optional |  | Damage mechanism or governance category. |
| formula_type | text | yes | universal_deterministic, api_controlled, rbi_rule, ffs_trigger, report_phrase_rule | Formula governance type. |
| expression_type | text | yes | none, controlled_guardrail, engineer_entered, json_logic, text_rule | Expression classification. |
| expression_body | text | optional |  | Controlled expression body or fixture. API/API-ASME formulas must remain fixture unless licensed/approved by authorized engineer. |
| formula_expression_source | text | yes | default licensed_engineer_entry_required | Required source traceability field for expression governance. |
| formula_expression | text | optional |  | Legacy expression field. Not used to invent formulas. |
| input_schema | jsonb | yes | default {} | Current input schema metadata. |
| output_schema | jsonb | yes | default {} | Current output schema metadata. |
| inputs_schema | jsonb | optional |  | Legacy input schema alias. |
| outputs_schema | jsonb | optional |  | Legacy output schema alias. |
| unit_rules | jsonb | yes | default {} | Current unit normalization/validation metadata. |
| units_schema | jsonb | optional |  | Legacy units schema alias. |
| validation_rules | jsonb | yes | default {} / [] | Validation metadata. |
| blocking_rules | jsonb | yes | default [] | Blocking governance rules. |
| test_case_reference | text | optional |  | Reference to approved validation workbook/fixture. |
| status | text | yes | draft, under_review, approved, deprecated, locked | Formula lifecycle. Draft/deprecated formulas must not be used for production calculation, and Sprint 6 deterministic execution is limited to approved/locked `universal_deterministic` formulas. Sprint 7 FFS trigger workflow does not execute FFS formulas. |
| version | text | yes | unique with formula_id | Formula version. Editing approved formula creates a new version. |
| effective_date | date | optional |  | Effective date. |
| approved_by | uuid | optional | FK users.id | Human approver. AI agent cannot approve. |
| approval_date | timestamptz | optional |  | Approval timestamp. |
| approver_id | uuid | optional | FK users.id | Legacy approver field. |
| approved_at | timestamptz | optional |  | Legacy approval timestamp. |
| locked_flag | boolean | yes | default false | Locked formulas cannot be overwritten. Revisions must create a new record/version. |
| previous_formula_record_id | uuid | optional | FK formula_registry.id | Previous version linkage. |
| created_by | uuid | optional | FK users.id | Creator. |
| updated_by | uuid | optional | FK users.id | Last updater. |
| created_at | timestamptz | yes | default now() | Creation timestamp. |
| updated_at | timestamptz | yes | default now() | Last update timestamp. |

Formula Registry governance:

- API-controlled formulas must not embed copyrighted standard text or invented expressions.
- `expression_body` may be a controlled fixture for API-controlled formulas.
- `formula_expression_source` must identify the controlled source approach, e.g. licensed standard manual entry, engineer-approved workbook, or approved fixture.
- Production calculation may query only approved/locked, versioned formulas. Sprint 6 implements a universal deterministic calculation engine only; API/API-ASME formula execution remains prohibited unless a future controlled executor is explicitly implemented.

### formula_test_runs

| Field | Type | Required | Key / Reference | Notes |
|---|---|---:|---|---|
| id | uuid | yes | PK | Formula test run ID. |
| formula_record_id | uuid | yes | FK formula_registry.id | Tested formula record. |
| run_code | text | yes | unique | Test run code. |
| test_case_reference | text | optional |  | Validation workbook/fixture reference. |
| input_snapshot_json | jsonb | yes | default {} | Fixture input snapshot. |
| output_snapshot_json | jsonb | yes | default {} | Fixture output snapshot. |
| result_status | text | yes | fixture, passed, failed, blocked | Test run state. Current runner is fixture only. |
| message | text | yes |  | Test run message. |
| run_by | uuid | optional | FK users.id | User who ran the fixture test. |
| created_at | timestamptz | yes | default now() | Test run timestamp. |

## Deterministic Calculation Engine

### calculation_runs

| Field | Type | Required | Key / Reference | Notes |
|---|---|---:|---|---|
| id | uuid | yes | PK | Calculation run record ID. |
| run_id | text | yes | unique | Human-readable run identifier generated by Sprint 6. |
| asset_id | uuid | yes | FK assets.id | Asset being calculated. |
| inspection_event_id | uuid | optional | FK inspection_events.id | Related inspection event when available. |
| formula_registry_id | uuid | yes | FK formula_registry.id | Approved/locked Formula Registry record used by the deterministic engine. |
| run_version | integer | yes | unique with asset/formula | Revision number; locked runs are not overwritten. |
| status / run_status | text | yes |  | Calculation lifecycle state. |
| formula_set_version | text | yes |  | Formula ID/version string used for traceability. |
| input_snapshot_hash | text | yes | indexed | SHA-256 hash of the canonical input snapshot. |
| validation_status | text | yes |  | `passed` or `blocked` deterministic validation result. |
| output_summary | jsonb | yes |  | Summary counts, trigger candidates, and interval fixture output. |
| input_snapshot_json | jsonb | yes |  | Raw calculation request/context snapshot. |
| unit_normalized_input_json | jsonb | yes |  | Unit-normalized inputs used by the deterministic engine. |
| validation_result_json | jsonb | yes |  | Validation result used before calculation output. |
| warnings_json | jsonb | yes |  | Engineering warnings generated by deterministic rules. |
| review_status / approval_status | text | yes |  | Review/approval fixtures for future governance sprint. |
| initiated_by / created_by | uuid | optional | FK users.id | User initiating the run. |
| locked_flag | boolean | yes | protected by trigger | Locked calculation records cannot be modified or deleted. |
| created_at | timestamptz | yes | default now() | Creation timestamp. |

### calculation_inputs

| Field | Type | Required | Key / Reference | Notes |
|---|---|---:|---|---|
| id | uuid | yes | PK | Calculation input row ID. |
| calculation_run_id | uuid | yes | FK calculation_runs.id | Parent calculation run. |
| input_name | text | yes |  | Normalized input field path. |
| raw_value | text | optional |  | Serialized raw source row. |
| normalized_value | numeric | optional |  | Numeric normalized value. |
| raw_unit / normalized_unit | text | optional |  | Unit traceability. |
| source_entity_type | text | optional |  | Example: `ndt_measurement`. |
| source_entity_id | uuid | optional | entity reference | NDT measurement UUID when available. |
| evidence_file_id | uuid | optional | FK evidence_files.id | Evidence file used by the source input when available. |
| validation_status | text | yes |  | `valid`, `warning`, or `blocked`. |
| created_at | timestamptz | yes | default now() | Creation timestamp. |

### calculation_outputs

| Field | Type | Required | Key / Reference | Notes |
|---|---|---:|---|---|
| id | uuid | yes | PK | Calculation output row ID. |
| calculation_run_id | uuid | yes | FK calculation_runs.id | Parent calculation run. |
| output_name | text | yes |  | Output field path. |
| output_value | numeric | optional |  | Numeric output where applicable. |
| output_unit | text | optional |  | Output unit. |
| output_json | jsonb | yes |  | Structured output row. |
| warning_code / warning_message | text | optional |  | Warning traceability for warning outputs. |
| created_at | timestamptz | yes | default now() | Creation timestamp. |

Sprint 6 deterministic outputs are screening outputs only. They do not embed or execute API/API-ASME clause formulas. API-controlled calculations remain Formula Registry controlled metadata until a future authorized executor is implemented.

## Audit Trail


### ffs_trigger_rules

| Field | Type | Required | Key / Reference | Notes |
|---|---|---:|---|---|
| id | uuid | yes | PK | Internal trigger rule ID. |
| rule_id | text | yes | unique | Stable configured trigger rule ID, e.g. FFS-TRIG-LOCAL-THIN-AREA. |
| rule_name | text | yes |  | Human-readable rule name. |
| damage_mechanism | text | yes |  | local_thin_area, crack_like_indication, dent_gouge, severe_corrosion, settlement_concern, out_of_roundness, brittle_fracture_concern, thickness_below_screening. |
| trigger_source_type | text | yes |  | calculation_warning or manual_finding. |
| warning_codes | text[] | yes | default {} | Calculation warning codes that can create FFS cases. |
| default_severity | text | yes | info/warning/blocking/critical | Default workflow severity. |
| required_next_action | text | yes |  | Required human action. |
| active_flag | boolean | yes | default true | Enables/disables configured trigger. |
| governance_note | text | yes |  | Clarifies trigger-only governance. |
| created_at / updated_at | timestamptz | yes |  | Audit timestamps. |

### ffs_cases

| Field | Type | Required | Key / Reference | Notes |
|---|---|---:|---|---|
| id | uuid | yes | PK | Internal FFS case UUID. |
| case_id | text | yes | unique | Human-readable FFS case ID. |
| asset_id | uuid | yes | FK assets.id | Tank asset under review. |
| inspection_event_id | uuid | optional | FK inspection_events.id | Related inspection event. |
| calculation_run_id | uuid | optional | FK calculation_runs.id | Source calculation run when case is created from warning outputs. |
| component | text | yes |  | Tank component such as shell, floor, roof, nozzle, foundation. |
| damage_mechanism | text | yes |  | Triggered damage mechanism category. |
| trigger_source | text | yes |  | manual_finding, calculation_warning, inspection_review, etc. |
| trigger_reason | text | yes |  | Plain-language trigger reason. Does not declare fitness. |
| trigger_rule_id | text | yes | references configured rule ID | Rule that created or categorized the case. |
| severity | text | yes | info/warning/blocking/critical | Workflow severity. |
| evidence_links | jsonb | yes | default [] | Supporting evidence references snapshot. Evidence_links records may also point to the FFS case. |
| trigger_measurements_json | jsonb | yes | default [] | Supporting measurements, calculation inputs, or finding references. |
| assigned_engineer / owner_user_id | uuid | optional | FK users.id | Assigned engineer/reviewer. |
| status | text | yes | open, under_review, data_required, assessment_in_progress, accepted, repair_required, monitor, closed | FFS workflow state. |
| due_date | date | optional |  | Review due date. |
| required_next_action | text | yes |  | Next action required; trigger cases cannot auto-dispose. |
| final_disposition | text | optional |  | Final disposition entered only during senior engineer/admin closure. |
| approval_record_id | uuid | optional | FK approval_records.id | Required to close final FFS disposition. |
| created_by / updated_by | uuid | optional | FK users.id | Actor traceability. |
| created_at / updated_at | timestamptz | yes |  | Audit timestamps. |

FFS cases are trigger/governance records only. They do not perform API 579-1/ASME FFS-1 calculations and do not declare fitness for service. AI agents cannot close FFS cases. Final disposition requires senior engineer/admin approval and an approval record.

### audit_logs

| Field | Type | Required | Key / Reference | Notes |
|---|---|---:|---|---|
| id | uuid | yes | PK | Audit log ID. |
| event_type | text | yes |  | Audit event type, e.g. ASSET_CREATED, EVIDENCE_UPLOADED, NDT_MEASUREMENT_APPROVED, ENGINEERING_VALIDATION_RUN, FORMULA_APPROVED. |
| actor_user_id | uuid | optional | FK users.id | Acting user. |
| actor_role_codes | text[] | yes | default {} | Actor roles from request context. |
| entity_type | text | optional |  | Entity type. |
| entity_id | uuid | optional |  | Entity ID. |
| request_id | text | optional |  | Request/correlation ID. |
| ip_address | inet | optional |  | Request IP address. |
| user_agent | text | optional |  | Request user agent. |
| before_json | jsonb | optional |  | Before-state snapshot. |
| after_json | jsonb | optional |  | After-state snapshot. |
| metadata_json | jsonb | yes | default {} | Additional metadata, including governance context. |
| created_at | timestamptz | yes | default now() | Audit timestamp. |

Audit coverage currently includes important asset, evidence, NDT, workflow/error, validation, Formula Registry, and deterministic calculation-run creation actions. Future calculation review/approval, report, and work-order modules must continue this pattern.

## Supporting Baseline Tables

These tables exist in the clean-clone schema and are either supporting references or implemented workflow/traceability records:

| Table | Status | Notes |
|---|---|---|
| inspection_events | Baseline implemented | Referenced by evidence and NDT. Full inspection workspace is future work. |
| calculation_runs | Sprint 6 implemented | Deterministic run header with asset, formula registry version, run status, input snapshot hash, validation status, output summary, review/approval fixtures, locked flag, and audit traceability. |
| calculation_inputs | Sprint 6 implemented | Field-level normalized input rows. NDT measurement inputs store `source_entity_type`, `source_entity_id`, and `evidence_file_id` where available. |
| calculation_outputs | Sprint 6 implemented | Field-level output rows for corrosion-rate, remaining-life, warning, and trigger-candidate outputs. |
| engineering_reviews | Baseline implemented | Future human review workflow. |
| approval_records | Baseline implemented | Future approval records for issued engineering actions. |
| ffs_cases | Sprint 7 implemented | API 579-1/ASME FFS-1 trigger workflow governance. Trigger only; no FFS calculation or fitness declaration. |
| ffs_trigger_rules | Sprint 7 implemented | Configured trigger rules for calculation warnings and manual findings. |
| rbi_cases | Sprint 8 implemented | API RP 580/581 RBI interface workflow. Qualitative/semi-quantitative fixture only; no proprietary quantitative API RP 581 rules are implemented. |
| rbi_trigger_rules | Sprint 8 implemented | Configured trigger rules for high corrosion rate, short remaining life, repeated anomalies, and engineering review. |

## Historical Sprint 8 Future Scope Tables

This historical section reflects the Sprint 8 baseline. Later Phase 1/2 work implements extraction/staging, report generation/issue gates, and internal AIM work-order fallback while preserving the same governance rules:

| Table / Area | Status | Rule |
|---|---|---|
| extraction_jobs, extraction_fields, staging_records | Implemented after Sprint 8 | AI output must go to staging only. |
| manual_overrides, data_quality_checks | Implemented after Sprint 8 | Reviewer corrections require reason and audit trail. |
| cml_points, thickness_readings | Planned | Detailed CML/TML master and reading decomposition beyond current `ndt_measurements`. |
| reports, report_templates, report_versions | Implemented after Sprint 8 | Reports cannot be issued without data, calculation, review, evidence, integrity decision, report approval, and issue gates. |
| internal_work_orders | Implemented after Sprint 8 | MVP includes internal work-order fallback before external CMMS integration. |

## Current Non-Negotiable Data Rules

1. AIM is the system of record.
2. n8n must call AIM APIs and must not write directly to PostgreSQL.
3. AI extraction/staging workflow is implemented; AI output must remain staging-only until human review/promotion.
4. AI cannot approve engineering data, NDT records, formulas, calculations, integrity decisions, reports, or work orders.
5. Evidence linkage is mandatory for NDT approval gates, calculation inputs/runs, integrity decision approval, report issue gates, and work-order closure where configured.
6. Formula Registry governs metadata/versioning and the Sprint 6 universal deterministic engine registration; no API/API-ASME formula expression is invented or embedded.
7. Draft/deprecated formulas must not be used for production calculation, and Sprint 6 deterministic execution is limited to approved/locked `universal_deterministic` formulas. Sprint 7 FFS and Sprint 8 RBI trigger workflows do not execute API/API-ASME formulas.
8. Missing critical engineering data produces deterministic validation warnings or blocking results according to validation scope.
9. Every important create/update/delete/review/approval/governance action must write audit logs.
10. Clean-clone migrations 0001 through 0010 are part of the implemented Sprint 8.5 baseline.


## Sprint 7 Governance and Security Hardening Notes

The implemented schema through Sprint 7 remains unchanged except for governance hardening behavior. FFS evidence linkage must preserve asset consistency:

- `ffs_cases.asset_id` is the controlling asset for the FFS workflow.
- `ffs_cases.evidence_links` may store supporting evidence snapshots, but evidence files must belong to the same asset.
- `evidence_links` may link `evidence_files` to `ffs_case` records after same-asset validation.
- FFS cases created from calculation warnings preserve source calculation run and source NDT measurement/evidence traceability in `trigger_measurements_json` and `evidence_links`.

RBAC seed data is aligned with `apps/api/src/rbac/roles.ts` through Sprint 8. Demo header authentication remains local-development only and must be replaced by verified JWT/session identity before production-like use.


## Sprint 8 RBI Interface Tables

### rbi_trigger_rules

| Field | Type | Required | Key / Reference | Notes |
|---|---|---:|---|---|
| id | uuid | yes | PK | Internal rule identifier. |
| rule_id | text | yes | unique | Configured trigger rule code. |
| rule_name | text | yes |  | Human-readable rule name. |
| trigger_source_type | text | yes |  | `calculation_warning`, `finding_history`, or `engineering_review`. |
| warning_codes | text[] | yes |  | Deterministic calculation warning codes that may create RBI case. |
| probability_driver | text | yes |  | Qualitative/semi-quantitative fixture driver. |
| consequence_driver | text | yes |  | Consequence fixture driver. |
| default_risk_category | text | yes |  | Screening risk category. |
| recommended_interval | text | yes |  | Fixture inspection interval recommendation. |
| inspection_plan_reference | text | yes |  | Fixture inspection planning reference. |
| governance_note | text | yes |  | Confirms no quantitative API RP 581 calculation. |
| active_flag | boolean | yes |  | Rule activation flag. |

### rbi_cases

| Field | Type | Required | Key / Reference | Notes |
|---|---|---:|---|---|
| id | uuid | yes | PK | Internal RBI case identifier. |
| case_id | text | yes | unique | User-facing RBI case code. |
| asset_id | uuid | yes | FK assets(id) | Asset under RBI interface review. |
| inspection_event_id | uuid | no | FK inspection_events(id) | Optional linked inspection event. |
| calculation_run_id | uuid | no | FK calculation_runs(id) | Source deterministic calculation run when triggered from warnings. |
| system | text | yes |  | System or unit grouping. |
| component | text | yes |  | Component under review. |
| damage_mechanism | text | yes |  | Damage mechanism fixture/classification. |
| probability_driver | text | yes |  | Probability driver fixture. |
| consequence_driver | text | yes |  | Consequence driver fixture. |
| risk_category | text | yes |  | Qualitative/semi-quantitative risk category fixture. |
| recommended_interval | text | yes |  | Inspection interval recommendation fixture. |
| inspection_plan_reference | text | yes |  | Inspection plan reference fixture. |
| evidence_links | jsonb | yes |  | Supporting evidence snapshot. Evidence is also linked through evidence_links table. |
| input_requirements | jsonb | yes |  | Consequence of failure, probability of failure, damage mechanism, inspection effectiveness, fluid service, inventory, operating severity, and mitigation controls fixtures. |
| trigger_source | text | yes |  | `calculation_warning`, `finding_history`, or `engineering_review`. |
| trigger_reason | text | yes |  | Trigger explanation. |
| trigger_rule_id | text | yes |  | RBI trigger rule used. |
| calculation_basis | text | yes |  | Clearly states fixture basis. |
| calculation_basis_note | text | yes |  | States quantitative API RP 581 rules are requires approved governance before Formula Registry provides approved rules. |
| status | text | yes | allowed statuses | Workflow status: open, under_review, data_required, assessment_in_progress, ready_for_review, approved, exported, closed. |
| reviewer | uuid | no | FK users(id) | Reviewer. |
| approver | uuid | no | FK users(id) | Senior engineer/lead engineer/admin approver. |
| reviewed_at | timestamptz | no |  | Review timestamp. |
| approved_at | timestamptz | no |  | Approval timestamp only; export and close must not backfill approval time. |
| created_by | uuid | no | FK users(id) | Creator. |
| updated_by | uuid | no | FK users(id) | Last updater. |
| created_at | timestamptz | yes | default now() | Creation timestamp. |
| updated_at | timestamptz | yes | default now() | Update timestamp. |


## Sprint 8 RBI Interface Governance Notes

RBI interface cases are governance records aligned to API RP 580/581 workflow needs. They preserve trigger reason, calculation warning sources, fixture input fields, evidence snapshots, workflow status, review, and approval/export metadata.

- `rbi_cases.asset_id` is the controlling asset for RBI interface workflow.
- `rbi_cases.calculation_run_id` links a case to deterministic calculation warning sources when applicable.
- `rbi_cases.evidence_links` may store supporting evidence snapshots, but evidence files must belong to the same asset.
- `evidence_links` may link `evidence_files` to `rbi_case` records after same-asset validation.
- Quantitative API RP 581 probability/consequence/risk rules require approved governance before use or embedded.
- Future quantitative RBI must use approved Formula Registry metadata and a controlled executor.



## RC4-I RBI Workflow Detail and Repeated-Anomaly Trigger Notes

RC4-I does not add new database columns. It uses the existing `rbi_cases`, `rbi_trigger_rules`, `findings`, `calculation_runs`, `calculation_inputs`, `calculation_outputs`, `evidence_files`, `evidence_links`, and `audit_logs` structures.

- `/api/v1/rbi/cases/from-calculation` now stores `input_requirements.source_warning_signature` and blocks duplicate open RBI cases for the same calculation-run / trigger-rule / warning-signature combination.
- `/api/v1/rbi/cases/from-finding-history` uses RC4-H `findings` rows as the repeated-anomaly source, stores `input_requirements.source_finding_signature`, stores source finding snapshots, and blocks duplicate open RBI cases for the same repeated-finding signature.
- RBI review, approve, export, and close actions update existing workflow fields and write audit logs; closure requires a comment/reason.
- RC4-I hardening aligns DB seed/migration RBI finalization permissions with backend/static RBAC for `lead_engineer`.
- Approval now requires recorded human review plus `ready_for_review` status; export and close require a previously approved RBI case.
- `/approve` approves only. Export and close must use their dedicated endpoints so export permission and closure-comment gates cannot be bypassed.
- Status update cannot mark `ready_for_review` or write `reviewed_at`; the RBI review endpoint is required to record human review before approval.
- `approved_at` is populated only by actual approval, not by export or close.
- RBI case lookup uses separate UUID/text parameters and asset-scoped creation validates `asset_id` as UUID before database lookup.
- `finding_history` is a trigger source only. It does not automatically approve engineering data, calculations, reports, FFS cases, or final integrity decisions.
- Risk matrix display remains qualitative/semi-quantitative fixture metadata unless future licensed Formula Registry rules are supplied and approved.


## Sprint 8.5 Evidence Linkage and Security Boundary Hardening Notes

- Generic `evidence_links` creation validates that `evidence_files.asset_id` matches the linked entity `asset_id` for `asset`, `inspection_event`, `ndt_measurement`, `calculation_run`, `ffs_case`, and `rbi_case` links.
- Unsupported or future entities without implemented asset ownership are not used to bypass approval gates.
- NDT approval uses only direct evidence or linked evidence belonging to the same asset as the NDT measurement.
- Cross-asset evidence links are rejected with `CROSS_ASSET_EVIDENCE_LINK_BLOCKED`.
- FFS and RBI manual evidence validation remains in place, and FFS/RBI from-calculation routes preserve calculation run, source entity, and evidence traceability.
- OpenAPI explicitly marks health and RBAC demo routes as local-dev/internal exclusions from the production engineering API contract.


## Sprint 9 Engineering Review and Approval Workflow

Implemented governance workflow for engineering reviews and senior engineer approval records. Review statuses are draft, submitted_for_review, returned_for_revision, reviewed, submitted_for_approval, approved, rejected, and locked. Engineer roles may review data and calculation results; senior_engineer/admin approval is required for final approval, rejection, override approval, and locking. AI agents cannot approve, reject, override, or finalize engineering decisions. Locked calculation/review/approval records are immutable; revisions must be created as new records.

Implemented tables/fields include engineering_reviews and approval_records extensions for calculation_run_id, asset_id, checklist_json, comments_json, override_json, reason, affected_field, original_value_json, override_value_json, evidence_links, revision_no, approval_status/review_status, approver/reviewer metadata, timestamps, locked_flag, and audit trail linkage.

Implemented APIs include GET/POST /api/v1/engineering/reviews, GET/PATCH/COMMENT /api/v1/engineering/reviews/{reviewId}, GET/POST /api/v1/approval-records, POST /api/v1/approval-records/{approvalId}/approve, POST /api/v1/approval-records/{approvalId}/reject, and GET /api/v1/engineering/calculations/{runId} for full calculation audit detail.

No API/API-ASME formulas, AI extraction runtime, report generation, RBI quantitative calculation, CMMS integration, or work-order integration are implemented in this sprint. AIM remains the system of record and n8n remains API-only orchestration.


## Sprint 10 Report Generation Tables

### report_templates

| Field | Description |
|---|---|
| id | Primary UUID. |
| template_code | Unique controlled template identifier. |
| template_name | Human-readable template name. |
| template_version | Controlled template version. |
| output_formats | JSON list of supported output formats, currently DOCX and PDF. |
| sections_json | Controlled section list for report generation. |
| status | draft, active, or retired. |

### reports

| Field | Description |
|---|---|
| id | Primary UUID. |
| report_code | Unique report identifier. |
| report_title | Report title shown in DOCX/PDF output. |
| report_status | draft, generated, under_review, approved, issued, superseded, or rejected. |
| report_version | Version number per calculation run. |
| asset_id | Linked asset. |
| calculation_run_id | Source calculation run; report generation requires locked or review-ready calculation. |
| template_id/template_code | Template used to render the report. |
| docx_object_path/pdf_object_path | Object-storage compatible output paths. |
| docx_content_base64/pdf_content_base64 | Generated output payloads for local sprint baseline. |
| input_snapshot_hash | Calculation input snapshot reference. |
| content_hash | Deterministic report content hash. |
| traceability_json | formula_id, formula_version, code_basis, code_edition, calculation_run_id, and input snapshot reference. |
| sections_json | Rendered report sections. |
| evidence_register_json | Evidence register listing evidence_id, filename, method, component, date, page/sheet reference, path, and linked measurement/result. |
| validation_warnings_json | Validation warnings and limitations included in report. |
| locked_flag | True for issued/locked records; changes require a new report version. |

Governance: reports are DRAFT until approved and issued reports are immutable. No API/API-ASME formula expression is embedded or invented in report content.

## Phase 1.2 Source-of-Truth Schema Closure Addendum

Migration `0013_source_truth_schema_closure.sql` adds schema-readiness tables required by the AIM+n8n source-of-truth package. Later Phase 1 migrations implement AI extraction/staging, report generation/issue gates, and internal AIM work order fallback. The MVP still uses a governed boundary instead of full API 579/API 581, external CMMS integration, 3D processing, or proprietary API/API-ASME formula logic.

### Added AI Extraction and Staging Tables

- `extraction_jobs` — AI extraction job metadata. `staging_only_flag` is constrained to `true` so AI output remains non-final.
- `extraction_fields` — field-level AI extraction output with source reference, confidence, status, validation flags, and reviewer fields.
- `staging_records` — proposed values awaiting human review/promotion. Supports `pending_review`, `approved_for_promotion`, `rejected`, `corrected`, `promoted`, and `returned_for_evidence` statuses.
- `manual_overrides` — reviewer corrections preserving original value, corrected value, reason, reviewer, timestamp, and evidence reference metadata.
- `data_quality_checks` — validation flags and blocking/non-blocking quality checks for extraction/staging records.

### Added Engineering Governance Tables

- `integrity_decisions` — human-authored integrity decision records linked to assets, inspections, and calculation runs.
- `review_gates` — generic gate tracking for evidence, calculation, integrity decision, report issue, approval, staging promotion, and work order readiness.
- `internal_work_orders` — MVP internal work order fallback prior to external CMMS integration.

### Added Reporting, Workflow, Notification, and Settings Tables

- `report_versions` and `report_exports` — report version and export artifact tracking.
- `workflow_tasks` — workflow task queue/status records surfaced through AIM.
- `notification_logs` — notification delivery log records.
- `system_settings` — governed runtime settings such as AIM system-of-record, n8n boundary, AI staging-only flag, and calculation review disclaimer.

### Added Formula/Validation Tables

- `formula_versions` — explicit formula version metadata linked to `formula_registry` for deterministic, approved, auditable calculations.
- `calculation_validation_cases` — validation workbook/test-case metadata for deterministic calculation regression and gate tests.

Evidence lineage remains normalized through `evidence_links`; the new records store only direct source/reference metadata needed for review and traceability.

## Phase 1.3 Governance Batch Addendum

Phase 1.3 adds backend governance behavior and evidence metadata hardening aligned with the AIM+n8n source of truth:

- AI extraction values are accepted only into `extraction_jobs`, `extraction_fields`, and `staging_records`.
- `extraction_fields.field_status` remains machine-initialized until human review; only human review actions can set `approved_by_engineer`, `corrected_by_engineer`, or `rejected_by_engineer`.
- `manual_overrides` stores correction reason, original value, corrected value, reviewer, timestamp, and evidence reference.
- `staging_records` promotion is blocked unless engineer review is complete, blocking data quality checks are resolved, and evidence is linked through `evidence_links`.
- `evidence_files` now includes malware scan fixture/access governance columns: `malware_scan_status`, `access_status`, `accessed_at`, `delete_requested_by`, `delete_requested_at`, `delete_approved_by`, and `delete_approved_at`.
- Evidence download access is represented by signed URL issuance through AIM APIs and audited via `audit_logs`; object storage remains private.
- Linked evidence cannot be approved for deletion; evidence lineage remains retained for auditability.

## Phase 1.4 OpenAPI and Contract Alignment Addendum

Phase 1.4 reconciles the implemented backend route surface with `04_API/openapi.yaml` without adding new engineering workflows or calculation formulas.

### Contract Alignment Scope

- OpenAPI now uses explicit implemented `/api/v1/...` paths with `http://localhost:4000` as the local API root.
- Auth endpoints are documented for DB-backed JWT/session skeleton behavior: `/api/v1/auth/login`, `/api/v1/auth/logout`, `/api/v1/auth/refresh`, and `/api/v1/auth/me`.
- AI extraction/staging endpoints are documented as staging-only, human-review-gated, and evidence-gated where applicable.
- Evidence signed URL and deletion governance endpoints are documented with RBAC, audit, and linked-evidence deletion blocking.
- Approval and report issue endpoints are documented with required comments/reasons, human review metadata, evidence gate metadata, and audit event metadata.

### OpenAPI Metadata Rules

Each protected operation must include `x-permission-required`. Each approve/reject/correct/promote/issue operation must include `x-audit-event-generated`. AI extraction/staging operations must include `x-ai-output-staging-only`. Promotion and report issue operations must include `x-human-review-required` and `x-evidence-link-required`.

### Boundary Preservation

This phase does not add API 579/API 581 quantitative logic, CMMS integration, 3D processing, frontend UI, or formula expansion. AIM remains the system of record, n8n remains orchestration-only through AIM APIs, and AI output remains non-final staging data until human engineering review.

## Phase 1.5 Calculation Engine Governance Hardening Addendum

Phase 1.5 hardens calculation governance without adding calculation expansion, API 579/API 581 logic, CMMS integration, 3D processing, or invented API/API-ASME formulas.

### Calculation Run Governance Fields

Migration `0015_phase1_5_calculation_governance_hardening.sql` extends `calculation_runs` with:

- `formula_version_snapshot_json` — immutable snapshot of explicit approved formula version metadata used by the run, including formula version ID/code/name/version/status/source.
- `output_snapshot_json` — immutable output snapshot containing output summary, corrosion/remaining-life outputs, warnings, final-use status, and disclaimer.
- `output_snapshot_hash` — deterministic hash of the output snapshot.
- `final_use_status` — `blocked`, `requires_engineering_review`, or `approved_for_final_use`.
- `final_use_disclaimer` — must contain `Engineering review required before final use.`.
- `final_use_blockers_json` — blocking reasons such as validation failure, missing evidence, unit review required, or below-required thickness.

### Calculation Governance Rules

- Every calculation run must explicitly provide `formula_id` and `formula_version`; silent/default formula selection is blocked.
- Only formula versions with approved/locked status and deterministic flag may be executed.
- Draft, under-review, retired, rejected, missing, or non-deterministic formula versions are blocked.
- Input snapshots and output snapshots must be persisted to support deterministic repeatability and audit.
- Missing evidence and non-mm/unit-review warnings block final use or approval until engineer review resolves the gate.
- Calculation approval requires RBAC, human review, evidence completeness, warning resolution, comments/reasons, segregation-of-duty checks, and audit events.

### Required Calculation Audit Events

Phase 1.5 adds or documents these audit events: `calculation.run_requested`, `calculation.completed`, `calculation.failed`, `calculation.warning_raised`, `calculation.reviewed`, `calculation.approved`, `calculation.rejected`, and `calculation.final_use_blocked`.

## Phase 1.6 Addendum — Report Issue Gates and Internal Work Order Fallback

Phase 1.6 hardens the report issue and internal work order fallback boundary.

### Report Issue Gate Fields

`reports` is extended with issue gate fields:

- `issue_gate_status`: pending, passed, blocked, or issued.
- `issue_gate_checklist_json`: gate checklist snapshot evaluated by AIM backend.
- `issue_blocked_reason`: reason for blocked issue attempt where applicable.
- `last_issue_gate_checked_at` and `last_issue_gate_checked_by`: auditability fields for gate evaluation.

Required Phase 1.6 report issue gates:

- `required_data_complete`
- `evidence_linked` — release hardening requires direct evidence links to report, calculation_run, and approved integrity_decision before final issue.
- `calculation_completed`
- `calculation_reviewed`
- `calculation_approved`
- `integrity_decision_created`
- `integrity_decision_approved`
- `report_approved`
- `unresolved_critical_warnings_absent`
- `workflow_errors_resolved`
- `approver_comment_present`

A blocked issue attempt must create a gate/audit/error signal. AI agents and n8n/service users cannot issue reports.

### Internal Work Order Fallback Fields

`internal_work_orders` remains the MVP fallback before any external CMMS integration. Phase 1.6 adds or hardens:

- `inspection_event_id`
- `integrity_decision_id`
- `report_id`
- `action_source`
- `assigned_role`
- `preliminary_internal_flag`
- `gate_status`
- `gate_checklist_json`
- `closure_evidence_required`
- `closure_evidence_link_id`
- `action_source_note`

`external_cmms_reference` and `external_cmms_status` remain nullable future fixtures only. Phase 1.6 uses a governed boundary instead of SAP, Maximo, or any external CMMS integration.

### Required Audit Events

- `REPORT_ISSUE_BLOCKED`
- `REPORT_ISSUED`
- `INTERNAL_WORK_ORDER_CREATION_BLOCKED`
- `INTERNAL_WORK_ORDER_CREATED`
- `INTERNAL_WORK_ORDER_UPDATED`
- `INTERNAL_WORK_ORDER_CLOSE_BLOCKED`
- `INTERNAL_WORK_ORDER_CLOSED`



## UAT Cycle 1 Release Hardening Addendum

Controlled UAT Cycle 1 result is `PASS_WITH_LOCAL_FIXES`. Release hardening reconciles the following data semantics:

- `approval_records.created_at` exists as an immutable creation timestamp from migration `0017_uat_fix_approval_records_created_at.sql`.
- `approval_records.approved_at` is nullable after migration `0018_uat_fix_approval_record_approved_at_semantics.sql` and is populated only when `approval_status = 'approved'`.
- Integrity decision approval requires direct evidence linkage through `evidence_links` with `linked_entity_type = 'integrity_decision'`.
- Report issue evidence gate is per-entity: direct evidence must be linked to the `report`, `calculation_run`, and approved `integrity_decision`.
- Prior `REPORT_ISSUE_GATE_BLOCKED` logs remain auditable but are resolved after a later successful report issue.
- Internal AIM work order fallback is implemented; `external_cmms_reference` remains a rejected/out-of-scope MVP field, not an integration.

## RC2 Runtime / Frontend Closure Notes

- `integrity_decisions` is now exposed through AIM API list/detail/create/approve routes. Approval requires direct evidence linkage through `evidence_links.linked_entity_type = 'integrity_decision'` and `linked_entity_id = integrity_decisions.id`.
- Report issue gates require direct evidence links to `report`, `calculation_run`, and approved `integrity_decision`. Aggregate evidence count alone is insufficient.
- `approval_records.created_at` is present from UAT Cycle 1 hardening. `approval_records.approved_at` is nullable and must only be populated when an approval is actually approved.
- Internal work orders remain AIM-local fallback records. External CMMS references remain null/omitted for MVP.


## RC3-A / RC3-B alignment note

RC3-A and RC3-B are now implemented in this repository state. Correct health endpoints are `GET /health` and `GET /health/db`. Correct authentication endpoints are `POST /api/v1/auth/login` and `GET /api/v1/auth/me`. RBAC demo endpoints and demo CORS headers are local/development/test only when `AUTH_ALLOW_LOCAL_DEMO=true`; they are unavailable in production-like environments.

RC3-B implements evidence object-storage upload/download and report artifact object-storage export. Original evidence files and generated report artifacts are stored in private S3-compatible object storage; PostgreSQL stores metadata, checksums, object keys, upload sessions, status, and audit linkage. Legacy metadata-only evidence upload is retained only for compatibility and is not gate-eligible until object storage verification is completed through the RC3-B flow.

Final production closure remains human-gated after hypercare completion; AI and n8n cannot approve production closure or final engineering actions.

## RC3-B Addendum — Evidence and Report Object Storage

RC3-B completes the object-storage boundary required by the AIM source of truth. AIM/PostgreSQL remains the system of record for metadata, status, checksums, object keys, linkage, workflow state, and audit records. Private S3-compatible object storage stores original evidence binaries and generated report export artifacts.

### Updated `evidence_files` fields

RC3-B adds or formalizes the following evidence object-storage fields:

| field_name | data_type | required | description | governance rule |
|---|---|---:|---|---|
| `storage_provider` | text | yes | Object storage provider identifier, currently `s3-compatible`. | Must not imply PostgreSQL stores binaries. |
| `storage_bucket` | text | yes for RC3-B uploads | Private bucket containing the evidence object. | Do not expose bucket credentials or raw signed URL query strings. |
| `object_key` | text | yes for RC3-B uploads | Sanitized object-storage key generated by AIM. | Must prevent path traversal and use evidence folder convention. |
| `object_version_id` | text | no | Optional storage-provider version ID. | Retained for traceability if provider supports versioning. |
| `size_bytes` | bigint | yes for RC3-B uploads | Verified object size from object storage. | Must match declared upload size during completion. |
| `upload_status` | text | yes | `pending`, `uploaded`, `verified`, `failed`, `expired`, or `cancelled`. | Only `verified` evidence is gate-eligible for report/evidence readiness. |
| `uploaded_at` | timestamptz | no | Upload/session creation timestamp. | Audit-supporting timestamp. |
| `completed_at` | timestamptz | no | Time object-storage verification completed. | Required for verified RC3-B evidence. |
| `signed_url_expires_at` | timestamptz | no | Expiry of latest AIM-issued signed URL. | Raw signed URL query strings must not be stored. |
| `accessed_at` | timestamptz | no | Last AIM-controlled evidence access attempt/success. | Blocked access attempts are also audited. |

### New `evidence_upload_sessions` table

`evidence_upload_sessions` records pending RC3-B object-storage upload sessions before evidence metadata is finalized.

| field_name | data_type | required | description | governance rule |
|---|---|---:|---|---|
| `upload_session_id` | uuid | yes | Primary key for the upload session. | Created only by AIM API. |
| `evidence_id` | uuid | no | Final evidence record after completion. | Null until object verification succeeds. |
| `asset_id` | uuid | yes | Asset that owns the evidence. | Must reference active AIM asset. |
| `inspection_id` | uuid | no | Optional inspection context. | Must belong to the same asset when provided. |
| `evidence_code` | text | yes | AIM evidence code. | Generated by AIM backend for gate-eligible object-storage upload sessions. Caller-supplied evidence codes are not used in the RC3-B upload-session flow. |
| `original_filename` | text | yes | Submitted file name. | Must be sanitized before object key creation. |
| `safe_filename` | text | yes | Sanitized file name. | Must reject path traversal. |
| `declared_mime_type` | text | yes | Client-declared MIME type. | Must be allowed by RC3-B configuration. |
| `declared_size_bytes` | bigint | yes | Client-declared file size. | Must match object-storage head result. |
| `expected_checksum_sha256` | text | yes for new gate-eligible RC3-B uploads | Required declared SHA-256 checksum. | Completion must verify the checksum through caller-provided checksum or object metadata; otherwise completion is blocked. |
| `storage_provider` | text | yes | Storage provider used for the session. | Currently `s3-compatible`. |
| `storage_bucket` | text | yes | Target private bucket. | Never expose credentials. |
| `object_key` | text | yes | Target object key. | Unique per bucket/session. |
| `upload_status` | text | yes | Upload session lifecycle state. | Verified session creates/finalizes `evidence_files`. |
| `requested_by` | uuid | no | Human user who requested upload URL. | AI/service actors cannot create final evidence artifacts. |
| `expires_at` | timestamptz | yes | Upload URL/session expiry. | Expired sessions cannot finalize evidence. |
| `completed_at` | timestamptz | no | Completion timestamp. | Populated only after verification. |
| `metadata_json` | jsonb | yes | Redacted signed URL metadata and verification details. | Must not store raw signed URL query strings. |

### Legacy metadata-only evidence upload policy

`POST /api/v1/evidence/upload` remains only for compatibility with earlier metadata-import flows. It now marks records as `metadata_only_pending_object_verification`, `upload_status = 'pending'`, and `access_status = 'blocked'`. It must not satisfy evidence/report gates until the RC3-B `/evidence/upload-url` and `/evidence/complete-upload` flow verifies object storage.

### Updated `report_exports` fields

RC3-B adds or formalizes these report export artifact fields:

| field_name | data_type | required | description | governance rule |
|---|---|---:|---|---|
| `storage_provider` | text | yes | Object-storage provider identifier. | Currently `s3-compatible`. |
| `storage_bucket` | text | yes | Private bucket holding the export artifact. | No credentials or raw signed URL query strings in database. |
| `object_key` | text | yes | Object key for generated export. | Generated by AIM using report/export identity. |
| `object_version_id` | text | no | Optional object version ID. | Retained for traceability. |
| `content_hash_sha256` | text | yes | SHA-256 hash of generated artifact content. | Required for artifact traceability. |
| `input_snapshot_hash` | text | no | Hash of report input snapshot where available. | Supports reproducibility. |
| `generated_by` | uuid | no | Human user who generated export. | AI/service actors cannot create final artifacts. |
| `generated_at` | timestamptz | no | Artifact generation timestamp. | Required for auditability. |
| `download_status` | text | yes | `not_downloaded`, `signed_url_issued`, `downloaded`, or `blocked`. | Updated by AIM-controlled download URL flow. |
| `file_size_bytes` | bigint | no | Artifact byte length. | Stored from generated artifact buffer/object metadata. |
| `mime_type` | text | no | Artifact MIME type. | Must match export format. |

### Required RC3-B audit events

- `EVIDENCE_UPLOAD_URL_CREATED`
- `EVIDENCE_UPLOAD_COMPLETED`
- `EVIDENCE_LEGACY_METADATA_REGISTERED`
- `EVIDENCE_ACCESS_BLOCKED`
- `EVIDENCE_DOWNLOAD_URL_CREATED`
- `EVIDENCE_DOWNLOAD_OPENED`
- `REPORT_EXPORT_CREATED`
- `REPORT_EXPORT_DOWNLOAD_URL_CREATED`

### Required RC3-B gates

- Evidence metadata is finalized only after object storage existence and declared size are verified.
- New gate-eligible object-storage upload sessions must declare a SHA-256 checksum before a signed upload URL is issued; completion must verify it through the provided checksum or object metadata, otherwise completion is blocked.
- Signed URL query strings must be redacted before audit metadata is stored.
- Report issue evidence gates must count only object-verified evidence (`upload_status = 'verified'`).
- AI/n8n/service actors cannot create final evidence artifacts, report export artifacts, or approvals.


### RC3-B closeout polish controls

- Evidence upload URL requests no longer require or use caller-provided `evidence_code`; AIM generates the Evidence ID/code for the upload session.
- `checksum_sha256` is mandatory for new gate-eligible object-storage uploads.
- `evidence_upload_sessions.expected_checksum_sha256` must be populated before completion can create a verified `evidence_files` record.
- Report evidence gates must treat `upload_status = 'verified'` as the only gate-eligible object-storage status; null/legacy upload statuses remain incompatible with RC3-B report readiness gates.

## RC4-E Data Dictionary Expansion — Validation UX Traceability

RC4-E expands field-level documentation for frontend validation-by-asset, validation history, and data dictionary visibility. This is documentation and UX traceability only; it adds no schema columns, migrations, or engineering formulas. Backend validation remains authoritative.

| Domain | field_name | Display label | Entity/table | Data type | Required | Unit / allowed values | Validation rule summary | Evidence linkage requirement | Source of truth | Frontend page | API payload | Governance note |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Asset identity and tank metadata | asset_id | Asset ID | assets | uuid | required | uuid | Must identify the AIM tank asset for validation context. | Evidence/NDT/calculation/report links must stay same-asset where applicable. | PostgreSQL `assets.id` | `/assets`, `/assets/{assetId}/validation` | `asset_id` | AIM is the system of record. |
| Asset identity and tank metadata | asset_tag | Tank tag | assets | text | required | unique operational tag where enforced | Required for asset identity and engineer traceability. | Evidence metadata should reference the same asset. | PostgreSQL `assets.asset_tag` | `/assets` | `tank_tag` / `asset_tag` | AIM must not infer missing asset identity. |
| Asset identity and tank metadata | original_design_code | Original design code | assets | text | required/warning | e.g. user-entered design basis | Missing value creates validation warning/blocker depending context. | Linked evidence should support source where available. | PostgreSQL `assets` | `/assets/{assetId}/validation` | `original_design_code` | Reference basis only; no standard clauses are reproduced. |
| Tank geometry | diameter | Tank diameter | tank_geometry | numeric | required | m | Missing/invalid/ambiguous unit blocks readiness where backend marks blocking. | Source evidence recommended for final engineering use. | PostgreSQL `tank_geometry` | `/assets/{assetId}`, `/assets/{assetId}/validation` | `diameter`, `diameter_unit` | No engineering calculation is added by RC4-E. |
| Tank geometry | shell_height | Shell height | tank_geometry | numeric | required | m | Missing/invalid/ambiguous unit blocks readiness where backend marks blocking. | Source evidence recommended for final engineering use. | PostgreSQL `tank_geometry` | `/assets/{assetId}`, `/assets/{assetId}/validation` | `shell_height`, `shell_height_unit` | Unit issues are displayed; backend remains authoritative. |
| Shell courses | course_no | Course number | shell_courses | integer | required | positive integer | Course sequence must align with geometry count where available. | Course data should be traceable to asset/evidence context. | PostgreSQL `shell_courses` | `/assets/{assetId}/validation` | `course_no` | Completeness check only. |
| Shell courses | nominal_thickness | Nominal thickness | shell_courses | numeric | conditional | mm | Missing nominal thickness may warn/block depending validation scope. | Source evidence recommended before final use. | PostgreSQL `shell_courses` | `/assets/{assetId}/validation` | `nominal_thickness`, `nominal_thickness_unit` | No minimum-thickness formula is introduced. |
| Material master | material_id | Material ID | materials, shell_courses | uuid | conditional|required by scope | uuid | Shell courses should link to material master where required. | Material source evidence/basis may be required by review. | PostgreSQL `materials`, `shell_courses.material_id` | `/assets/{assetId}/validation` | `material_id` | AIM must not infer material properties. |
| Material master | joint_efficiency | Joint efficiency | shell_courses | numeric | conditional|required by scope | 0–1 where backend validates | Missing joint efficiency blocks readiness where required. | Engineering basis/evidence should be attached where required. | PostgreSQL `shell_courses` | `/assets/{assetId}/validation` | `joint_efficiency` | Engineer-entered/approved basis only. |
| Inspection events | inspection_event_id | Inspection event ID | inspection_events | uuid | conditional | uuid | Provides inspection context for evidence and NDT records. | Evidence and NDT may reference inspection context. | PostgreSQL `inspection_events` | `/evidence`, `/ndt`, `/validation/history` | `inspection_event_id` / `inspection_id` | Inspection context is traceability, not approval. |
| Evidence metadata | evidence_file_id | Evidence file ID | evidence_files | uuid | conditional|required by gate | uuid | Required for critical NDT and final engineering traceability where backend marks blocking. | Direct evidence link required for governed entities. | PostgreSQL `evidence_files.id` + object storage metadata | `/evidence/{evidenceId}`, `/assets/{assetId}/validation` | `evidence_file_id` | Evidence linkage remains mandatory. |
| Evidence object-storage governance | checksum_sha256 | SHA-256 checksum | evidence_files | text | required | hex digest | Checksum supports object integrity validation. | Applies to original evidence binary. | PostgreSQL metadata + object storage object | `/evidence` | `checksum_sha256` | Raw object keys and signed URLs must not be displayed. |
| Evidence object-storage governance | malware_scan_status | Malware scan status | evidence_files | status | required | pending/clean/infected/blocked/quarantined/scan_failed where used | Infected/blocked evidence cannot be previewed/opened. | Evidence may not support final use until safe. | PostgreSQL `evidence_files` | `/evidence/{evidenceId}` | `malware_scan_status` | Do not bypass malware controls. |
| Evidence linkage | linked_entity_type | Linked entity type | evidence_links | enum | required | asset, inspection_event, ndt_measurement, calculation_run, finding, ffs_case, rbi_case, report | Same-asset linkage enforced by backend validation where applicable. | Required to trace final engineering outputs. | PostgreSQL `evidence_links` | `/evidence/{evidenceId}`, `/assets/{assetId}/validation` | `linked_entity_type` | Linkage is not approval. |
| NDT measurement fields | measured_thickness | Measured thickness | ndt_measurements | numeric | conditional|required by NDT validation | mm normalized where available | Missing/invalid/unsupported unit is displayed as validation issue. | Critical NDT requires evidence before final use. | PostgreSQL `ndt_measurements` | `/ndt`, `/ndt/{measurementId}`, `/assets/{assetId}/validation` | `measured_thickness`, `measured_thickness_unit` | RC4-E does not infer fitness-for-service. |
| NDT import fields | grid_ref | Grid/CML/TML reference | ndt_measurements | text | conditional | text | Supports CML/TML/grid traceability and filtering. | Link NDT row to supporting evidence where required. | PostgreSQL `ndt_measurements` | `/ndt`, `/assets/{assetId}/validation` | `grid_ref`, `cml_tml_id` | Display/traceability only. |
| Validation run/history fields | validation_run_id | Validation run ID | validation_runs | uuid | required | uuid | Identifies stored validation snapshot. | Validation may reference evidence/NDT readiness. | PostgreSQL `validation_runs.id` | `/validation/history` | `validation_run_id` | History is read-only visibility. |
| Validation run/history fields | blocking_count | Blocking issue count | validation_runs | integer | required | non-negative integer | Blocks readiness where backend validation says blocking. | May include evidence-link blockers. | PostgreSQL `validation_runs` | `/validation`, `/assets/{assetId}/validation` | `blocking_count` | Blocking is not automatic approval/rejection. |
| Calculation input/output snapshot references | input_snapshot_hash | Calculation input snapshot hash | calculation_runs | text | conditional | hash | Links validation/readiness to deterministic calculation input snapshots where available. | Calculation inputs should preserve evidence/source traceability. | PostgreSQL `calculation_runs`, `calculation_inputs` | `/calculations`, `/assets/{assetId}/validation` | `input_snapshot_hash` | RC4-E does not run calculations. |
| Formula version references | formula_version_id | Formula version ID | formula_registry / calculation_runs | uuid/text | conditional | approved formula metadata only | Formula readiness depends on approved formula registry metadata where calculation is requested. | Evidence/basis may be attached through review package. | PostgreSQL `formula_registry` | `/formulas`, `/validation` | `formula_version_id` / `formula_id` | No API/API-ASME formula is invented. |
| Review gate fields | reviewer_status | Reviewer status | engineering_reviews, ndt_measurements | status | conditional | pending/needs_review/reviewed/approved/rejected where implemented | Human review state must remain separate from validation. | Evidence linkage supports review decision. | PostgreSQL review/NDT tables | `/reviews`, `/ndt/{measurementId}` | `reviewer_status` | AI/service actors cannot approve. |
| Integrity decision fields | decision_status | Decision status | integrity_decisions | status | conditional | workflow status | Decision readiness depends on validation/evidence/review gates. | Evidence linkage mandatory for final decision. | PostgreSQL `integrity_decisions` | `/integrity-decisions` | `decision_status` | Final decision remains human controlled. |
| Report version/export fields | report_version_id | Report version ID | report_versions/report_exports | uuid | conditional | uuid | Report issue gates depend on required validation/evidence/calculation/review states. | Issued report must link evidence and calculation basis. | PostgreSQL report metadata + object storage export | `/reports` | `report_id`, `report_version_id` | RC4-E does not change report gates. |
| Audit log fields | audit_log_id | Audit log ID | audit_logs | uuid | required for governed actions | uuid | Governed validation, correction, approval, issue, and work-order actions require auditability. | Audit links may reference evidence-linked entities. | PostgreSQL `audit_logs` | `/audit-logs` | `audit_log_id` | Audit trail remains immutable governance record. |


## RC4-H Findings / Anomaly Foundation

| field_name | display_label | entity/table | data_type | required/optional | allowed values / rule summary | evidence linkage requirement | source-of-truth | frontend/API usage | governance note |
|---|---|---|---|---|---|---|---|---|---|
| id | Finding ID | findings | uuid | required | System-generated primary key | Not direct evidence | PostgreSQL `findings` | `/findings/{findingId}`, `GET /api/v1/findings/{findingId}` | Traceability identifier only. |
| finding_code | Finding Code | findings | text | required | Generated `FND-######` code | Not direct evidence | PostgreSQL `findings` | `/findings`, `/assets/{assetId}/findings` | Human-readable finding reference. |
| asset_id | Asset | findings | uuid | required | Must reference AIM asset | Evidence/NDT/calculation links must be same asset | PostgreSQL `findings` | Create/list/detail findings API and UI | AIM remains system of record. |
| inspection_event_id | Inspection Event | findings | uuid | optional | References inspection event where available | Link evidence for final engineering use | PostgreSQL `findings` | Finding create/detail | Does not approve inspection record. |
| title | Finding Title | findings | text | required | Non-empty text | Evidence required for critical closure | PostgreSQL `findings` | Finding create/detail | Descriptive label only. |
| description | Description | findings | text | optional | Engineer-entered narrative | Evidence required for critical closure | PostgreSQL `findings` | Finding create/detail | Does not determine fitness-for-service. |
| finding_type | Finding Type | findings | enum/text | required | corrosion, wall_loss, pitting, crack, deformation, settlement, coating_defect, weld_defect, nozzle_issue, roof_issue, floor_issue, documentation_gap, data_quality_issue, other | Evidence required for critical closure | PostgreSQL `findings` | Finding filters/create/detail | Classification only; no formula or standard threshold. |
| component | Component | findings | text | optional | shell, floor, roof, nozzle, etc. | Evidence preferred | PostgreSQL `findings` | Finding filters/create/detail | Location context only. |
| shell_course_no | Shell Course No. | findings | integer | optional | Positive integer if provided | Evidence preferred | PostgreSQL `findings` | Finding create/detail | No shell-course engineering calculation. |
| cml_tml_id | CML/TML ID | findings | text | optional | Free text reference | Evidence preferred | PostgreSQL `findings` | Finding create/detail | Traceability to NDT grid/CML/TML. |
| grid_ref | Grid Ref | findings | text | optional | Free text grid reference | Evidence preferred | PostgreSQL `findings` | Finding create/detail | Traceability only. |
| elevation | Elevation | findings | text | optional | Engineer-entered position | Evidence preferred | PostgreSQL `findings` | Finding create/detail | No dimensional acceptance calculation. |
| orientation | Orientation | findings | text | optional | Engineer-entered orientation | Evidence preferred | PostgreSQL `findings` | Finding create/detail | Location context only. |
| severity | Severity | findings | enum/text | required | info, low, medium, high, critical | Critical closure requires evidence | PostgreSQL `findings` | Finding filters/create/detail | Severity is triage/governance, not final integrity decision. |
| status | Status | findings | enum/text | required | open, under_review, disposition_required, linked_to_ffs_candidate, linked_to_rbi_candidate, resolved, closed, rejected_duplicate | Critical closure requires evidence | PostgreSQL `findings` | Finding filters/create/detail/closure | Status does not approve engineering data or create FFS/RBI cases. |
| source_type | Source Type | findings | enum/text | required | manual, evidence_review, ndt_measurement, calculation_warning, validation_warning, inspection_report | Source evidence required where applicable | PostgreSQL `findings` | Finding create/detail | Source classification only. |
| source_entity_id | Source Entity ID | findings | uuid | optional | Source record ID | Same-asset linkage enforced where applicable | PostgreSQL `findings` | Finding create/detail | Preserves traceability. |
| evidence_file_id | Evidence File | findings | uuid | optional | Must reference same-asset evidence when supplied | Required for critical closure | PostgreSQL `findings` + `evidence_links` | `/evidence/{evidenceId}`, findings detail | Evidence link is not approval. |
| ndt_measurement_id | NDT Measurement | findings | uuid | optional | Must reference same-asset NDT measurement when supplied | NDT evidence still governed separately | PostgreSQL `findings` | `/ndt/{measurementId}`, findings detail | Does not approve NDT. |
| calculation_run_id | Calculation Run | findings | uuid | optional | Must reference same-asset calculation run when supplied | Calculation inputs remain evidence-gated separately | PostgreSQL `findings` | `/calculations/{calculationRunId}`, findings detail | Does not approve calculation. |
| validation_run_id | Validation Run | findings | uuid | optional | References validation run where available | Evidence linkage remains separate | PostgreSQL `findings` | `/validation/history` | Validation flags but does not approve. |
| closure_reason | Closure Reason | findings | text | conditional | Required when closing/resolving | Critical findings require evidence | PostgreSQL `findings` | Finding detail closure panel | Human-governed closure note. |


## RC4-I final-state lock hotfix

Approved, exported, and closed RBI cases are locked from generic `/status` and `/review` mutation. Further engineering changes must use a new/revision case path rather than mutating the final disposition record. The `/review` endpoint remains the only route that can mark `ready_for_review`; `/status` is limited to mutable pre-review workflow states.

## RC4-J Engineering Review and Approval Detail Addendum

RC4-J extends the Sprint 9 engineering review and approval workflow without adding new tables.

Updated behavior:

- `engineering_reviews.checklist_json` stores structured gate items such as `{ status, comment }`.
- Review status `reviewed` requires a structured checklist with all blocking items `pass` or `not_applicable`.
- `engineering_reviews.comments_json` may include `comment_id`, `parent_comment_id`, `thread_id`, author metadata, and timestamp.
- `engineering_reviews.supersedes_review_id` is used by the new revision endpoint to preserve lineage when locked records require follow-up.
- `approval_records` approval creation requires a completed reviewed review when `review_id` is supplied.
- `approval_records.override_json`, `affected_field`, `original_value_json`, `override_value_json`, `reason`, and `evidence_links` are required for controlled override approval.
- DB permission grants align `approval_record.approve` and `approval_record.reject` with admin, senior_engineer, lead_engineer, and approver roles.

No direct AI finalization, direct n8n PostgreSQL writes, new formulas, or report issue behavior changes are introduced.
