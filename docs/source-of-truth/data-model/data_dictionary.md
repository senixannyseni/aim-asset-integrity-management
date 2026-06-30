# AIM+n8n MVP Data Dictionary
## Pre-Implementation Governance Check
### Assumptions
- AIM is the system of record for final structured engineering data.
- PostgreSQL stores final structured records; object storage stores original evidence files.
- n8n is workflow orchestration only: trigger, routing, reminder, approval notification, integration event, and audit event routing.
- n8n must not store final engineering data and must not write directly to PostgreSQL.
- AI extraction output must go to staging first and requires Engineer or Lead Engineer review before promotion.
- Calculation engine is deterministic, versioned, testable, and auditable. No proprietary API/ASME formulas are invented or reproduced.
- Evidence linkage is mandatory for findings, NDT measurements, calculations, integrity decisions, reports, and work orders where applicable.

### Impacted Documents
- `01_PRD/AIM_MVP_PRD.md`
- `03_Database/data_dictionary.xlsx`
- `03_Database/data_dictionary.md`
- `docs/erd.md`
- `07_Calculation/engineering_basis.md`
- `07_Calculation/calculation_validation_method.md`

### Impacted Tables
- **Identity and access:** `users`, `roles`, `permissions`, `user_roles`, `role_permissions`
- **Asset and inspection:** `assets`, `asset_components`, `inspections`, `inspection_findings`
- **Evidence:** `evidence_files`, `evidence_links`
- **AI extraction and staging:** `extraction_jobs`, `extraction_fields`, `staging_records`, `manual_overrides`, `data_quality_checks`
- **NDT:** `ndt_measurements`, `cml_points`, `thickness_readings`
- **Calculation:** `formula_versions`, `calculation_runs`, `calculation_inputs`, `calculation_outputs`, `calculation_validation_cases`
- **Integrity and reporting:** `integrity_decisions`, `reports`, `report_templates`, `report_versions`
- **Workflow and operation:** `workflow_events`, `workflow_tasks`, `notification_logs`, `error_logs`, `audit_logs`, `import_batches`, `system_settings`, `internal_work_orders`

### Impacted Endpoints
- Identity/access: `/api/users`, `/api/roles`, `/api/permissions`
- Asset/inspection: `/api/assets`, `/api/asset-components`, `/api/inspections`, `/api/inspection-findings`
- Evidence: `/api/evidence-files`, `/api/evidence-links`
- AI staging: `/api/extraction-jobs`, `/api/staging-records`, `/api/manual-overrides`, `/api/data-quality-checks`
- NDT: `/api/ndt-measurements`, `/api/cml-points`, `/api/thickness-readings`
- Calculation: `/api/formula-versions`, `/api/calculation-runs`, `/api/calculation-validation-cases`
- Integrity/reporting: `/api/integrity-decisions`, `/api/reports`, `/api/report-templates`, `/api/report-versions`
- Workflow/operation: `/api/workflow-events`, `/api/workflow-tasks`, `/api/notifications`, `/api/errors`, `/api/audit-logs`, `/api/import-batches`, `/api/system-settings`, `/api/internal-work-orders`

### Required Permissions
- `admin.manage`, `user.manage`, `role.manage`, `permission.manage`
- `asset.create`, `asset.update`, `asset.read`
- `inspection.create`, `inspection.submit`, `inspection.review`, `inspection.approve`, `inspection.reject`
- `evidence.upload`, `evidence.link`, `evidence.verify`
- `extraction.submit`, `staging.review`, `staging.promote`, `staging.reject`, `staging.correct`
- `ndt.create`, `ndt.review`, `ndt.approve`
- `calculation.run`, `calculation.review`, `calculation.approve`, `formula.manage`, `formula.approve`
- `integrity.decide`, `integrity.approve`, `report.generate`, `report.approve`, `report.issue`
- `workflow.manage`, `work_order.create`, `work_order.update`, `audit.read`, `system_settings.manage`

### Required Audit Events
- User/role/permission create, update, revoke.
- Asset/component create, update, retire.
- Inspection submit, review, approve, reject, close.
- Evidence upload, verify, reject, link, unlink.
- AI extraction submit, complete, fail; staging approve, reject, correct, promote.
- NDT reading create, update, review, approve, reject.
- Formula version create, review, approve, retire; calculation run, warning, review, approve, reject.
- Integrity decision create, submit, approve, reject.
- Report generate, approve, block, issue, void.
- Internal work order create, assign, update, complete, close.

### Required Validation Rules
- Required fields, FK existence, allowed enum values, positive numeric engineering values, unit consistency, and workflow transitions must be enforced.
- Engineering data promoted from AI extraction must pass staging review and data quality checks first.
- Report issue must be blocked unless evidence, reviewed data, calculation, integrity decision, and approval gates are satisfied.
- Formula versions must be approved before official calculation execution.

### Required Test Cases
- RBAC permission checks for each write/review/approval endpoint.
- Staging-first AI extraction tests proving no direct final-table write.
- Evidence-required gate tests for findings, readings, calculations, decisions, and reports.
- Calculation validation tests against `07_Calculation/validation_workbook.xlsx`.
- Report issue gate tests for missing data/evidence/review/approval.
- Audit log presence tests for approval, rejection, correction, calculation, report issue, and work order action.

### Migration / Documentation Updates
- Create PostgreSQL migrations from this logical dictionary.
- Generate OpenAPI schemas from the same field definitions.
- Keep `docs/erd.md` synchronized with database migrations.
- Update this dictionary when field names, enum values, validation rules, or ownership change.

## Table Group Summary

| group_name | table_name | description |
|---|---|---|
| Identity and access | `users` | Human and service users authorized to access AIM. |
| Identity and access | `roles` | Role catalog used for RBAC. |
| Identity and access | `permissions` | Atomic permissions mapped to modules and actions. |
| Identity and access | `user_roles` | Assignment of roles to users. |
| Identity and access | `role_permissions` | Assignment of permissions to roles. |
| Asset and inspection | `assets` | Atmospheric storage tank asset register records. |
| Asset and inspection | `asset_components` | Tank components such as shell courses, floor, roof, and nozzles. |
| Asset and inspection | `inspections` | Inspection workspaces and lifecycle records. |
| Asset and inspection | `inspection_findings` | Engineer-reviewable findings discovered during inspection. |
| Evidence | `evidence_files` | Object storage metadata for original evidence files. |
| Evidence | `evidence_links` | Traceability links from evidence to AIM entities. |
| AI extraction and staging | `extraction_jobs` | AI extraction job metadata and status; output goes to staging only. |
| AI extraction and staging | `extraction_fields` | Field-level extraction output linked to evidence and review state. |
| AI extraction and staging | `staging_records` | Proposed normalized records awaiting human review before promotion. |
| AI extraction and staging | `manual_overrides` | Human corrections to staging values with reasons. |
| AI extraction and staging | `data_quality_checks` | Automated validation and quality checks for staging records. |
| NDT | `ndt_measurements` | NDT datasets such as UT thickness campaigns. |
| NDT | `cml_points` | Condition monitoring locations/points on tank components. |
| NDT | `thickness_readings` | UT thickness readings linked to CML points and evidence. |
| Calculation | `formula_versions` | Approved deterministic formula registry versions. |
| Calculation | `calculation_runs` | Executed calculation run header and review state. |
| Calculation | `calculation_inputs` | Immutable calculation inputs with source and evidence linkage. |
| Calculation | `calculation_outputs` | Calculation results, statuses, warnings, and evidence linkage. |
| Calculation | `calculation_validation_cases` | Validation fixtures for deterministic calculation testing. |
| Integrity and reporting | `integrity_decisions` | Human engineering integrity decisions based on reviewed data and calculations. |
| Integrity and reporting | `reports` | Report lifecycle header and issue gate status. |
| Integrity and reporting | `report_templates` | Approved report template catalog. |
| Integrity and reporting | `report_versions` | Rendered report versions and approval snapshots. |
| Workflow and operation | `workflow_events` | Event bus records published by AIM for n8n orchestration. |
| Workflow and operation | `workflow_tasks` | Human review, approval, reminder, and operational tasks. |
| Workflow and operation | `notification_logs` | Notification send logs and delivery status. |
| Workflow and operation | `error_logs` | Application/workflow error records. |
| Workflow and operation | `audit_logs` | Immutable audit trail for critical actions. |
| Workflow and operation | `import_batches` | Bulk import batches for files and structured data. |
| Workflow and operation | `system_settings` | Configurable system settings under IT/Admin control. |
| Workflow and operation | `internal_work_orders` | MVP fallback work order records before external CMMS integration. |

## Field-Level Data Dictionary

## Identity and access

### `users`

Human and service users authorized to access AIM.

| field_name | data_type | required yes/no | primary_key/foreign_key | reference_table | unit | allowed_values | default_value | validation_rule | description | example_value | data_owner_role | audit_required yes/no |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| user_id | uuid | yes | PK |  |  |  | gen_random_uuid() | Must be unique and immutable. | Primary user identifier. | 2b7c6e2e-0000-4000-9000-000000000001 | IT Admin | no |
| email | varchar(320) | yes |  |  |  |  |  | Must be unique, normalized lowercase, valid email format. | User login email. | engineer@example.com | IT Admin | yes |
| full_name | varchar(200) | yes |  |  |  |  |  | Cannot be blank. | Full legal/display name. | Budi Santoso | IT Admin | yes |
| display_name | varchar(100) | no |  |  |  |  |  | Optional short name. | Short display name. | Budi | IT Admin | yes |
| account_status | varchar(30) | yes |  |  |  | active, invited, disabled, locked | invited | Must be one of allowed values. | Account lifecycle status. | active | IT Admin | yes |
| mfa_enabled | boolean | yes |  |  |  | true, false | false | Must be boolean. | Whether MFA is enabled. | true | IT Admin | yes |
| last_login_at | timestamptz | no |  |  |  |  |  | Server-generated from authentication event. | Last successful login timestamp. | 2026-06-11T08:55:00+07:00 | IT Admin | no |
| created_at | timestamptz | yes |  |  |  |  | now() | Must be server-generated timestamp. | Record creation timestamp. | 2026-06-11T09:00:00+07:00 | IT Admin | no |
| updated_at | timestamptz | no |  |  |  |  |  | Must be server-generated when record changes. | Last update timestamp. | 2026-06-11T10:30:00+07:00 | IT Admin | no |
| created_by | uuid | no | FK | users.user_id |  |  |  | Required for human-created records; nullable for system migration. | User who created the record. | 2b7c6e2e-0000-4000-9000-000000000001 | IT Admin | yes |
| updated_by | uuid | no | FK | users.user_id |  |  |  | Required when updated through the application. | User who last updated the record. | 2b7c6e2e-0000-4000-9000-000000000001 | IT Admin | yes |

### `roles`

Role catalog used for RBAC.

