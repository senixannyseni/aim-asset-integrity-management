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
- AI extraction runtime is not implemented in this baseline. Future AI output must go to extraction/staging tables only and must not write final engineering tables directly.
- AI must not approve engineering data, NDT records, formulas, calculations, integrity decisions, or reports.
- No API/API-ASME formula expression is hard-coded or invented in this schema. Formula Registry stores controlled metadata and placeholders only unless an authorized engineer enters licensed/approved source content.
- Universal deterministic engineering calculations are implemented for AIM-owned screening logic only. Report issue, work-order integration, AI extraction runtime, API/API-ASME formula execution, and full FFS calculations and quantitative API RP 581 calculations remain outside the implemented baseline.

## Implemented Table Inventory

| Table | Status | Primary Owner Role | Notes |
|---|---|---|---|
| users | Implemented | admin | Demo identity baseline. Production authentication is not implemented yet. |
| roles | Implemented | admin | Stores role master data. |
| permissions | Implemented | admin | Stores permission master data used by RBAC middleware. |
| user_roles | Implemented | admin | User-to-role mapping. |
| role_permissions | Implemented | admin | Role-to-permission mapping. |
| assets | Implemented | engineer / senior_engineer | Tank asset master data. API exposes `asset_id` and `tank_tag` while DB uses `id` and `asset_tag`. |
| tank_geometry | Implemented | engineer | Tank geometry/design basis master data. Length values are normalized to meters. |
| shell_courses | Implemented | engineer | Shell course master data. Thickness and course height values are normalized to millimeters. |
| materials | Implemented | engineer / qa_qc | Material reference selector with Sprint 4 allowable-stress readiness fields. |
| evidence_files | Implemented | inspector / engineer | Evidence metadata and object-storage-compatible path registry. Binary object handling remains storage-layer responsibility. |
| evidence_links | Implemented | inspector / engineer | Evidence-to-entity traceability table. Same-asset linkage is enforced for asset, inspection_event, ndt_measurement, calculation_run, ffs_case, and rbi_case targets. Used by NDT approval evidence gate. |
| ndt_measurements | Implemented | inspector / engineer / qa_qc | NDT UT thickness measurement records with review/approval status and evidence gate. |
| workflow_events | Implemented | service / admin | AIM API event intake for n8n orchestration events. |
| error_logs | Implemented | service / admin / qa_qc | AIM API error/failure logging baseline. |
| engineering_data_dictionary | Implemented | senior_engineer / qa_qc | Field registry used by deterministic validation. |
| validation_runs | Implemented | engineer / senior_engineer / qa_qc | Stores validation result snapshots. |
| formula_registry | Implemented | admin / senior_engineer | Controlled formula metadata/versioning registry. No executable API/API-ASME formulas are embedded. |
| formula_test_runs | Implemented | admin / senior_engineer | Placeholder formula test-run records. No API/API-ASME formula execution. |
| calculation_runs | Sprint 6 implemented | engineer / senior_engineer | Deterministic calculation run headers, input snapshot hash, formula version trace, validation status, output summary, review/approval placeholders, and lock protection. |
| calculation_inputs | Sprint 6 implemented | engineer / senior_engineer | Field-level normalized calculation inputs, including NDT source entity and evidence reference where available. |
| calculation_outputs | Sprint 6 implemented | engineer / senior_engineer | Field-level deterministic outputs and engineering warnings. |
| ffs_trigger_rules | Sprint 7 implemented | senior_engineer | Configured trigger rules for FFS case creation. Trigger only; no fitness declaration. |
| ffs_cases | Sprint 7 implemented | engineer / senior_engineer | FFS trigger workflow cases requiring engineer review and senior engineer/admin final disposition approval. |
| rbi_trigger_rules | Sprint 8 implemented | senior_engineer | Configured RBI interface trigger rules mapped to deterministic calculation warnings and engineering review. No quantitative API RP 581 rules. |
| rbi_cases | Sprint 8 implemented | engineer / senior_engineer | RBI interface workflow cases with qualitative/semi-quantitative placeholder inputs, risk category, recommended interval, inspection plan reference, reviewer, approver, and calculation/evidence links. |
| audit_logs | Implemented | admin / qa_qc | Audit trail for critical create/update/delete/review/approval/governance actions. |

Supporting baseline tables also exist in the clean-clone schema and are used as references or future integration points: `inspection_events`, `engineering_reviews`, and `approval_records`. Sprint 6 promotes `calculation_runs`, `calculation_inputs`, and `calculation_outputs` from supporting schema to implemented deterministic calculation traceability tables. Sprint 7 promotes `ffs_cases` to an implemented FFS trigger workflow governance table and adds `ffs_trigger_rules`. Sprint 8 promotes `rbi_cases` to an implemented RBI interface workflow table and adds `rbi_trigger_rules`.