| field_name | data_type | required yes/no | primary_key/foreign_key | reference_table | unit | allowed_values | default_value | validation_rule | description | example_value | data_owner_role | audit_required yes/no |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| role_id | uuid | yes | PK |  |  |  | gen_random_uuid() | Must be unique and immutable. | Primary role identifier. | 11111111-1111-4111-8111-111111111111 | IT Admin | no |
| role_code | varchar(80) | yes |  |  |  | admin, inspector, engineer, lead_engineer, approver, management, it_admin |  | Must be unique lowercase snake_case. | Role code used in permission checks. | engineer | IT Admin | yes |
| role_name | varchar(120) | yes |  |  |  |  |  | Cannot be blank. | Human-readable role name. | Engineer | IT Admin | yes |
| description | text | no |  |  |  |  |  | Optional role description. | Role scope and purpose. | Reviews staged engineering data and calculations. | IT Admin | yes |
| is_system_role | boolean | yes |  |  |  | true, false | true | System roles cannot be deleted if assigned. | Whether role is protected system role. | true | IT Admin | yes |
| created_at | timestamptz | yes |  |  |  |  | now() | Must be server-generated timestamp. | Record creation timestamp. | 2026-06-11T09:00:00+07:00 | IT Admin | no |
| updated_at | timestamptz | no |  |  |  |  |  | Must be server-generated when record changes. | Last update timestamp. | 2026-06-11T10:30:00+07:00 | IT Admin | no |
| created_by | uuid | no | FK | users.user_id |  |  |  | Required for human-created records; nullable for system migration. | User who created the record. | 2b7c6e2e-0000-4000-9000-000000000001 | IT Admin | yes |
| updated_by | uuid | no | FK | users.user_id |  |  |  | Required when updated through the application. | User who last updated the record. | 2b7c6e2e-0000-4000-9000-000000000001 | IT Admin | yes |

### `permissions`

Atomic permissions mapped to modules and actions.

| field_name | data_type | required yes/no | primary_key/foreign_key | reference_table | unit | allowed_values | default_value | validation_rule | description | example_value | data_owner_role | audit_required yes/no |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| permission_id | uuid | yes | PK |  |  |  | gen_random_uuid() | Must be unique and immutable. | Primary permission identifier. | 22222222-2222-4222-8222-222222222222 | IT Admin | no |
| permission_code | varchar(120) | yes |  |  |  | module.action format |  | Must be unique lowercase dot notation. | Atomic permission code. | calculation.review | IT Admin | yes |
| module | varchar(80) | yes |  |  |  | asset, inspection, evidence, extraction, ndt, calculation, integrity, report, workflow, admin |  | Must match known module. | Module namespace. | calculation | IT Admin | yes |
| action | varchar(80) | yes |  |  |  | create, read, update, delete, submit, review, approve, reject, issue, run, manage |  | Must match permitted action taxonomy. | Permission action. | review | IT Admin | yes |
| description | text | no |  |  |  |  |  | Optional permission description. | Description of permission. | Allows review of calculation outputs. | IT Admin | yes |
| created_at | timestamptz | yes |  |  |  |  | now() | Must be server-generated timestamp. | Record creation timestamp. | 2026-06-11T09:00:00+07:00 | IT Admin | no |
| updated_at | timestamptz | no |  |  |  |  |  | Must be server-generated when record changes. | Last update timestamp. | 2026-06-11T10:30:00+07:00 | IT Admin | no |
| created_by | uuid | no | FK | users.user_id |  |  |  | Required for human-created records; nullable for system migration. | User who created the record. | 2b7c6e2e-0000-4000-9000-000000000001 | IT Admin | yes |
| updated_by | uuid | no | FK | users.user_id |  |  |  | Required when updated through the application. | User who last updated the record. | 2b7c6e2e-0000-4000-9000-000000000001 | IT Admin | yes |

### `user_roles`

Assignment of roles to users.

| field_name | data_type | required yes/no | primary_key/foreign_key | reference_table | unit | allowed_values | default_value | validation_rule | description | example_value | data_owner_role | audit_required yes/no |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| user_id | uuid | yes | PK/FK | users.user_id |  |  |  | Must reference active user. | Assigned user. | 2b7c6e2e-0000-4000-9000-000000000001 | IT Admin | yes |
| role_id | uuid | yes | PK/FK | roles.role_id |  |  |  | Must reference active role. | Assigned role. | 11111111-1111-4111-8111-111111111111 | IT Admin | yes |
| assigned_at | timestamptz | yes |  |  |  |  | now() | Server-generated. | Assignment timestamp. | 2026-06-11T09:00:00+07:00 | IT Admin | yes |
| assigned_by | uuid | yes | FK | users.user_id |  |  |  | Must reference user with admin.manage permission. | User who assigned role. | aaaaaaaa-0000-4000-9000-000000000001 | IT Admin | yes |
| expires_at | timestamptz | no |  |  |  |  |  | Must be after assigned_at if provided. | Optional expiry timestamp. | 2026-12-31T23:59:00+07:00 | IT Admin | yes |
| status | varchar(30) | yes |  |  |  | active, revoked, expired | active | Must be one of allowed values. | Role assignment status. | active | IT Admin | yes |

### `role_permissions`

Assignment of permissions to roles.

| field_name | data_type | required yes/no | primary_key/foreign_key | reference_table | unit | allowed_values | default_value | validation_rule | description | example_value | data_owner_role | audit_required yes/no |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| role_id | uuid | yes | PK/FK | roles.role_id |  |  |  | Must reference active role. | Role receiving permission. | 11111111-1111-4111-8111-111111111111 | IT Admin | yes |
| permission_id | uuid | yes | PK/FK | permissions.permission_id |  |  |  | Must reference existing permission. | Permission assigned to role. | 22222222-2222-4222-8222-222222222222 | IT Admin | yes |
| granted_at | timestamptz | yes |  |  |  |  | now() | Server-generated. | Grant timestamp. | 2026-06-11T09:00:00+07:00 | IT Admin | yes |
| granted_by | uuid | yes | FK | users.user_id |  |  |  | Must reference user with admin.manage permission. | User who granted permission. | aaaaaaaa-0000-4000-9000-000000000001 | IT Admin | yes |
| status | varchar(30) | yes |  |  |  | active, revoked | active | Must be one of allowed values. | Permission assignment status. | active | IT Admin | yes |

## Asset and inspection

### `assets`

Atmospheric storage tank asset register records.

| field_name | data_type | required yes/no | primary_key/foreign_key | reference_table | unit | allowed_values | default_value | validation_rule | description | example_value | data_owner_role | audit_required yes/no |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| asset_id | uuid | yes | PK |  |  |  | gen_random_uuid() | Must be unique and immutable. | Primary asset identifier. | 33333333-3333-4333-8333-333333333333 | Admin | no |
| asset_tag | varchar(80) | yes |  |  |  |  |  | Must be unique per site; no blank value. | Asset tag used by operations. | T-02 | Admin | yes |
| asset_name | varchar(200) | no |  |  |  |  |  | Optional descriptive name. | Asset name. | Solar Storage Tank T-02 | Admin | yes |
| asset_type | varchar(80) | yes |  |  |  | atmospheric_storage_tank | atmospheric_storage_tank | MVP allows atmospheric_storage_tank only. | Asset category covered by MVP. | atmospheric_storage_tank | Admin | yes |
| site_name | varchar(200) | yes |  |  |  |  |  | Cannot be blank. | Site/facility name. | Fuel Terminal A | Admin | yes |
| area | varchar(200) | no |  |  |  |  |  | Optional area/unit. | Plant area or unit. | Tank Farm 1 | Admin | yes |
| service_fluid | varchar(120) | no |  |  |  |  |  | Optional, engineer-reviewed if used in reports. | Stored service/fluid. | Solar | Engineer | yes |
| design_code_reference | varchar(120) | no |  |  |  | API 650, unknown, other |  | High-level design reference only; do not store copyrighted clauses. | Design code reference if available. | API 650 | Engineer | yes |
| design_capacity_m3 | numeric(14,3) | no |  |  | m3 |  |  | Must be >= 0 if provided. | Design capacity. | 1000.000 | Engineer | yes |
| material | varchar(120) | no |  |  |  |  |  | Optional; should be evidence-linked if used in calculations. | Material summary. | SA-283 Gr C | Engineer | yes |
| construction_year | integer | no |  |  | year |  |  | Must be between 1900 and current year+1. | Year built/constructed. | 2010 | Engineer | yes |
| asset_status | varchar(40) | yes |  |  |  | active, inactive, retired, under_review | active | Must be one of allowed values. | Operational status. | active | Admin | yes |
| created_at | timestamptz | yes |  |  |  |  | now() | Must be server-generated timestamp. | Record creation timestamp. | 2026-06-11T09:00:00+07:00 | Admin | no |
| updated_at | timestamptz | no |  |  |  |  |  | Must be server-generated when record changes. | Last update timestamp. | 2026-06-11T10:30:00+07:00 | Admin | no |
| created_by | uuid | no | FK | users.user_id |  |  |  | Required for human-created records; nullable for system migration. | User who created the record. | 2b7c6e2e-0000-4000-9000-000000000001 | Admin | yes |
| updated_by | uuid | no | FK | users.user_id |  |  |  | Required when updated through the application. | User who last updated the record. | 2b7c6e2e-0000-4000-9000-000000000001 | Admin | yes |

### `asset_components`

Tank components such as shell courses, floor, roof, and nozzles.

| field_name | data_type | required yes/no | primary_key/foreign_key | reference_table | unit | allowed_values | default_value | validation_rule | description | example_value | data_owner_role | audit_required yes/no |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| component_id | uuid | yes | PK |  |  |  | gen_random_uuid() | Must be unique and immutable. | Primary component identifier. | 44444444-4444-4444-8444-444444444444 | Engineer | no |
| asset_id | uuid | yes | FK | assets.asset_id |  |  |  | Must reference existing asset. | Parent asset. | 33333333-3333-4333-8333-333333333333 | Engineer | yes |
| component_type | varchar(60) | yes |  |  |  | shell, shell_course, floor, roof, nozzle, annular_plate, bottom_plate, other |  | Must be one of allowed values. | Tank component type. | shell_course | Engineer | yes |
| component_code | varchar(80) | no |  |  |  |  |  | Unique within asset if provided. | Component label/code. | Shell Course 1 | Engineer | yes |
| course_no | integer | no |  |  | course |  | Required when component_type=shell_course; must be >=1. | Shell course number for tank shell. | 1 | Engineer | yes | yes |
| nominal_thickness_mm | numeric(10,3) | no |  | mm |  |  | Must be > 0 if provided. | Nominal/design thickness. | 8.000 | Engineer | yes | yes |
| material_spec | varchar(120) | no |  |  |  |  |  | Evidence-linked if used in decision. | Component material specification. | SA-283 Gr C | Engineer | yes |
| elevation_mm | numeric(12,2) | no |  | mm |  |  | Optional component elevation reference. | Elevation reference. | 0.00 | Engineer | yes | yes |
| design_data_available | boolean | yes |  |  |  | true, false | false | Must be boolean. | Whether component design data is available. | true | Engineer | yes |
| created_at | timestamptz | yes |  |  |  |  | now() | Must be server-generated timestamp. | Record creation timestamp. | 2026-06-11T09:00:00+07:00 | Engineer | no |
| updated_at | timestamptz | no |  |  |  |  |  | Must be server-generated when record changes. | Last update timestamp. | 2026-06-11T10:30:00+07:00 | Engineer | no |
| created_by | uuid | no | FK | users.user_id |  |  |  | Required for human-created records; nullable for system migration. | User who created the record. | 2b7c6e2e-0000-4000-9000-000000000001 | Engineer | yes |
| updated_by | uuid | no | FK | users.user_id |  |  |  | Required when updated through the application. | User who last updated the record. | 2b7c6e2e-0000-4000-9000-000000000001 | Engineer | yes |

### `inspections`

Inspection workspaces and lifecycle records.

| field_name | data_type | required yes/no | primary_key/foreign_key | reference_table | unit | allowed_values | default_value | validation_rule | description | example_value | data_owner_role | audit_required yes/no |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| inspection_id | uuid | yes | PK |  |  |  | gen_random_uuid() | Must be unique and immutable. | Primary inspection identifier. | 55555555-5555-4555-8555-555555555555 | Inspector | no |
| asset_id | uuid | yes | FK | assets.asset_id |  |  |  | Must reference active asset. | Inspected asset. | 33333333-3333-4333-8333-333333333333 | Inspector | yes |
| inspection_code | varchar(100) | yes |  |  |  |  |  | Must be unique per asset. | Inspection job/code. | INSP-T02-2026-001 | Inspector | yes |
| inspection_type | varchar(80) | yes |  |  |  | external, internal, UT_thickness, API_653_review, other |  | Must be allowed type. | Inspection type. | UT_thickness | Inspector | yes |
| inspection_start_date | date | yes |  |  |  |  |  | Must be <= inspection_end_date. | Inspection start date. | 2026-05-01 | Inspector | yes |
| inspection_end_date | date | no |  |  |  |  |  | Must be >= inspection_start_date if provided. | Inspection end date. | 2026-05-05 | Inspector | yes |
| inspection_status | varchar(40) | yes |  |  |  | draft, in_progress, submitted, engineering_review, approved, rejected, closed | draft | Must follow workflow transitions. | Inspection lifecycle status. | engineering_review | Inspector | yes |
| lead_inspector_id | uuid | no | FK | users.user_id |  |  |  | User must have inspector role. | Lead inspector. | 77777777-7777-4777-8777-777777777777 | Inspector | yes |
| engineer_id | uuid | no | FK | users.user_id |  |  |  | User must have engineer role. | Assigned engineer. | 88888888-8888-4888-8888-888888888888 | Lead Engineer | yes |
| report_due_date | date | no |  |  |  |  |  | Optional due date; cannot be before start date. | Target report due date. | 2026-05-20 | Lead Engineer | yes |
| created_at | timestamptz | yes |  |  |  |  | now() | Must be server-generated timestamp. | Record creation timestamp. | 2026-06-11T09:00:00+07:00 | Inspector | no |
| updated_at | timestamptz | no |  |  |  |  |  | Must be server-generated when record changes. | Last update timestamp. | 2026-06-11T10:30:00+07:00 | Inspector | no |
| created_by | uuid | no | FK | users.user_id |  |  |  | Required for human-created records; nullable for system migration. | User who created the record. | 2b7c6e2e-0000-4000-9000-000000000001 | Inspector | yes |
| updated_by | uuid | no | FK | users.user_id |  |  |  | Required when updated through the application. | User who last updated the record. | 2b7c6e2e-0000-4000-9000-000000000001 | Inspector | yes |

### `inspection_findings`

Engineer-reviewable findings discovered during inspection.

| field_name | data_type | required yes/no | primary_key/foreign_key | reference_table | unit | allowed_values | default_value | validation_rule | description | example_value | data_owner_role | audit_required yes/no |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| finding_id | uuid | yes | PK |  |  |  | gen_random_uuid() | Must be unique and immutable. | Primary finding identifier. | 66666666-6666-4666-8666-666666666666 | Inspector | no |
| inspection_id | uuid | yes | FK | inspections.inspection_id |  |  |  | Must reference inspection. | Parent inspection. | 55555555-5555-4555-8555-555555555555 | Inspector | yes |
| component_id | uuid | no | FK | asset_components.component_id |  |  |  | Required if finding is component-specific. | Related component. | 44444444-4444-4444-8444-444444444444 | Inspector | yes |
| finding_type | varchar(80) | yes |  |  |  | corrosion, deformation, coating, leakage, crack, settlement, thickness_below_min, other |  | Must be allowed finding type. | Finding category. | corrosion | Inspector | yes |
| severity | varchar(30) | yes |  |  |  | low, medium, high, critical | medium | Must be one of allowed values. | Engineering severity. | high | Engineer | yes |
| description | text | yes |  |  |  |  |  | Cannot be blank; should be factual. | Finding description. | Localized thinning observed on shell course 1. | Inspector | yes |
| recommendation | text | no |  |  |  |  |  | Engineer-reviewed recommendation required before report issue. | Recommended action. | Review repair option and monitor thickness. | Engineer | yes |
| evidence_required | boolean | yes |  |  |  | true, false | true | Must be true for reportable findings. | Whether evidence link is mandatory. | true | Engineer | yes |
| review_status | varchar(40) | yes |  |  |  | draft, submitted, reviewed, rejected, approved | draft | Must follow review workflow. | Review status. | reviewed | Engineer | yes |
| created_at | timestamptz | yes |  |  |  |  | now() | Must be server-generated timestamp. | Record creation timestamp. | 2026-06-11T09:00:00+07:00 | Inspector | no |
| updated_at | timestamptz | no |  |  |  |  |  | Must be server-generated when record changes. | Last update timestamp. | 2026-06-11T10:30:00+07:00 | Inspector | no |
| created_by | uuid | no | FK | users.user_id |  |  |  | Required for human-created records; nullable for system migration. | User who created the record. | 2b7c6e2e-0000-4000-9000-000000000001 | Inspector | yes |
| updated_by | uuid | no | FK | users.user_id |  |  |  | Required when updated through the application. | User who last updated the record. | 2b7c6e2e-0000-4000-9000-000000000001 | Inspector | yes |

## Evidence

### `evidence_files`

Object storage metadata for original evidence files.

| field_name | data_type | required yes/no | primary_key/foreign_key | reference_table | unit | allowed_values | default_value | validation_rule | description | example_value | data_owner_role | audit_required yes/no |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| evidence_file_id | uuid | yes | PK |  |  |  | gen_random_uuid() | Must be unique and immutable. | Primary evidence file identifier. | e1111111-1111-4111-8111-111111111111 | Inspector | no |
| storage_uri | text | yes |  |  |  |  |  | Must be object storage URI; not a local path; immutable after upload. | Object storage URI for original evidence file. | s3://aim-evidence/site-a/T-02/ut-report.pdf | IT Admin | yes |
| original_file_name | varchar(255) | yes |  |  |  |  |  | Cannot be blank. | Original filename. | ut-report.pdf | Inspector | yes |
| file_type | varchar(80) | yes |  |  |  | pdf, image, spreadsheet, csv, ndt_export, drawing, other |  | Must match supported evidence types. | Evidence file category. | pdf | Inspector | yes |
| mime_type | varchar(120) | no |  |  |  |  |  | Must match uploaded object metadata if available. | MIME type. | application/pdf | IT Admin | yes |
| checksum_sha256 | char(64) | yes |  |  |  |  |  | Must be valid SHA-256 hex; unique per object version if required. | File integrity checksum. | 7d793037a0760186574b0282f2f435e7 | IT Admin | yes |
| file_size_bytes | bigint | yes |  | bytes |  |  | Must be > 0. | File size. | 2457600 | IT Admin | yes | yes |
| uploaded_by | uuid | yes | FK | users.user_id |  |  |  | Must reference active user. | Uploader. | 77777777-7777-4777-8777-777777777777 | Inspector | yes |
| uploaded_at | timestamptz | yes |  |  |  |  | now() | Server-generated. | Upload timestamp. | 2026-06-11T09:00:00+07:00 | Inspector | no |
| evidence_status | varchar(40) | yes |  |  |  | uploaded, verified, rejected, archived | uploaded | Must follow evidence lifecycle. | Evidence file status. | verified | Inspector | yes |
| source_system | varchar(40) | yes |  |  |  | AIM, import, n8n_notification | AIM | n8n may reference but must not store final engineering data. | Upload source. | AIM | IT Admin | yes |

### `evidence_links`

Traceability links from evidence to AIM entities.

| field_name | data_type | required yes/no | primary_key/foreign_key | reference_table | unit | allowed_values | default_value | validation_rule | description | example_value | data_owner_role | audit_required yes/no |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| evidence_link_id | uuid | yes | PK |  |  |  | gen_random_uuid() | Must be unique and immutable. | Primary evidence link identifier. | e2222222-2222-4222-8222-222222222222 | Inspector | no |
| evidence_file_id | uuid | yes | FK | evidence_files.evidence_file_id |  |  |  | Must reference verified or uploaded evidence. | Evidence file. | e1111111-1111-4111-8111-111111111111 | Inspector | yes |
| entity_type | varchar(80) | yes |  |  |  | asset, inspection, finding, extraction_field, staging_record, ndt_measurement, thickness_reading, calculation_input, calculation_output, integrity_decision, report_version, internal_work_order |  | Must be supported AIM entity type. | Entity type being evidenced. | thickness_reading | Engineer | yes |
| entity_id | uuid | yes |  |  |  |  |  | Must refer to entity_type identifier; enforce in application if polymorphic. | Target entity identifier. | t1111111-1111-4111-8111-111111111111 | Engineer | yes |
| page_no | integer | no |  | page |  |  | Must be >= 1 for paginated files. | Page number in source file. | 12 | Inspector | yes | yes |
| coordinate_ref | varchar(255) | no |  |  |  |  |  | Optional coordinate or bounding reference. | Evidence location reference. | x=120,y=340,w=80,h=20 | Inspector | yes |
| evidence_code | varchar(100) | yes |  |  |  |  |  | Must be unique per inspection when practical. | Human-readable evidence code. | EV-T02-UT-001 | Inspector | yes |
| description | text | no |  |  |  |  |  | Brief explanation of evidence relevance. | Evidence link description. | UT reading table for shell course 1. | Inspector | yes |
| linked_by | uuid | yes | FK | users.user_id |  |  |  | Must reference active user. | User who linked evidence. | 88888888-8888-4888-8888-888888888888 | Engineer | yes |
| created_at | timestamptz | yes |  |  |  |  | now() | Server-generated. | Evidence link creation timestamp. | 2026-06-11T09:00:00+07:00 | Engineer | no |