## Role and Access Tables

### users

| Field | Type | Required | Key / Reference | Notes |
|---|---|---:|---|---|
| id | uuid | yes | PK | Internal user identifier. |
| email | text | yes | unique | User email. Demo-only identity baseline. |
| full_name | text | yes |  | User display name. |
| password_hash | text | yes |  | Placeholder/demo auth only; production password/auth flow is future work. |
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
| file_size_bytes | bigint | yes | check >= 0 | File size; metadata-only MVP may use zero when binary upload is not implemented. |
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
- Binary object storage and signed URL handling remain storage-layer work; this baseline does not implement production object upload streaming.
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
| extraction_source | text | yes | manual, bulk_import, ai_staging, vendor_import |  | Source of NDT record. AI staging is a source label only; AI runtime is not implemented. |
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
| expression_type | text | yes | none, controlled_placeholder, engineer_entered, json_logic, text_rule | Expression classification. |
| expression_body | text | optional |  | Controlled expression body or placeholder. API/API-ASME formulas must remain placeholder unless licensed/approved by authorized engineer. |
| formula_expression_source | text | yes | default controlled_placeholder_manual_entry | Required source traceability field for expression governance. |
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
- `expression_body` may be a controlled placeholder for API-controlled formulas.
- `formula_expression_source` must identify the controlled source approach, e.g. licensed standard manual entry, engineer-approved workbook, or approved fixture.
- Production calculation may query only approved/locked, versioned formulas. Sprint 6 implements a universal deterministic calculation engine only; API/API-ASME formula execution remains prohibited unless a future controlled executor is explicitly implemented.

### formula_test_runs

| Field | Type | Required | Key / Reference | Notes |
|---|---|---:|---|---|
| id | uuid | yes | PK | Formula test run ID. |
| formula_record_id | uuid | yes | FK formula_registry.id | Tested formula record. |
| run_code | text | yes | unique | Test run code. |
| test_case_reference | text | optional |  | Validation workbook/fixture reference. |
| input_snapshot_json | jsonb | yes | default {} | Placeholder input snapshot. |
| output_snapshot_json | jsonb | yes | default {} | Placeholder output snapshot. |
| result_status | text | yes | placeholder, passed, failed, blocked | Test run state. Current runner is placeholder only. |
| message | text | yes |  | Test run message. |
| run_by | uuid | optional | FK users.id | User who ran the placeholder test. |
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
| output_summary | jsonb | yes |  | Summary counts, trigger candidates, and interval placeholder output. |
| input_snapshot_json | jsonb | yes |  | Raw calculation request/context snapshot. |
| unit_normalized_input_json | jsonb | yes |  | Unit-normalized inputs used by the deterministic engine. |
| validation_result_json | jsonb | yes |  | Validation result used before calculation output. |
| warnings_json | jsonb | yes |  | Engineering warnings generated by deterministic rules. |
| review_status / approval_status | text | yes |  | Review/approval placeholders for future governance sprint. |
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
| calculation_runs | Sprint 6 implemented | Deterministic run header with asset, formula registry version, run status, input snapshot hash, validation status, output summary, review/approval placeholders, locked flag, and audit traceability. |
| calculation_inputs | Sprint 6 implemented | Field-level normalized input rows. NDT measurement inputs store `source_entity_type`, `source_entity_id`, and `evidence_file_id` where available. |
| calculation_outputs | Sprint 6 implemented | Field-level output rows for corrosion-rate, remaining-life, warning, and trigger-candidate outputs. |
| engineering_reviews | Baseline implemented | Future human review workflow. |
| approval_records | Baseline implemented | Future approval records for issued engineering actions. |
| ffs_cases | Sprint 7 implemented | API 579-1/ASME FFS-1 trigger workflow governance. Trigger only; no FFS calculation or fitness declaration. |
| ffs_trigger_rules | Sprint 7 implemented | Configured trigger rules for calculation warnings and manual findings. |
| rbi_cases | Sprint 8 implemented | API RP 580/581 RBI interface workflow. Qualitative/semi-quantitative placeholder only; no proprietary quantitative API RP 581 rules are implemented. |
| rbi_trigger_rules | Sprint 8 implemented | Configured trigger rules for high corrosion rate, short remaining life, repeated anomalies, and engineering review. |

## Future / Not Implemented Tables

These remain planned and are not implemented in the Sprint 8 baseline:

| Table / Area | Status | Rule |
|---|---|---|
| extraction_jobs, extraction_fields, staging_records | Planned | AI output must go to staging only. |
| manual_overrides, data_quality_checks | Planned | Reviewer corrections require reason and audit trail. |
| cml_points, thickness_readings | Planned | Detailed CML/TML master and reading decomposition beyond current `ndt_measurements`. |
| reports, report_templates, report_versions | Planned | Reports cannot be issued without data, calculation, review, evidence, and approval gates. |
| internal_work_orders | Planned | MVP must include internal work-order fallback before external CMMS integration. |