## AI extraction and staging

### `extraction_jobs`

AI extraction job metadata and status; output goes to staging only.

| field_name | data_type | required yes/no | primary_key/foreign_key | reference_table | unit | allowed_values | default_value | validation_rule | description | example_value | data_owner_role | audit_required yes/no |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| extraction_job_id | uuid | yes | PK |  |  |  | gen_random_uuid() | Must be unique and immutable. | Primary AI extraction job identifier. | x1111111-1111-4111-8111-111111111111 | System | no |
| inspection_id | uuid | yes | FK | inspections.inspection_id |  |  |  | Must reference active inspection. | Inspection context for extraction. | 55555555-5555-4555-8555-555555555555 | Inspector | yes |
| evidence_file_id | uuid | yes | FK | evidence_files.evidence_file_id |  |  |  | Must reference uploaded evidence file. | Source evidence file. | e1111111-1111-4111-8111-111111111111 | Inspector | yes |
| ai_model_name | varchar(120) | yes |  |  |  |  |  | Must identify extraction model/provider. | AI model name. | gpt-extractor | IT Admin | yes |
| ai_model_version | varchar(80) | yes |  |  |  |  |  | Must be captured for reproducibility. | AI model version. | 2026-06-01 | IT Admin | yes |
| job_status | varchar(40) | yes |  |  |  | queued, running, completed, failed, cancelled | queued | Must follow job transitions. | Extraction job status. | completed | System | yes |
| submitted_by | uuid | yes | FK | users.user_id |  |  |  | Must reference user with extraction.submit permission. | User who submitted job. | 77777777-7777-4777-8777-777777777777 | Inspector | yes |
| started_at | timestamptz | no |  |  |  |  |  | Server-generated when running. | Job start timestamp. | 2026-06-11T09:05:00+07:00 | System | no |
| completed_at | timestamptz | no |  |  |  |  |  | Required when completed/failed. | Job completion timestamp. | 2026-06-11T09:10:00+07:00 | System | no |
| error_message | text | no |  |  |  |  |  | Required when job_status=failed. | Error details if failed. | Unsupported file format. | System | yes |

### `extraction_fields`

Field-level extraction output linked to evidence and review state.

| field_name | data_type | required yes/no | primary_key/foreign_key | reference_table | unit | allowed_values | default_value | validation_rule | description | example_value | data_owner_role | audit_required yes/no |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| extraction_field_id | uuid | yes | PK |  |  |  | gen_random_uuid() | Must be unique and immutable. | Primary extracted field identifier. | x2222222-2222-4222-8222-222222222222 | System | no |
| extraction_job_id | uuid | yes | FK | extraction_jobs.extraction_job_id |  |  |  | Must reference extraction job. | Parent extraction job. | x1111111-1111-4111-8111-111111111111 | System | yes |
| field_key | varchar(120) | yes |  |  |  |  |  | Must be mapped to extraction schema. | Extracted field key. | current_thickness_mm | System | yes |
| field_label | varchar(200) | no |  |  |  |  |  | Display label from schema. | Extracted field label. | Current Thickness | System | yes |
| extracted_value | text | no |  |  |  |  |  | Raw AI output; never promoted directly to final table. | Raw extracted value. | 7.20 | System | yes |
| normalized_value | text | no |  |  |  |  |  | Normalized by AIM staging logic; review required. | Normalized field value. | 7.200 | System | yes |
| unit | varchar(40) | no |  |  |  | mm, m, year, date, text, percent, none |  | Must be compatible with field_key. | Unit of extracted value. | mm | System | yes |
| confidence_score | numeric(5,4) | no |  | 0-1 |  |  | Must be between 0 and 1. | AI confidence score. | 0.9200 | System | yes | yes |
| source_page_no | integer | no |  | page |  |  | Must be >= 1 if provided. | Source page reference. | 12 | System | yes | yes |
| evidence_link_id | uuid | no | FK | evidence_links.evidence_link_id |  |  |  | Required for extracted engineering data when evidence is available. | Evidence link for extracted field. | e2222222-2222-4222-8222-222222222222 | Inspector | yes |
| review_status | varchar(40) | yes |  |  |  | pending, accepted_to_staging, rejected, needs_review | pending | AI cannot approve; human staging review required. | Extraction field review status. | needs_review | Engineer | yes |

### `staging_records`

Proposed normalized records awaiting human review before promotion.

| field_name | data_type | required yes/no | primary_key/foreign_key | reference_table | unit | allowed_values | default_value | validation_rule | description | example_value | data_owner_role | audit_required yes/no |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| staging_record_id | uuid | yes | PK |  |  |  | gen_random_uuid() | Must be unique and immutable. | Primary staging record identifier. | s1111111-1111-4111-8111-111111111111 | Engineer | no |
| extraction_job_id | uuid | yes | FK | extraction_jobs.extraction_job_id |  |  |  | Must reference extraction job. | Parent extraction job. | x1111111-1111-4111-8111-111111111111 | Engineer | yes |
| target_table_name | varchar(120) | yes |  |  |  | assets, asset_components, inspections, inspection_findings, ndt_measurements, cml_points, thickness_readings, calculation_inputs |  | Must be approved target for staging promotion. | Target final table if approved. | thickness_readings | Engineer | yes |
| target_field_name | varchar(120) | yes |  |  |  |  |  | Must exist in data dictionary target table. | Target final field if approved. | current_thickness_mm | Engineer | yes |
| proposed_value | text | no |  |  |  |  |  | Value proposed by AI/manual import; not final until approved. | Proposed value. | 7.200 | Engineer | yes |
| proposed_unit | varchar(40) | no |  |  |  | mm, m, year, date, text, percent, none |  | Must match target field unit. | Proposed unit. | mm | Engineer | yes |
| confidence_score | numeric(5,4) | no |  | 0-1 |  |  | Must be between 0 and 1. | AI confidence for proposed value. | 0.9200 | Engineer | yes | yes |
| review_status | varchar(40) | yes |  |  |  | pending, approved_for_promotion, rejected, corrected, promoted | pending | Only Engineer/Lead Engineer can approve promotion. | Staging review status. | approved_for_promotion | Engineer | yes |
| reviewed_by | uuid | no | FK | users.user_id |  |  |  | Required when status is approved/rejected/corrected. | Reviewer user. | 88888888-8888-4888-8888-888888888888 | Engineer | yes |
| reviewed_at | timestamptz | no |  |  |  |  |  | Required when reviewed_by is set. | Review timestamp. | 2026-06-11T10:00:00+07:00 | Engineer | no |
| promoted_record_id | uuid | no |  |  |  |  |  | Set only after AIM writes approved final record. | Final record ID after promotion. | t1111111-1111-4111-8111-111111111111 | System | yes |

### `manual_overrides`

Human corrections to staging values with reasons.

| field_name | data_type | required yes/no | primary_key/foreign_key | reference_table | unit | allowed_values | default_value | validation_rule | description | example_value | data_owner_role | audit_required yes/no |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| override_id | uuid | yes | PK |  |  |  | gen_random_uuid() | Must be unique and immutable. | Primary manual override identifier. | o1111111-1111-4111-8111-111111111111 | Engineer | no |
| staging_record_id | uuid | yes | FK | staging_records.staging_record_id |  |  |  | Must reference staging record. | Staging record being corrected. | s1111111-1111-4111-8111-111111111111 | Engineer | yes |
| original_value | text | no |  |  |  |  |  | Must capture value before correction. | Original proposed value. | 7.20 | Engineer | yes |
| corrected_value | text | yes |  |  |  |  |  | Cannot be blank when override is created. | Corrected value. | 7.200 | Engineer | yes |
| reason_code | varchar(80) | yes |  |  |  | ocr_error, unit_correction, wrong_field, missing_context, engineer_judgment, other |  | Must use allowed reason code. | Correction reason code. | unit_correction | Engineer | yes |
| override_reason | text | yes |  |  |  |  |  | Required audit explanation. | Human-readable correction reason. | Source table used mm; extracted unit was missing. | Engineer | yes |
| overridden_by | uuid | yes | FK | users.user_id |  |  |  | Must reference user with staging.review permission. | User applying override. | 88888888-8888-4888-8888-888888888888 | Engineer | yes |
| overridden_at | timestamptz | yes |  |  |  |  | now() | Server-generated. | Override timestamp. | 2026-06-11T10:05:00+07:00 | Engineer | no |

### `data_quality_checks`

Automated validation and quality checks for staging records.

| field_name | data_type | required yes/no | primary_key/foreign_key | reference_table | unit | allowed_values | default_value | validation_rule | description | example_value | data_owner_role | audit_required yes/no |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| quality_check_id | uuid | yes | PK |  |  |  | gen_random_uuid() | Must be unique and immutable. | Primary quality check identifier. | q1111111-1111-4111-8111-111111111111 | System | no |
| staging_record_id | uuid | yes | FK | staging_records.staging_record_id |  |  |  | Must reference staging record. | Staging record checked. | s1111111-1111-4111-8111-111111111111 | System | yes |
| check_type | varchar(80) | yes |  |  |  | required_field, unit_consistency, range_check, evidence_required, reference_exists, duplicate_check, workflow_gate |  | Must be approved check type. | Quality check type. | unit_consistency | System | yes |
| check_status | varchar(40) | yes |  |  |  | pass, fail, warning, skipped | pass | Must be one of allowed values. | Quality check result. | warning | System | yes |
| severity | varchar(30) | yes |  |  |  | info, low, medium, high, blocking | info | Blocking check prevents promotion/report issue. | Check severity. | blocking | System | yes |
| message | text | no |  |  |  |  |  | Required for fail/warning. | Quality check message. | Evidence link is missing. | System | yes |
| created_at | timestamptz | yes |  |  |  |  | now() | Server-generated. | Check creation timestamp. | 2026-06-11T10:06:00+07:00 | System | no |
| resolved_by | uuid | no | FK | users.user_id |  |  |  | Required if blocking issue is manually resolved. | Resolver user. | 88888888-8888-4888-8888-888888888888 | Engineer | yes |

## NDT

### `ndt_measurements`

NDT datasets such as UT thickness campaigns.