## Current Non-Negotiable Data Rules

1. AIM is the system of record.
2. n8n must call AIM APIs and must not write directly to PostgreSQL.
3. AI extraction is not implemented; future AI output must remain staging-only.
4. AI cannot approve engineering data, NDT records, formulas, calculations, integrity decisions, or reports.
5. Evidence linkage is mandatory for NDT approval gates; Sprint 6 calculation inputs preserve available NDT/evidence traceability; Sprint 7 FFS cases and Sprint 8 RBI cases preserve supporting measurement/evidence snapshots and future calculation approval gates must enforce this linkage before final approval.
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
| trigger_source_type | text | yes |  | `calculation_warning` or `engineering_review`. |
| warning_codes | text[] | yes |  | Deterministic calculation warning codes that may create RBI case. |
| probability_driver | text | yes |  | Qualitative/semi-quantitative placeholder driver. |
| consequence_driver | text | yes |  | Consequence placeholder driver. |
| default_risk_category | text | yes |  | Placeholder risk category. |
| recommended_interval | text | yes |  | Placeholder inspection interval recommendation. |
| inspection_plan_reference | text | yes |  | Placeholder inspection planning reference. |
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
| damage_mechanism | text | yes |  | Damage mechanism placeholder/classification. |
| probability_driver | text | yes |  | Probability driver placeholder. |
| consequence_driver | text | yes |  | Consequence driver placeholder. |
| risk_category | text | yes |  | Qualitative/semi-quantitative risk category placeholder. |
| recommended_interval | text | yes |  | Inspection interval recommendation placeholder. |
| inspection_plan_reference | text | yes |  | Inspection plan reference placeholder. |
| evidence_links | jsonb | yes |  | Supporting evidence snapshot. Evidence is also linked through evidence_links table. |
| input_placeholders | jsonb | yes |  | Consequence of failure, probability of failure, damage mechanism, inspection effectiveness, fluid service, inventory, operating severity, and mitigation controls placeholders. |
| trigger_source | text | yes |  | `calculation_warning` or `engineering_review`. |
| trigger_reason | text | yes |  | Trigger explanation. |
| trigger_rule_id | text | yes |  | RBI trigger rule used. |
| calculation_basis | text | yes |  | Clearly states placeholder basis. |
| calculation_basis_note | text | yes |  | States quantitative API RP 581 rules are not implemented unless Formula Registry provides approved rules. |
| status | text | yes | allowed statuses | Workflow status: open, under_review, data_required, assessment_in_progress, ready_for_review, approved, exported, closed. |
| reviewer | uuid | no | FK users(id) | Reviewer. |
| approver | uuid | no | FK users(id) | Senior engineer/admin approver. |
| reviewed_at | timestamptz | no |  | Review timestamp. |
| approved_at | timestamptz | no |  | Approval/export timestamp. |
| created_by | uuid | no | FK users(id) | Creator. |
| updated_by | uuid | no | FK users(id) | Last updater. |
| created_at | timestamptz | yes | default now() | Creation timestamp. |
| updated_at | timestamptz | yes | default now() | Update timestamp. |


## Sprint 8 RBI Interface Governance Notes

RBI interface cases are governance records aligned to API RP 580/581 workflow needs. They preserve trigger reason, calculation warning sources, placeholder input fields, evidence snapshots, workflow status, review, and approval/export metadata.

- `rbi_cases.asset_id` is the controlling asset for RBI interface workflow.
- `rbi_cases.calculation_run_id` links a case to deterministic calculation warning sources when applicable.
- `rbi_cases.evidence_links` may store supporting evidence snapshots, but evidence files must belong to the same asset.
- `evidence_links` may link `evidence_files` to `rbi_case` records after same-asset validation.
- Quantitative API RP 581 probability/consequence/risk rules are not implemented or embedded.
- Future quantitative RBI must use approved Formula Registry metadata and a controlled executor.


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

Migration `0013_source_truth_schema_closure.sql` adds schema-readiness tables required by the AIM+n8n source-of-truth package. The migration is intentionally limited to database foundations and does not implement AI extraction business workflow, report issue workflow, API 579/API 581, CMMS integration, 3D processing, or proprietary API/API-ASME formula logic.

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
- `evidence_files` now includes malware scan placeholder/access governance columns: `malware_scan_status`, `access_status`, `accessed_at`, `delete_requested_by`, `delete_requested_at`, `delete_approved_by`, and `delete_approved_at`.
- Evidence download access is represented by signed URL issuance through AIM APIs and audited via `audit_logs`; object storage remains private.
- Linked evidence cannot be approved for deletion; evidence lineage remains retained for auditability.