| field_name | data_type | required yes/no | primary_key/foreign_key | reference_table | unit | allowed_values | default_value | validation_rule | description | example_value | data_owner_role | audit_required yes/no |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| measurement_id | uuid | yes | PK |  |  |  | gen_random_uuid() | Must be unique and immutable. | Primary NDT measurement dataset identifier. | n1111111-1111-4111-8111-111111111111 | Inspector | no |
| inspection_id | uuid | yes | FK | inspections.inspection_id |  |  |  | Must reference inspection. | Parent inspection. | 55555555-5555-4555-8555-555555555555 | Inspector | yes |
| asset_id | uuid | yes | FK | assets.asset_id |  |  |  | Must match inspection.asset_id. | Measured asset. | 33333333-3333-4333-8333-333333333333 | Inspector | yes |
| component_id | uuid | no | FK | asset_components.component_id |  |  |  | Required for component-specific dataset. | Measured component. | 44444444-4444-4444-8444-444444444444 | Inspector | yes |
| method_type | varchar(80) | yes |  |  |  | UT_THICKNESS | UT_THICKNESS | MVP supports UT_THICKNESS only. | NDT method type. | UT_THICKNESS | Inspector | yes |
| measurement_date | date | yes |  |  |  |  |  | Cannot be after current date unless explicitly allowed. | Measurement date. | 2026-05-02 | Inspector | yes |
| technician_name | varchar(200) | no |  |  |  |  |  | Optional name from report. | Technician name. | A. Technician | Inspector | yes |
| device_id | varchar(120) | no |  |  |  |  |  | Optional instrument/device reference. | UT device identifier. | UTM-001 | Inspector | yes |
| dataset_status | varchar(40) | yes |  |  |  | draft, submitted, reviewed, approved, rejected | draft | Must follow NDT review workflow. | Dataset status. | reviewed | Engineer | yes |
| evidence_link_id | uuid | no | FK | evidence_links.evidence_link_id |  |  |  | Required before approval. | Evidence link to original NDT file/table. | e2222222-2222-4222-8222-222222222222 | Inspector | yes |
| created_at | timestamptz | yes |  |  |  |  | now() | Must be server-generated timestamp. | Record creation timestamp. | 2026-06-11T09:00:00+07:00 | Inspector | no |
| updated_at | timestamptz | no |  |  |  |  |  | Must be server-generated when record changes. | Last update timestamp. | 2026-06-11T10:30:00+07:00 | Inspector | no |
| created_by | uuid | no | FK | users.user_id |  |  |  | Required for human-created records; nullable for system migration. | User who created the record. | 2b7c6e2e-0000-4000-9000-000000000001 | Inspector | yes |
| updated_by | uuid | no | FK | users.user_id |  |  |  | Required when updated through the application. | User who last updated the record. | 2b7c6e2e-0000-4000-9000-000000000001 | Inspector | yes |

### `cml_points`

Condition monitoring locations/points on tank components.

| field_name | data_type | required yes/no | primary_key/foreign_key | reference_table | unit | allowed_values | default_value | validation_rule | description | example_value | data_owner_role | audit_required yes/no |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| cml_point_id | uuid | yes | PK |  |  |  | gen_random_uuid() | Must be unique and immutable. | Primary CML point identifier. | c1111111-1111-4111-8111-111111111111 | Engineer | no |
| asset_id | uuid | yes | FK | assets.asset_id |  |  |  | Must reference asset. | Parent asset. | 33333333-3333-4333-8333-333333333333 | Engineer | yes |
| component_id | uuid | yes | FK | asset_components.component_id |  |  |  | Must reference component on same asset. | Parent component. | 44444444-4444-4444-8444-444444444444 | Engineer | yes |
| cml_code | varchar(100) | yes |  |  |  |  |  | Must be unique per asset/component. | CML/TML point code. | CML-SH1-001 | Engineer | yes |
| course_no | integer | no |  | course |  |  | Required for shell course points; must be >= 1. | Shell course number. | 1 | Engineer | yes | yes |
| position_reference | varchar(200) | no |  |  |  |  |  | Optional location reference. | Location description. | North quadrant at 1.2 m elevation | Engineer | yes |
| orientation | varchar(40) | no |  |  |  | N, NE, E, SE, S, SW, W, NW, degree |  | Optional orientation label. | Orientation around tank. | N | Engineer | yes |
| elevation_mm | numeric(12,2) | no |  | mm |  |  | Must be numeric if provided. | Elevation reference. | 1200.00 | Engineer | yes | yes |
| is_active | boolean | yes |  |  |  | true, false | true | Inactive points retained for history. | Whether CML point is active. | true | Engineer | yes |
| created_at | timestamptz | yes |  |  |  |  | now() | Must be server-generated timestamp. | Record creation timestamp. | 2026-06-11T09:00:00+07:00 | Engineer | no |
| updated_at | timestamptz | no |  |  |  |  |  | Must be server-generated when record changes. | Last update timestamp. | 2026-06-11T10:30:00+07:00 | Engineer | no |
| created_by | uuid | no | FK | users.user_id |  |  |  | Required for human-created records; nullable for system migration. | User who created the record. | 2b7c6e2e-0000-4000-9000-000000000001 | Engineer | yes |
| updated_by | uuid | no | FK | users.user_id |  |  |  | Required when updated through the application. | User who last updated the record. | 2b7c6e2e-0000-4000-9000-000000000001 | Engineer | yes |

### `thickness_readings`

UT thickness readings linked to CML points and evidence.

| field_name | data_type | required yes/no | primary_key/foreign_key | reference_table | unit | allowed_values | default_value | validation_rule | description | example_value | data_owner_role | audit_required yes/no |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| reading_id | uuid | yes | PK |  |  |  | gen_random_uuid() | Must be unique and immutable. | Primary thickness reading identifier. | t1111111-1111-4111-8111-111111111111 | Inspector | no |
| measurement_id | uuid | yes | FK | ndt_measurements.measurement_id |  |  |  | Must reference NDT dataset. | Parent NDT measurement. | n1111111-1111-4111-8111-111111111111 | Inspector | yes |
| cml_point_id | uuid | yes | FK | cml_points.cml_point_id |  |  |  | Must reference active CML point unless historic import. | CML point measured. | c1111111-1111-4111-8111-111111111111 | Inspector | yes |
| previous_thickness_mm | numeric(10,3) | no |  | mm |  |  | Required for corrosion rate unless initial inspection; must be > 0 if provided. | Previous measured thickness. | 8.000 | Engineer | yes | yes |
| current_thickness_mm | numeric(10,3) | yes |  | mm |  |  | Must be > 0. | Current measured thickness. | 7.200 | Inspector | yes | yes |
| minimum_required_thickness_mm | numeric(10,3) | yes |  | mm |  |  | Must be > 0 and engineer-approved source required. | Minimum required thickness for MVP status logic. | 6.000 | Engineer | yes | yes |
| reading_unit | varchar(20) | yes |  |  | mm | mm | mm | MVP expected unit is mm; mismatches must warn/block as configured. | Thickness unit. | mm | Inspector | yes |
| years_between_inspections | numeric(8,3) | no |  | year |  |  | Required for corrosion rate if previous_thickness_mm exists; must be > 0. | Time interval between readings. | 4.000 | Engineer | yes | yes |
| reading_status | varchar(40) | yes |  |  |  | draft, staged, reviewed, approved, rejected | draft | Must follow review workflow; AI cannot approve. | Reading lifecycle status. | reviewed | Engineer | yes |
| evidence_link_id | uuid | yes | FK | evidence_links.evidence_link_id |  |  |  | Mandatory before approval/report issue. | Evidence link for reading. | e2222222-2222-4222-8222-222222222222 | Inspector | yes |
| created_at | timestamptz | yes |  |  |  |  | now() | Must be server-generated timestamp. | Record creation timestamp. | 2026-06-11T09:00:00+07:00 | Inspector | no |
| updated_at | timestamptz | no |  |  |  |  |  | Must be server-generated when record changes. | Last update timestamp. | 2026-06-11T10:30:00+07:00 | Inspector | no |
| created_by | uuid | no | FK | users.user_id |  |  |  | Required for human-created records; nullable for system migration. | User who created the record. | 2b7c6e2e-0000-4000-9000-000000000001 | Inspector | yes |
| updated_by | uuid | no | FK | users.user_id |  |  |  | Required when updated through the application. | User who last updated the record. | 2b7c6e2e-0000-4000-9000-000000000001 | Inspector | yes |

## Calculation

### `formula_versions`

Approved deterministic formula registry versions.

| field_name | data_type | required yes/no | primary_key/foreign_key | reference_table | unit | allowed_values | default_value | validation_rule | description | example_value | data_owner_role | audit_required yes/no |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| formula_version_id | uuid | yes | PK |  |  |  | gen_random_uuid() | Must be unique and immutable. | Primary formula version identifier. | f1111111-1111-4111-8111-111111111111 | Lead Engineer | no |
| formula_code | varchar(100) | yes |  |  |  | corrosion_rate, remaining_life, status_logic |  | Must be approved formula code; no proprietary formulas invented. | Formula code. | corrosion_rate | Lead Engineer | yes |
| formula_name | varchar(200) | yes |  |  |  |  |  | Cannot be blank. | Formula display name. | MVP Corrosion Rate | Lead Engineer | yes |
| version_no | varchar(40) | yes |  |  |  | semver e.g. 1.0.0 |  | Must be unique per formula_code. | Formula version number. | 1.0.0 | Lead Engineer | yes |
| formula_type | varchar(60) | yes |  |  |  | mvp_fixture, workbook_supplied, engineer_approved |  | Must identify source basis. | Formula source/type. | engineer_approved | Lead Engineer | yes |
| expression_ref | text | yes |  |  |  |  |  | Reference to approved workbook/fixture/registry item; do not store copyrighted clauses. | Formula reference, not copyrighted standard text. | 07_Calculation/validation_workbook.xlsx!Manual_Calculation | Lead Engineer | yes |
| approved_status | varchar(40) | yes |  |  |  | draft, under_review, approved, retired, rejected | draft | Only approved versions can be executed for official calculation. | Formula approval status. | approved | Approver | yes |
| approved_by | uuid | no | FK | users.user_id |  |  |  | Required when approved_status=approved. | Approver user. | 99999999-9999-4999-8999-999999999999 | Approver | yes |
| approved_at | timestamptz | no |  |  |  |  |  | Required when approved_status=approved. | Formula approval timestamp. | 2026-06-11T11:00:00+07:00 | Approver | no |
| effective_from | date | no |  |  |  |  |  | Cannot be before approval date unless migration exception approved. | Effective date. | 2026-06-11 | Approver | yes |
| retired_at | timestamptz | no |  |  |  |  |  | Set only when retired. | Retirement timestamp. | 2027-01-01T00:00:00+07:00 | Approver | yes |

### `calculation_runs`

Executed calculation run header and review state.

| field_name | data_type | required yes/no | primary_key/foreign_key | reference_table | unit | allowed_values | default_value | validation_rule | description | example_value | data_owner_role | audit_required yes/no |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| calculation_run_id | uuid | yes | PK |  |  |  | gen_random_uuid() | Must be unique and immutable. | Primary calculation run identifier. | r1111111-1111-4111-8111-111111111111 | Engineer | no |
| asset_id | uuid | yes | FK | assets.asset_id |  |  |  | Must reference asset. | Calculated asset. | 33333333-3333-4333-8333-333333333333 | Engineer | yes |
| inspection_id | uuid | yes | FK | inspections.inspection_id |  |  |  | Must reference inspection. | Inspection context. | 55555555-5555-4555-8555-555555555555 | Engineer | yes |
| formula_version_id | uuid | yes | FK | formula_versions.formula_version_id |  |  |  | Must reference approved formula version. | Formula version executed. | f1111111-1111-4111-8111-111111111111 | Engineer | yes |
| run_status | varchar(40) | yes |  |  |  | draft, input_validated, executed, warning, failed, reviewed, approved, rejected | draft | Must follow calculation workflow gates. | Calculation run status. | executed | Engineer | yes |
| run_by | uuid | yes | FK | users.user_id |  |  |  | Must have calculation.run permission. | User who executed calculation. | 88888888-8888-4888-8888-888888888888 | Engineer | yes |
| run_at | timestamptz | yes |  |  |  |  | now() | Server-generated. | Execution timestamp. | 2026-06-11T11:10:00+07:00 | Engineer | no |
| reviewed_by | uuid | no | FK | users.user_id |  |  |  | Required before approval/report use. | Engineer reviewer. | 88888888-8888-4888-8888-888888888888 | Engineer | yes |
| reviewed_at | timestamptz | no |  |  |  |  |  | Required when reviewed_by is set. | Review timestamp. | 2026-06-11T11:30:00+07:00 | Engineer | no |
| disclaimer_text | text | yes |  |  |  |  | Engineering review required before final use. | Must match approved disclaimer. | Calculation output disclaimer. | Engineering review required before final use. | Lead Engineer | yes |

### `calculation_inputs`

Immutable calculation inputs with source and evidence linkage.

| field_name | data_type | required yes/no | primary_key/foreign_key | reference_table | unit | allowed_values | default_value | validation_rule | description | example_value | data_owner_role | audit_required yes/no |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| calculation_input_id | uuid | yes | PK |  |  |  | gen_random_uuid() | Must be unique and immutable. | Primary calculation input identifier. | ci111111-1111-4111-8111-111111111111 | Engineer | no |
| calculation_run_id | uuid | yes | FK | calculation_runs.calculation_run_id |  |  |  | Must reference calculation run. | Parent run. | r1111111-1111-4111-8111-111111111111 | Engineer | yes |
| input_key | varchar(120) | yes |  |  |  | previous_thickness_mm, current_thickness_mm, minimum_required_thickness_mm, years_between_inspections, remaining_life_threshold_y |  | Must be in formula input schema. | Input key. | current_thickness_mm | Engineer | yes |
| input_value_numeric | numeric(18,6) | no |  | varies |  |  | Numeric inputs must satisfy formula validation rules. | Numeric input value. | 7.200000 | Engineer | yes | yes |
| input_value_text | text | no |  |  |  |  |  | Used for non-numeric inputs; not for numeric formula fields. | Text input value. | N/A | Engineer | yes |
| unit | varchar(40) | no |  |  | mm, year, none |  | Must match formula schema. | Input unit. | mm | Engineer | yes | yes |
| source_entity_type | varchar(80) | yes |  |  |  | thickness_reading, manual_fixture, engineer_input |  | Must identify source of input. | Source entity type. | thickness_reading | Engineer | yes |
| source_entity_id | uuid | no |  |  |  |  |  | Required unless source_entity_type=manual_fixture. | Source entity identifier. | t1111111-1111-4111-8111-111111111111 | Engineer | yes |
| evidence_link_id | uuid | no | FK | evidence_links.evidence_link_id |  |  |  | Required for engineering inputs when evidence exists. | Evidence link for input. | e2222222-2222-4222-8222-222222222222 | Engineer | yes |

### `calculation_outputs`

Calculation results, statuses, warnings, and evidence linkage.

| field_name | data_type | required yes/no | primary_key/foreign_key | reference_table | unit | allowed_values | default_value | validation_rule | description | example_value | data_owner_role | audit_required yes/no |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| calculation_output_id | uuid | yes | PK |  |  |  | gen_random_uuid() | Must be unique and immutable. | Primary calculation output identifier. | co111111-1111-4111-8111-111111111111 | Engineer | no |
| calculation_run_id | uuid | yes | FK | calculation_runs.calculation_run_id |  |  |  | Must reference calculation run. | Parent run. | r1111111-1111-4111-8111-111111111111 | Engineer | yes |
| output_key | varchar(120) | yes |  |  |  | corrosion_rate_mm_y, remaining_life_y, status, warning |  | Must be in formula output schema. | Output key. | remaining_life_y | Engineer | yes |
| output_value_numeric | numeric(18,6) | no |  | varies |  |  | Numeric result; null for text-only outputs. | Numeric output value. | 6.000000 | Engineer | yes | yes |
| output_value_text | text | no |  |  |  |  |  | Text result/status/warning output. | Text output value. | REVIEW_REQUIRED | Engineer | yes |
| unit | varchar(40) | no |  |  | mm/y, year, status, none |  | Must match formula schema. | Output unit. | year | Engineer | yes | yes |
| warning_code | varchar(120) | no |  |  |  | below_minimum, missing_evidence, unit_mismatch, negative_corrosion, missing_input, remaining_life_below_threshold |  | Warning/blocking code when applicable. | Warning code. | remaining_life_below_threshold | Engineer | yes |
| status_result | varchar(60) | yes |  |  |  | acceptable, monitor, review_required, not_acceptable, invalid_input | review_required | Must use approved MVP status logic. | Calculation status output. | review_required | Engineer | yes |
| evidence_link_id | uuid | no | FK | evidence_links.evidence_link_id |  |  |  | Required when output is tied to specific evidence-backed input. | Evidence link for output. | e2222222-2222-4222-8222-222222222222 | Engineer | yes |

### `calculation_validation_cases`

Validation fixtures for deterministic calculation testing.

| field_name | data_type | required yes/no | primary_key/foreign_key | reference_table | unit | allowed_values | default_value | validation_rule | description | example_value | data_owner_role | audit_required yes/no |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| validation_case_id | uuid | yes | PK |  |  |  | gen_random_uuid() | Must be unique and immutable. | Primary validation case identifier. | v1111111-1111-4111-8111-111111111111 | Lead Engineer | no |
| formula_version_id | uuid | yes | FK | formula_versions.formula_version_id |  |  |  | Must reference formula version being tested. | Formula version under validation. | f1111111-1111-4111-8111-111111111111 | Lead Engineer | yes |
| test_case_id | varchar(80) | yes |  |  |  |  |  | Must be unique per formula version. | Validation workbook test case ID. | TC-001 | Lead Engineer | yes |
| input_payload | jsonb | yes |  |  |  |  |  | Must include only approved formula inputs. | Input payload fixture. | {"current_thickness_mm": 7.2} | Lead Engineer | yes |
| expected_output_payload | jsonb | yes |  |  |  |  |  | Expected result from approved manual calculation fixture. | Expected output fixture. | {"remaining_life_y": 6.0} | Lead Engineer | yes |
| tolerance | numeric(12,6) | yes |  | varies |  | 0.000001 | Must be non-negative. | Allowed numerical tolerance. | 0.000001 | Lead Engineer | yes | yes |
| pass_fail | varchar(20) | no |  |  |  | pass, fail, not_run |  | Set after validation run. | Validation status. | pass | Lead Engineer | yes |
| reviewed_by | uuid | no | FK | users.user_id |  |  |  | Required before formula approval. | Reviewer user. | 88888888-8888-4888-8888-888888888888 | Lead Engineer | yes |

## Integrity and reporting

### `integrity_decisions`

Human engineering integrity decisions based on reviewed data and calculations.

| field_name | data_type | required yes/no | primary_key/foreign_key | reference_table | unit | allowed_values | default_value | validation_rule | description | example_value | data_owner_role | audit_required yes/no |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| decision_id | uuid | yes | PK |  |  |  | gen_random_uuid() | Must be unique and immutable. | Primary integrity decision identifier. | d1111111-1111-4111-8111-111111111111 | Lead Engineer | no |
| asset_id | uuid | yes | FK | assets.asset_id |  |  |  | Must reference asset. | Asset for decision. | 33333333-3333-4333-8333-333333333333 | Lead Engineer | yes |
| inspection_id | uuid | yes | FK | inspections.inspection_id |  |  |  | Must reference inspection. | Inspection basis. | 55555555-5555-4555-8555-555555555555 | Lead Engineer | yes |
| calculation_run_id | uuid | no | FK | calculation_runs.calculation_run_id |  |  |  | Required when decision relies on calculations. | Calculation run basis. | r1111111-1111-4111-8111-111111111111 | Lead Engineer | yes |
| decision_status | varchar(60) | yes |  |  |  | fit_for_service, monitor, repair_required, restrict_service, out_of_scope, pending_review | pending_review | Human engineering decision only; AI cannot decide. | Integrity decision status. | monitor | Lead Engineer | yes |
| decision_summary | text | yes |  |  |  |  |  | Must be human-authored/reviewed; no AI-only approval. | Decision summary. | Continue service with monitoring and follow-up inspection. | Lead Engineer | yes |
| required_action | text | no |  |  |  |  |  | Required for repair/restrict/monitor statuses. | Required action. | Create internal work order for follow-up UT. | Lead Engineer | yes |
| decision_by | uuid | yes | FK | users.user_id |  |  |  | Must have integrity.decide permission. | Decision maker. | 88888888-8888-4888-8888-888888888888 | Lead Engineer | yes |
| decision_at | timestamptz | yes |  |  |  |  | now() | Server-generated. | Decision timestamp. | 2026-06-11T12:00:00+07:00 | Lead Engineer | no |
| evidence_link_id | uuid | yes | FK | evidence_links.evidence_link_id |  |  |  | Mandatory evidence link for decision basis. | Primary evidence link. | e2222222-2222-4222-8222-222222222222 | Lead Engineer | yes |
| approval_status | varchar(40) | yes |  |  |  | draft, submitted, approved, rejected | draft | Approver required before report issue if configured. | Approval status. | approved | Approver | yes |

### `reports`

Report lifecycle header and issue gate status.

| field_name | data_type | required yes/no | primary_key/foreign_key | reference_table | unit | allowed_values | default_value | validation_rule | description | example_value | data_owner_role | audit_required yes/no |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| report_id | uuid | yes | PK |  |  |  | gen_random_uuid() | Must be unique and immutable. | Primary report identifier. | rp111111-1111-4111-8111-111111111111 | Engineer | no |
| asset_id | uuid | yes | FK | assets.asset_id |  |  |  | Must reference asset. | Report asset. | 33333333-3333-4333-8333-333333333333 | Engineer | yes |
| inspection_id | uuid | yes | FK | inspections.inspection_id |  |  |  | Must reference inspection. | Report inspection. | 55555555-5555-4555-8555-555555555555 | Engineer | yes |
| report_template_id | uuid | yes | FK | report_templates.report_template_id |  |  |  | Must reference approved template. | Template used. | rt111111-1111-4111-8111-111111111111 | Engineer | yes |
| current_version_id | uuid | no | FK | report_versions.report_version_id |  |  |  | Set after first version is rendered. | Current report version. | rv111111-1111-4111-8111-111111111111 | Engineer | yes |
| report_status | varchar(40) | yes |  |  |  | draft, generated, review_required, approved, issued, blocked, void | draft | Issue blocked unless required gates are satisfied. | Report lifecycle status. | issued | Approver | yes |
| prepared_by | uuid | yes | FK | users.user_id |  |  |  | Must have report.create permission. | Report preparer. | 88888888-8888-4888-8888-888888888888 | Engineer | yes |
| approved_by | uuid | no | FK | users.user_id |  |  |  | Required before issue. | Report approver. | 99999999-9999-4999-8999-999999999999 | Approver | yes |
| issued_at | timestamptz | no |  |  |  |  |  | Set only when report_status=issued. | Issue timestamp. | 2026-06-12T09:00:00+07:00 | Approver | no |
| issue_block_reason | text | no |  |  |  |  |  | Required when report_status=blocked. | Reason report cannot be issued. | Missing approved calculation run. | Approver | yes |

### `report_templates`

Approved report template catalog.

| field_name | data_type | required yes/no | primary_key/foreign_key | reference_table | unit | allowed_values | default_value | validation_rule | description | example_value | data_owner_role | audit_required yes/no |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| report_template_id | uuid | yes | PK |  |  |  | gen_random_uuid() | Must be unique and immutable. | Primary report template identifier. | rt111111-1111-4111-8111-111111111111 | Admin | no |
| template_code | varchar(100) | yes |  |  |  |  |  | Must be unique. | Template code. | API653_MVP_TANK_REPORT | Admin | yes |
| template_name | varchar(200) | yes |  |  |  |  |  | Cannot be blank. | Template name. | Atmospheric Storage Tank Inspection Report | Admin | yes |
| template_version | varchar(40) | yes |  |  |  | semver or controlled version |  | Must be unique per template_code. | Template version. | 1.0.0 | Admin | yes |
| template_status | varchar(40) | yes |  |  |  | draft, approved, retired | draft | Only approved templates can be used for issued reports. | Template status. | approved | Approver | yes |
| file_uri | text | yes |  |  |  |  |  | Must reference template object storage URI or repository path. | Template file URI. | s3://aim-templates/api653-mvp-v1.docx | IT Admin | yes |
| created_by | uuid | yes | FK | users.user_id |  |  |  | Must have template.manage permission. | Template creator. | aaaaaaaa-0000-4000-9000-000000000001 | Admin | yes |

### `report_versions`

Rendered report versions and approval snapshots.

| field_name | data_type | required yes/no | primary_key/foreign_key | reference_table | unit | allowed_values | default_value | validation_rule | description | example_value | data_owner_role | audit_required yes/no |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| report_version_id | uuid | yes | PK |  |  |  | gen_random_uuid() | Must be unique and immutable. | Primary report version identifier. | rv111111-1111-4111-8111-111111111111 | Engineer | no |
| report_id | uuid | yes | FK | reports.report_id |  |  |  | Must reference report. | Parent report. | rp111111-1111-4111-8111-111111111111 | Engineer | yes |
| version_no | integer | yes |  |  |  |  | 1 | Must increment per report. | Report version number. | 1 | Engineer | yes |
| rendered_file_uri | text | yes |  |  |  |  |  | Must reference generated report in object storage. | Rendered report file URI. | s3://aim-reports/T-02/report-v1.pdf | Engineer | yes |
| change_summary | text | no |  |  |  |  |  | Required for version_no > 1. | Summary of changes. | Added reviewed UT table. | Engineer | yes |
| created_by | uuid | yes | FK | users.user_id |  |  |  | Must have report.generate permission. | Version creator. | 88888888-8888-4888-8888-888888888888 | Engineer | yes |
| created_at | timestamptz | yes |  |  |  |  | now() | Server-generated. | Version creation timestamp. | 2026-06-12T08:30:00+07:00 | Engineer | no |
| approval_status | varchar(40) | yes |  |  |  | draft, submitted, approved, rejected | draft | Must be approved before issue. | Version approval status. | approved | Approver | yes |
| audit_snapshot_json | jsonb | yes |  |  |  |  |  | Must capture gate state at render/issue time. | Audit snapshot for traceability. | {"gates":{"evidence":true,"calculation":true}} | Approver | yes |

## Workflow and operation

### `workflow_events`

Event bus records published by AIM for n8n orchestration.

| field_name | data_type | required yes/no | primary_key/foreign_key | reference_table | unit | allowed_values | default_value | validation_rule | description | example_value | data_owner_role | audit_required yes/no |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| workflow_event_id | uuid | yes | PK |  |  |  | gen_random_uuid() | Must be unique and immutable. | Primary workflow event identifier. | we111111-1111-4111-8111-111111111111 | System | no |
| source_system | varchar(40) | yes |  |  |  | AIM, n8n | AIM | n8n can orchestrate but AIM remains system of record. | Source system producing event. | AIM | System | yes |
| event_type | varchar(120) | yes |  |  |  | approval_requested, review_completed, reminder_due, report_issued, work_order_created, integration_failed, audit_event |  | Must be registered event type. | Workflow event type. | approval_requested | System | yes |
| entity_type | varchar(80) | yes |  |  |  | inspection, staging_record, calculation_run, integrity_decision, report, internal_work_order, evidence_file |  | Must be supported entity type. | Entity type related to event. | calculation_run | System | yes |
| entity_id | uuid | yes |  |  |  |  |  | Must identify AIM entity. | Related entity ID. | r1111111-1111-4111-8111-111111111111 | System | yes |
| payload_json | jsonb | no |  |  |  |  |  | Must not contain final engineering data that is only stored by n8n. | Workflow payload for orchestration. | {"action":"request_review"} | System | yes |
| occurred_at | timestamptz | yes |  |  |  |  | now() | Server-generated. | Event timestamp. | 2026-06-11T12:15:00+07:00 | System | no |
| processed_status | varchar(40) | yes |  |  |  | pending, sent_to_n8n, processed, failed, ignored | pending | Must follow event processing state. | Processing status. | sent_to_n8n | System | yes |
| n8n_execution_id | varchar(120) | no |  |  |  |  |  | Optional external execution reference only. | n8n execution reference. | 54231 | IT Admin | yes |

### `workflow_tasks`

Human review, approval, reminder, and operational tasks.

| field_name | data_type | required yes/no | primary_key/foreign_key | reference_table | unit | allowed_values | default_value | validation_rule | description | example_value | data_owner_role | audit_required yes/no |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| workflow_task_id | uuid | yes | PK |  |  |  | gen_random_uuid() | Must be unique and immutable. | Primary workflow task identifier. | wt111111-1111-4111-8111-111111111111 | System | no |
| task_type | varchar(80) | yes |  |  |  | review, approval, correction, reminder, work_order_followup, report_issue_gate |  | Must be registered task type. | Task category. | approval | System | yes |
| entity_type | varchar(80) | yes |  |  |  | staging_record, calculation_run, integrity_decision, report, internal_work_order |  | Must be supported entity type. | Task target entity type. | report | System | yes |
| entity_id | uuid | yes |  |  |  |  |  | Must identify AIM entity. | Task target entity ID. | rp111111-1111-4111-8111-111111111111 | System | yes |
| assigned_to | uuid | yes | FK | users.user_id |  |  |  | Must be active user with required permission. | Assigned user. | 99999999-9999-4999-8999-999999999999 | Lead Engineer | yes |
| due_at | timestamptz | no |  |  |  |  |  | Optional due date for reminders/escalation. | Task due timestamp. | 2026-06-13T17:00:00+07:00 | Lead Engineer | yes |
| task_status | varchar(40) | yes |  |  |  | open, in_progress, completed, cancelled, overdue | open | Must follow task transitions. | Task status. | open | Lead Engineer | yes |
| created_by | uuid | no | FK | users.user_id |  |  |  | Nullable for system-created task. | Task creator. | 88888888-8888-4888-8888-888888888888 | System | yes |
| completed_at | timestamptz | no |  |  |  |  |  | Required when task_status=completed. | Completion timestamp. | 2026-06-12T10:00:00+07:00 | System | no |

### `notification_logs`

Notification send logs and delivery status.

| field_name | data_type | required yes/no | primary_key/foreign_key | reference_table | unit | allowed_values | default_value | validation_rule | description | example_value | data_owner_role | audit_required yes/no |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| notification_id | uuid | yes | PK |  |  |  | gen_random_uuid() | Must be unique and immutable. | Primary notification log identifier. | nl111111-1111-4111-8111-111111111111 | System | no |
| recipient_user_id | uuid | yes | FK | users.user_id |  |  |  | Must reference active user. | Recipient user. | 99999999-9999-4999-8999-999999999999 | System | yes |
| channel | varchar(40) | yes |  |  |  | email, in_app, slack, teams, webhook |  | Must be supported channel. | Notification channel. | email | IT Admin | yes |
| notification_type | varchar(80) | yes |  |  |  | review_request, approval_request, reminder, rejection, report_issued, work_order_update, error_alert |  | Must be registered notification type. | Notification type. | approval_request | System | yes |
| entity_type | varchar(80) | no |  |  |  |  |  | Optional related entity type. | Related entity type. | report | System | yes |
| entity_id | uuid | no |  |  |  |  |  | Optional related entity ID. | Related entity ID. | rp111111-1111-4111-8111-111111111111 | System | yes |
| sent_at | timestamptz | no |  |  |  |  |  | Set when sent. | Send timestamp. | 2026-06-11T12:20:00+07:00 | System | no |
| delivery_status | varchar(40) | yes |  |  |  | queued, sent, delivered, failed, bounced | queued | Must follow provider status mapping. | Delivery status. | sent | IT Admin | yes |
| provider_message_id | varchar(200) | no |  |  |  |  |  | External provider reference only. | Provider message ID. | msg_abc123 | IT Admin | yes |

### `error_logs`

Application/workflow error records.

| field_name | data_type | required yes/no | primary_key/foreign_key | reference_table | unit | allowed_values | default_value | validation_rule | description | example_value | data_owner_role | audit_required yes/no |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| error_id | uuid | yes | PK |  |  |  | gen_random_uuid() | Must be unique and immutable. | Primary error log identifier. | er111111-1111-4111-8111-111111111111 | System | no |
| source_system | varchar(40) | yes |  |  |  | AIM, n8n, object_storage, ai_provider, report_renderer, calculation_engine | AIM | Must identify error source. | Error source system. | calculation_engine | IT Admin | yes |
| severity | varchar(30) | yes |  |  |  | info, warning, error, critical | error | Critical errors should trigger notification/workflow task. | Error severity. | critical | IT Admin | yes |
| error_code | varchar(120) | yes |  |  |  |  |  | Must be stable for automation rules. | Machine-readable error code. | CALC_INPUT_INVALID | IT Admin | yes |
| error_message | text | yes |  |  |  |  |  | Do not include secrets/credentials. | Error message. | Missing minimum required thickness. | IT Admin | yes |
| entity_type | varchar(80) | no |  |  |  |  |  | Optional AIM entity type. | Related entity type. | calculation_run | IT Admin | yes |
| entity_id | uuid | no |  |  |  |  |  | Optional AIM entity ID. | Related entity ID. | r1111111-1111-4111-8111-111111111111 | IT Admin | yes |
| occurred_at | timestamptz | yes |  |  |  |  | now() | Server-generated. | Error occurrence timestamp. | 2026-06-11T12:25:00+07:00 | System | no |
| resolved_at | timestamptz | no |  |  |  |  |  | Set when resolved. | Resolution timestamp. | 2026-06-11T13:00:00+07:00 | IT Admin | yes |

### `audit_logs`

Immutable audit trail for critical actions.

| field_name | data_type | required yes/no | primary_key/foreign_key | reference_table | unit | allowed_values | default_value | validation_rule | description | example_value | data_owner_role | audit_required yes/no |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| audit_log_id | uuid | yes | PK |  |  |  | gen_random_uuid() | Must be immutable after insert. | Primary audit log identifier. | au111111-1111-4111-8111-111111111111 | System | no |
| actor_user_id | uuid | no | FK | users.user_id |  |  |  | Required for human action; nullable for system actor. | User or system actor. | 88888888-8888-4888-8888-888888888888 | System | no |
| action_type | varchar(120) | yes |  |  |  | create, update, delete, submit, review, approve, reject, correct, calculate, issue_report, create_work_order, notify, integration_event |  | Must be registered audit action. | Audited action. | approve | System | no |
| entity_type | varchar(80) | yes |  |  |  | all critical AIM entity types |  | Must identify target entity type. | Audited entity type. | calculation_run | System | no |
| entity_id | uuid | yes |  |  |  |  |  | Must identify target entity. | Audited entity ID. | r1111111-1111-4111-8111-111111111111 | System | no |
| before_json | jsonb | no |  |  |  |  |  | Required for update/reject/correct when available. | Before state snapshot. | {"status":"submitted"} | System | no |
| after_json | jsonb | no |  |  |  |  |  | Required for create/update/approve when available. | After state snapshot. | {"status":"approved"} | System | no |
| reason | text | no |  |  |  |  |  | Required for rejection/correction/override/void. | Human/system reason. | Reviewed calculation and approved for report use. | System | no |
| occurred_at | timestamptz | yes |  |  |  |  | now() | Server-generated immutable timestamp. | Audit event timestamp. | 2026-06-11T12:30:00+07:00 | System | no |
| request_id | varchar(120) | no |  |  |  |  |  | Trace ID from API gateway/application. | Request correlation ID. | req_123456 | IT Admin | no |
| ip_address | inet | no |  |  |  |  |  | Capture when available and policy allows. | Actor IP address. | 10.0.0.1 | IT Admin | no |

### `import_batches`

Bulk import batches for files and structured data.

| field_name | data_type | required yes/no | primary_key/foreign_key | reference_table | unit | allowed_values | default_value | validation_rule | description | example_value | data_owner_role | audit_required yes/no |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| import_batch_id | uuid | yes | PK |  |  |  | gen_random_uuid() | Must be unique and immutable. | Primary import batch identifier. | ib111111-1111-4111-8111-111111111111 | Inspector | no |
| source_type | varchar(80) | yes |  |  |  | excel, csv, pdf_extraction, ndt_export, manual_upload |  | Must be supported source type. | Import source type. | excel | Inspector | yes |
| source_file_id | uuid | no | FK | evidence_files.evidence_file_id |  |  |  | Required when import originates from evidence file. | Source evidence file. | e1111111-1111-4111-8111-111111111111 | Inspector | yes |
| imported_by | uuid | yes | FK | users.user_id |  |  |  | Must have import permission. | Importing user. | 77777777-7777-4777-8777-777777777777 | Inspector | yes |
| import_status | varchar(40) | yes |  |  |  | queued, processing, completed, completed_with_errors, failed, cancelled | queued | Must follow import lifecycle. | Import status. | completed_with_errors | Inspector | yes |
| total_rows | integer | no |  | rows |  |  | Must be >= 0. | Total rows parsed. | 100 | System | yes | yes |
| accepted_rows | integer | no |  | rows |  |  | Must be >= 0 and <= total_rows. | Rows accepted into staging. | 92 | System | yes | yes |
| rejected_rows | integer | no |  | rows |  |  | Must be >= 0 and <= total_rows. | Rows rejected. | 8 | System | yes | yes |
| started_at | timestamptz | no |  |  |  |  |  | Set when processing starts. | Import start timestamp. | 2026-06-11T09:00:00+07:00 | System | no |
| completed_at | timestamptz | no |  |  |  |  |  | Set when completed/failed. | Import completion timestamp. | 2026-06-11T09:02:00+07:00 | System | no |

### `system_settings`

Configurable system settings under IT/Admin control.

| field_name | data_type | required yes/no | primary_key/foreign_key | reference_table | unit | allowed_values | default_value | validation_rule | description | example_value | data_owner_role | audit_required yes/no |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| setting_id | uuid | yes | PK |  |  |  | gen_random_uuid() | Must be unique and immutable. | Primary setting identifier. | ss111111-1111-4111-8111-111111111111 | IT Admin | no |
| setting_key | varchar(160) | yes |  |  |  |  |  | Must be unique per setting_scope. | Setting key. | report.issue.require_approved_calculation | IT Admin | yes |
| setting_value | text | yes |  |  |  |  |  | Must match data_type and validation policy. | Setting value. | true | IT Admin | yes |
| setting_scope | varchar(80) | yes |  |  |  | global, site, module, user | global | Must be one of allowed values. | Setting scope. | global | IT Admin | yes |
| data_type | varchar(40) | yes |  |  |  | string, integer, decimal, boolean, json | string | Must match setting_value parser. | Setting data type. | boolean | IT Admin | yes |
| is_sensitive | boolean | yes |  |  |  | true, false | false | Sensitive values must be encrypted/masked. | Whether setting contains sensitive value. | false | IT Admin | yes |
| updated_by | uuid | yes | FK | users.user_id |  |  |  | Must have system_settings.manage permission. | User who updated setting. | aaaaaaaa-0000-4000-9000-000000000001 | IT Admin | yes |
| updated_at | timestamptz | yes |  |  |  |  | now() | Server-generated. | Setting update timestamp. | 2026-06-11T12:40:00+07:00 | IT Admin | no |

### `internal_work_orders`

MVP fallback work order records before external CMMS integration.

| field_name | data_type | required yes/no | primary_key/foreign_key | reference_table | unit | allowed_values | default_value | validation_rule | description | example_value | data_owner_role | audit_required yes/no |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| work_order_id | uuid | yes | PK |  |  |  | gen_random_uuid() | Must be unique and immutable. | Primary internal work order identifier. | wo111111-1111-4111-8111-111111111111 | Engineer | no |
| asset_id | uuid | yes | FK | assets.asset_id |  |  |  | Must reference active asset. | Work order asset. | 33333333-3333-4333-8333-333333333333 | Engineer | yes |
| inspection_id | uuid | no | FK | inspections.inspection_id |  |  |  | Required when generated from inspection finding/decision. | Related inspection. | 55555555-5555-4555-8555-555555555555 | Engineer | yes |
| decision_id | uuid | no | FK | integrity_decisions.decision_id |  |  |  | Required when generated from integrity decision. | Related integrity decision. | d1111111-1111-4111-8111-111111111111 | Lead Engineer | yes |
| finding_id | uuid | no | FK | inspection_findings.finding_id |  |  |  | Optional source finding. | Source finding. | 66666666-6666-4666-8666-666666666666 | Engineer | yes |
| work_order_code | varchar(100) | yes |  |  |  |  |  | Must be unique. | Internal work order code. | WO-T02-2026-001 | Engineer | yes |
| work_order_type | varchar(80) | yes |  |  |  | repair, reinspection, followup_ut, monitoring, engineering_review, other |  | Must be allowed type. | Work order type. | followup_ut | Engineer | yes |
| priority | varchar(30) | yes |  |  |  | low, medium, high, urgent | medium | Must be one of allowed values. | Work order priority. | high | Engineer | yes |
| description | text | yes |  |  |  |  |  | Cannot be blank. | Work order description. | Perform follow-up UT on shell course 1 CML points. | Engineer | yes |
| assigned_to | uuid | no | FK | users.user_id |  |  |  | Must reference active user when assigned. | Assigned user. | 77777777-7777-4777-8777-777777777777 | Lead Engineer | yes |
| due_date | date | no |  |  |  |  |  | Optional due date; required for high/urgent if policy enabled. | Work order due date. | 2026-07-01 | Lead Engineer | yes |
| work_order_status | varchar(40) | yes |  |  |  | open, assigned, in_progress, completed, cancelled, closed | open | Must follow work order workflow. | Work order status. | open | Engineer | yes |
| external_cmms_reference | varchar(200) | no |  |  |  |  |  | Future optional SAP/Maximo reference; not required in MVP. | External CMMS reference if synchronized later. | SAP-WO-12345 | IT Admin | yes |
| created_at | timestamptz | yes |  |  |  |  | now() | Must be server-generated timestamp. | Record creation timestamp. | 2026-06-11T09:00:00+07:00 | Engineer | no |
| updated_at | timestamptz | no |  |  |  |  |  | Must be server-generated when record changes. | Last update timestamp. | 2026-06-11T10:30:00+07:00 | Engineer | no |
| created_by | uuid | no | FK | users.user_id |  |  |  | Required for human-created records; nullable for system migration. | User who created the record. | 2b7c6e2e-0000-4000-9000-000000000001 | Engineer | yes |
| updated_by | uuid | no | FK | users.user_id |  |  |  | Required when updated through the application. | User who last updated the record. | 2b7c6e2e-0000-4000-9000-000000000001 | Engineer | yes |

## Delivery Notes
### What Changed
- Created a logical MVP data dictionary covering identity/access, asset/inspection, evidence, AI extraction/staging, NDT, calculation, integrity/reporting, workflow/operation, and internal work order fallback.
- Included field-level metadata for data type, requirement, key/reference, unit, allowed values, defaults, validation, examples, owner role, and audit requirement.

### AIM / n8n Boundary Confirmation
- AIM/PostgreSQL remains the system of record.
- n8n is represented only through workflow event/execution references and notification/integration orchestration; it does not own final engineering data.

### Run / Test Commands
```bash
npm run db:migrate
npm run db:seed:roles
npm run test:db
npm run test:api
npm run test:rbac
npm run test:audit
```

### Documentation Updates
- Keep this Markdown file, the Excel dictionary, and `docs/erd.md` aligned with migrations and OpenAPI schemas.
