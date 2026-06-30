# AIM MVP Frontend Page Specifications

**Document path:** `08_Frontend/page_specs.md`  
**Product:** Asset Integrity Management (AIM) + n8n MVP  
**Frontend scope:** React/Next.js-style web application specifications for developer handoff  
**Status:** Implementation-ready baseline  
**Last updated:** 2026-06-11

---

## 0. Pre-Implementation Governance Check

### Assumptions
- AIM is the system of record for structured engineering data, evidence metadata, reviews, approvals, audit logs, workflow events, and internal work orders.
- PostgreSQL stores final structured engineering data.
- Object storage stores original evidence files.
- n8n is workflow orchestration only and must be invoked through AIM backend APIs; the frontend must not call n8n directly.
- AI extraction output is shown as staging/review data only until reviewed and promoted by authorized users.
- The frontend must never present AI output, calculations, reports, or integrity decisions as final without visible review/approval status.
- API endpoints are based on `04_API/openapi.yaml`; data fields are based on `03_Database/data_dictionary.xlsx` and `03_Database/data_dictionary.md`.

### Impacted Documents
- `01_PRD/AIM_MVP_PRD.md`
- `03_Database/data_dictionary.md`
- `04_API/openapi.yaml`
- `05_n8n/n8n_workflow_catalog.md`
- `06_Evidence/evidence_governance.md`
- `06_AI_Extraction/AI_Extraction_Control_Pack/*`
- `07_Calculation/engineering_basis.md`
- `08_Frontend/component_inventory.md`
- `08_Frontend/design_system.md`

### Impacted Tables
- `users`, `roles`, `permissions`, `user_roles`, `role_permissions`
- `assets`, `asset_components`, `inspections`, `inspection_findings`
- `evidence_files`, `evidence_links`
- `extraction_jobs`, `extraction_fields`, `staging_records`, `manual_overrides`, `data_quality_checks`
- `ndt_measurements`, `cml_points`, `thickness_readings`
- `formula_versions`, `calculation_runs`, `calculation_inputs`, `calculation_outputs`
- `integrity_decisions`, `reports`, `report_templates`, `report_versions`
- `workflow_events`, `workflow_tasks`, `notification_logs`, `error_logs`, `audit_logs`, `import_batches`, `system_settings`, `internal_work_orders`

### Impacted Endpoints
- Auth: `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`
- Users and roles: `/api/users`, `/api/users/{user_id}`, `/api/roles`, `/api/roles/{role_id}/permissions`
- Assets: `/api/assets`, `/api/assets/{asset_id}`, `/api/assets/{asset_id}/approve`
- Evidence: `/api/evidence-files`, `/api/evidence-files/{evidence_file_id}/verify`, `/api/evidence-links`
- Inspections: `/api/inspections`, `/api/inspections/{inspection_id}`, `/api/inspections/{inspection_id}/submit`, `/api/inspections/{inspection_id}/approve`
- AI extraction/staging: `/api/extraction-jobs`, `/api/extraction-jobs/{extraction_job_id}`, `/api/extraction-fields/{extraction_field_id}/review`, `/api/staging-records`, `/api/staging-records/{staging_record_id}/promote`
- NDT: `/api/ndt-measurements`, `/api/ndt-measurements/{measurement_id}/approve`
- Calculation: `/api/calculations/run`, `/api/calculations/{calculation_run_id}`, `/api/calculations/{calculation_run_id}/approve`
- Integrity/reporting: `/api/integrity-decisions`, `/api/integrity-decisions/{decision_id}/approve`, `/api/reports/generate`, `/api/reports/{report_id}`, `/api/reports/{report_id}/issue`
- Dashboard/workflow/audit: `/api/dashboard/kpis`, `/api/work-orders`, `/api/work-orders/{work_order_id}`, `/api/workflow-events`, `/api/audit-logs`, `/api/error-logs`

### Required Permissions
Frontend visibility and actions must be controlled by backend-issued permissions, including but not limited to:
- `asset.read`, `asset.create`, `asset.update`, `asset.approve`
- `inspection.read`, `inspection.create`, `inspection.submit`, `inspection.approve`
- `evidence.read`, `evidence.upload`, `evidence.link`, `evidence.verify`
- `extraction.read`, `extraction.create`, `extraction.review`, `staging.promote`
- `ndt.read`, `ndt.create`, `ndt.approve`
- `calculation.run`, `calculation.read`, `calculation.approve`
- `integrity_decision.create`, `integrity_decision.approve`
- `report.generate`, `report.issue`, `report.read`
- `work_order.create`, `work_order.update`, `workflow_event.read`, `audit.read`, `admin.manage`

### Required Audit Events
Every state-changing UI action must display or trigger backend audit events, including:
- Asset created/updated/approved
- Evidence uploaded/verified/linked/metadata corrected
- Inspection created/submitted/approved
- AI extraction job created; extraction field approved/rejected/corrected
- Staging record promoted/rejected
- NDT measurement created/approved
- Calculation run created/approved/rejected
- Integrity decision created/approved/rejected
- Report generated/issued/blocked
- Work order created/updated/closed
- Workflow event created/acknowledged
- Error log created/acknowledged

### Required Validation Rules
- Required engineering fields cannot be blank before submit/approval.
- Evidence linkage is mandatory for findings, NDT measurements, calculations, integrity decisions, and issued reports.
- AI extracted fields must show source, confidence, and field status.
- Low-confidence AI fields must be reviewed before promotion.
- Manual correction requires reason and must create `manual_overrides`.
- Calculations can only use approved `formula_versions`.
- Reports cannot be issued unless data, calculation, review, evidence, and approval gates are satisfied.
- Frontend must block or disable actions when permission, status, or evidence/review gate is not satisfied.

### Required Test Cases
- Role-based page access and action visibility.
- Loading, empty, error, and permission-denied states for every page.
- Evidence preview with PDF/image/table and unsupported file fallback.
- Staging review approve/reject/correct flow.
- Calculation run blocked without evidence/formula version/required input.
- Report issue blocked without required approval gates.
- Audit drawer displays audit trail for every record type.
- Work order fallback can be created without SAP/Maximo integration.

### Migration or Documentation Updates
- No database migration is directly required by this page specification.
- If frontend implementation introduces new statuses, action types, or audit labels, update `03_Database/data_dictionary.*`, `04_API/openapi.yaml`, and `08_Frontend/component_inventory.md`.

---

## 1. Global Frontend Rules

### 1.1 Routing Baseline

| Page | Suggested Route | Primary Module |
|---|---|---|
| Dashboard | `/dashboard` | KPI and operational overview |
| Asset Register | `/assets` | Asset master list |
| Asset Detail | `/assets/[asset_id]` | Asset profile and lifecycle |
| Inspection Workspace | `/inspections` and `/inspections/[inspection_id]` | Inspection management |
| Evidence Room | `/evidence` and `/evidence/[evidence_file_id]` | Evidence repository |
| AI Extraction Review | `/ai-extraction` and `/ai-extraction/[extraction_job_id]` | Staging review |
| NDT Data Room | `/ndt` and `/ndt/[measurement_id]` | UT thickness data |
| Calculation Workbook | `/calculations` and `/calculations/[calculation_run_id]` | API 653 MVP calculation |
| Integrity Decision | `/integrity-decisions` and `/integrity-decisions/[decision_id]` | Engineering decision |
| Report Builder | `/reports` and `/reports/[report_id]` | Report generation and issue |
| Work Orders | `/work-orders` and `/work-orders/[work_order_id]` | Internal work order fallback |
| Admin Settings | `/admin` | Users, roles, settings |

### 1.2 Global Layout
- Left sidebar navigation with module grouping.
- Top bar with tenant/project name, environment label, user role, notification icon, and logout.
- Page header with title, status summary, primary action, secondary action, and audit drawer shortcut.
- Global record status badge component.
- Global permission guard for page-level and action-level access.
- Global evidence preview drawer.
- Global audit drawer.
- Global confirmation modal for approval, rejection, report issue, metadata correction, and work order closure.

### 1.3 Universal Status Badges
| Status | Usage |
|---|---|
| `draft` | Record created but not submitted |
| `pending_review` | Waiting engineer/reviewer action |
| `needs_correction` | Returned for correction |
| `approved` | Authorized human approval complete |
| `rejected` | Human reviewer rejected record/action |
| `blocked` | Gate failed or required dependency missing |
| `issued` | Report formally issued |
| `closed` | Work order or workflow closed |
| `failed` | Workflow or extraction error |

### 1.4 Universal Error State
Every page must show:
- error title,
- human-readable message,
- error code if returned by API,
- retry action if safe,
- link to error log if permitted,
- no silent failures.

---

# 2. Page Specifications

---

## 2.1 Dashboard

### Page Objective
Provide a management and operational overview of asset integrity status, inspection workload, evidence completeness, AI extraction backlog, calculation/review gates, open work orders, and report readiness.

### Primary User Role
Management, Lead Engineer, Engineer, Approver, Admin.

### Data Source / API Endpoint
- `GET /api/dashboard/kpis`
- `GET /api/workflow-events`
- `GET /api/error-logs`
- Optional drill-down APIs: `/api/assets`, `/api/inspections`, `/api/work-orders`, `/api/reports`

### Table Columns
Main dashboard tables:

**Open Review Queue**
- item_type
- item_id
- asset_tag
- inspection_id
- status
- priority
- assigned_to
- due_date
- aging_days

**Work Order Summary**
- work_order_no
- asset_tag
- source_type
- priority
- status
- assigned_to
- due_date

**Error Queue**
- error_id
- workflow_id
- severity
- source_module
- status
- created_at
- owner_role

### Filters
- asset_tag
- site/location
- module
- status
- priority
- owner role
- date range
- overdue only

### Forms and Fields
No primary data-entry form. Dashboard may include saved filter preferences:
- default_date_range
- favorite_assets
- default_site
- widget_visibility

### Buttons / Actions
- Refresh KPI
- View details
- Open review item
- Open evidence gap list
- Open error queue
- Export dashboard snapshot if permitted

### Status Badges
- open
- overdue
- blocked
- pending_review
- approved
- issued
- failed

### Validation Rules
- Dashboard must not aggregate records hidden by permission.
- KPI counts must reflect backend source of truth, not frontend calculation-only state.
- Report-ready KPI must only include reports satisfying required gates.

### Empty State
“No active records match your filters. Create an asset or adjust filters.”

### Error State
“Dashboard KPI could not be loaded.” Provide retry and link to error logs if permitted.

### Audit Drawer
Dashboard-level drawer displays system-level events filtered by visible modules:
- workflow events
- approval events
- report issue events
- error events

### Permission Visibility
- Management: full KPI read access where granted.
- Engineer/Lead Engineer: engineering queues and assigned review items.
- Inspector: inspection/evidence workload only.
- IT Admin: workflow/error/system health widgets.
- Restricted users must not see counts from unauthorized modules.

---

## 2.2 Asset Register

### Page Objective
Maintain and browse atmospheric storage tank asset master data.

### Primary User Role
Admin, Engineer, Lead Engineer, Inspector.

### Data Source / API Endpoint
- `GET /api/assets`
- `POST /api/assets`
- `PATCH /api/assets/{asset_id}`
- `POST /api/assets/{asset_id}/approve`

### Table Columns
- asset_tag
- asset_name
- asset_type
- location
- service_fluid
- design_code_reference
- status
- approval_status
- last_inspection_date
- next_inspection_due_date
- integrity_status
- created_at
- updated_at

### Filters
- asset_tag
- asset_type
- location/site
- service_fluid
- status
- approval_status
- integrity_status
- due inspection date range

### Forms and Fields
**Create/Edit Asset Form**
- asset_tag
- asset_name
- asset_type: `atmospheric_storage_tank`
- location
- service_fluid
- design_code_reference
- design_data_available: yes/no
- commissioning_date
- owner_department
- status
- notes

### Buttons / Actions
- Create asset
- Edit asset
- View asset detail
- Submit for approval
- Approve asset
- Reject asset
- Export asset list
- Open audit drawer

### Status Badges
- draft
- pending_review
- approved
- needs_correction
- inactive

### Validation Rules
- asset_tag required and unique.
- asset_type must be `atmospheric_storage_tank` for MVP.
- Approved asset requires minimum metadata: asset_tag, asset_type, location, service_fluid, status.
- Approval requires `asset.approve` and audit reason/comment.

### Empty State
“No assets have been registered. Create the first atmospheric storage tank asset.”

### Error State
“Asset register could not be loaded.” Show retry and API error detail if available.

### Audit Drawer
Record-level audit for selected asset:
- created
- updated
- submitted
- approved/rejected
- evidence linked
- inspection created

### Permission Visibility
- Create/Edit visible to `asset.create` / `asset.update`.
- Approve/Reject visible only to `asset.approve`.
- Read-only role sees table and detail but no state-changing actions.

---

## 2.3 Asset Detail

### Page Objective
Show a complete lifecycle profile for a single tank asset, including components, inspections, evidence, NDT, calculations, integrity decisions, reports, and work orders.

### Primary User Role
Engineer, Lead Engineer, Inspector, Approver, Management.

### Data Source / API Endpoint
- `GET /api/assets/{asset_id}`
- `PATCH /api/assets/{asset_id}`
- `GET /api/inspections?asset_id={asset_id}`
- `GET /api/evidence-links?asset_id={asset_id}`
- `GET /api/ndt-measurements?asset_id={asset_id}`
- `GET /api/integrity-decisions?asset_id={asset_id}`
- `GET /api/reports?asset_id={asset_id}`
- `GET /api/work-orders?asset_id={asset_id}`

### Table Columns
**Component Table**
- component_id
- component_type
- component_name
- course_no
- material
- nominal_thickness_mm
- minimum_required_thickness_mm
- status

**Lifecycle Tables**
- record_type
- record_id
- inspection_id
- status
- evidence_count
- reviewed_by
- approval_date
- last_updated_at

### Filters
- component type
- inspection date
- status
- evidence completeness
- open work orders
- latest only

### Forms and Fields
**Component Add/Edit Form**
- component_type
- component_name
- course_no
- material
- nominal_thickness_mm
- minimum_required_thickness_mm
- notes

### Buttons / Actions
- Edit asset metadata
- Add component
- Create inspection
- Upload evidence
- Link evidence
- Open latest calculation
- Create integrity decision
- Generate report
- Create work order
- Open audit drawer

### Status Badges
- asset status
- component status
- inspection status
- evidence completeness
- calculation status
- integrity status
- report status

### Validation Rules
- Component course number must be unique within asset/component type where applicable.
- Component thickness fields must use mm.
- Integrity decision card must show “Engineering review required before final use” for unapproved calculations.
- Report issue action hidden/disabled unless all gates pass.

### Empty State
“No lifecycle records yet for this asset. Start by creating an inspection or uploading evidence.”

### Error State
“Asset detail could not be loaded.” Preserve page shell and display retry.

### Audit Drawer
Asset-centered timeline of all linked events across modules.

### Permission Visibility
- Inspector can create inspections/evidence but not approve calculations or integrity decisions.
- Engineer can review technical records.
- Lead Engineer/Approver can approve where permitted.
- Management can view summary but not edit unless assigned permissions.

---

## 2.4 Inspection Workspace

### Page Objective
Plan, document, submit, and approve inspection records for atmospheric storage tank assets.

### Primary User Role
Inspector, Engineer, Lead Engineer, Approver.

### Data Source / API Endpoint
- `GET /api/inspections`
- `POST /api/inspections`
- `GET /api/inspections/{inspection_id}`
- `POST /api/inspections/{inspection_id}/submit`
- `POST /api/inspections/{inspection_id}/approve`
- `POST /api/evidence-links`

### Table Columns
- inspection_id
- inspection_no
- asset_tag
- inspection_type
- inspection_date_start
- inspection_date_end
- inspector
- status
- findings_count
- evidence_count
- submitted_at
- approved_at

### Filters
- asset_tag
- inspection_type
- date range
- status
- inspector
- evidence completeness
- pending approval

### Forms and Fields
**Create Inspection Form**
- asset_id
- inspection_no
- inspection_type
- inspection_date_start
- inspection_date_end
- inspection_scope
- inspection_method
- inspector_user_id
- notes

**Finding Form**
- component
- finding_type
- finding_description
- severity
- location_reference
- evidence_code
- recommended_action

### Buttons / Actions
- Create inspection
- Edit inspection
- Add finding
- Link evidence
- Submit inspection
- Approve inspection
- Reject / return for correction
- Open evidence preview
- Open audit drawer

### Status Badges
- draft
- pending_review
- approved
- needs_correction
- rejected

### Validation Rules
- asset_id required.
- inspection start date must be less than or equal to end date.
- Findings require evidence linkage before approval.
- Submit requires at least one inspection scope item or explicit “no findings” confirmation.
- Approve requires `inspection.approve` and human review comment.

### Empty State
“No inspections found. Create an inspection for a registered tank asset.”

### Error State
“Inspection data could not be loaded.” Provide retry and show related error log if available.

### Audit Drawer
Inspection-level audit:
- created
- finding added/updated
- evidence linked
- submitted
- approved/rejected/corrected

### Permission Visibility
- Inspector: create/edit draft, add findings, submit.
- Engineer: review and request corrections.
- Lead Engineer/Approver: approve/reject.
- Management: read-only.

---

## 2.5 Evidence Room

### Page Objective
Manage original evidence file metadata, object storage references, thumbnails/previews, checksum, versioning, and linkage to engineering records.

### Primary User Role
Inspector, Engineer, Lead Engineer, IT Admin.

### Data Source / API Endpoint
- `GET /api/evidence-files`
- `POST /api/evidence-files`
- `POST /api/evidence-files/{evidence_file_id}/verify`
- `GET /api/evidence-links`
- `POST /api/evidence-links`

### Table Columns
- evidence_code
- asset_tag
- inspection_id
- file_type
- method
- component
- source_file_name
- object_storage_path
- checksum
- verification_status
- uploaded_by
- uploaded_at
- linked_record_count

### Filters
- evidence_code
- asset_tag
- inspection_id
- method
- component
- file_type
- verification_status
- uploaded_by
- date range
- unlinked only

### Forms and Fields
**Upload Evidence Metadata Form**
- evidence_code
- asset_id
- inspection_id
- method
- component
- cml_tml_grid_reference
- inspection_date
- source_file_name
- file_type
- object_storage_path
- page_figure_table_reference
- checksum
- uploaded_by

**Link Evidence Form**
- evidence_file_id
- linked_entity_type
- linked_entity_id
- link_reason
- page_figure_table_reference
- coordinate_or_location_reference

### Buttons / Actions
- Upload evidence metadata
- Verify checksum
- Link evidence
- Open preview
- Open file in object storage signed URL
- Update metadata
- Create new version
- Request deletion
- Open audit drawer

### Status Badges
- uploaded
- verified
- unverified
- linked
- unlinked
- superseded
- delete_requested

### Validation Rules
- evidence_code required and must follow evidence governance convention where applicable.
- Supported file types: PDF, XLSX, CSV, JPG, PNG, DWG, DXF, STL, ZIP.
- checksum required before verification.
- object_storage_path must follow `/evidence/{asset_tag}/{inspection_id}/{evidence_code}/{filename}`.
- Evidence cannot be deleted if linked to approved calculation, decision, or issued report unless authorized deletion process is completed.

### Empty State
“No evidence files found. Upload evidence metadata after the original file is stored in object storage.”

### Error State
“Evidence room could not be loaded.” Show retry and unsupported preview fallback.

### Audit Drawer
Evidence audit:
- uploaded
- checksum verified
- linked/unlinked
- metadata corrected
- version created
- deletion requested/approved/rejected

### Permission Visibility
- Upload visible to `evidence.upload`.
- Link visible to `evidence.link`.
- Verify visible to `evidence.verify`.
- Delete request/approval visible only to authorized roles.
- Preview access must obey evidence read permission and file sensitivity.

---

## 2.6 AI Extraction Review

### Page Objective
Allow engineers to review AI-extracted fields, confidence scores, evidence sources, validation issues, manual corrections, and promotion to staging/final workflow gates.

### Primary User Role
Engineer, Lead Engineer, Inspector for support, Approver for oversight.

### Data Source / API Endpoint
- `GET /api/extraction-jobs`
- `POST /api/extraction-jobs`
- `GET /api/extraction-jobs/{extraction_job_id}`
- `POST /api/extraction-fields/{extraction_field_id}/review`
- `GET /api/staging-records`
- `POST /api/staging-records/{staging_record_id}/promote`

### Table Columns
**Extraction Job List**
- extraction_job_id
- asset_tag
- inspection_id
- source_evidence_code
- schema_name
- prompt_version
- status
- field_count
- low_confidence_count
- validation_error_count
- created_at

**Field Review Table**
- field_name
- extracted_value
- normalized_value
- unit
- source_reference
- confidence_score
- field_status
- validation_status
- reviewer
- correction_required

### Filters
- asset_tag
- inspection_id
- job status
- schema name
- prompt version
- low confidence only
- validation errors only
- reviewer
- date range

### Forms and Fields
**Create Extraction Job Form**
- evidence_file_id
- schema_name
- target_asset_id
- target_inspection_id
- extraction_purpose
- prompt_version

**Field Review / Correction Form**
- field_status: approve/reject/correct
- corrected_value
- corrected_unit
- correction_reason
- reviewer_comment
- evidence_reference_override

### Buttons / Actions
- Create extraction job
- Review field
- Approve field
- Reject field
- Correct field
- Bulk approve high-confidence fields, if permitted and no validation errors
- Promote staging record
- Open evidence preview
- Open audit drawer

### Status Badges
- extraction_queued
- extraction_running
- extraction_completed
- failed
- low_confidence
- reviewed
- corrected
- promoted
- blocked

### Validation Rules
- AI output must display source, confidence_score, and field_status for every extracted field.
- Low-confidence fields cannot be promoted without engineer review.
- Correction requires reason and must create `manual_overrides`.
- Staging promotion requires all required fields reviewed and evidence references present.
- Asset tag mismatch, unit mismatch, duplicate report number, invalid date, suspicious thickness, missing evidence reference, invalid reference text must block promotion until resolved.

### Empty State
“No extraction jobs found. Start from Evidence Room or create a new extraction job.”

### Error State
“AI extraction review could not be loaded.” If job failed, show fallback instruction and link to error log.

### Audit Drawer
Extraction-level audit:
- job created
- field extracted
- validation failed
- field approved/rejected/corrected
- manual override created
- staging record promoted

### Permission Visibility
- Create job visible to `extraction.create`.
- Field review visible to `extraction.review`.
- Promote visible to `staging.promote`.
- AI output must be labelled “Not approved engineering data”.

---

## 2.7 NDT Data Room

### Page Objective
Manage UT thickness measurements, CML/TML points, thickness readings, evidence linkage, review, and approval status.

### Primary User Role
Inspector, Engineer, Lead Engineer.

### Data Source / API Endpoint
- `GET /api/ndt-measurements`
- `POST /api/ndt-measurements`
- `POST /api/ndt-measurements/{measurement_id}/approve`
- `GET /api/evidence-links`

### Table Columns
- measurement_id
- asset_tag
- inspection_id
- method
- component
- course_no
- cml_point
- previous_thickness_mm
- current_thickness_mm
- minimum_required_thickness_mm
- reading_date
- evidence_code
- status
- warning_count

### Filters
- asset_tag
- inspection_id
- component
- course_no
- method
- status
- evidence missing
- warning type
- thickness below minimum

### Forms and Fields
**Create NDT Measurement Form**
- asset_id
- inspection_id
- method: UT thickness
- component
- course_no
- cml_point_id
- reading_location
- previous_thickness_mm
- current_thickness_mm
- minimum_required_thickness_mm
- reading_date
- unit
- evidence_file_id
- technician
- notes

### Buttons / Actions
- Add measurement
- Import readings batch, if permitted
- Link evidence
- Open evidence preview
- Flag reading
- Approve measurement
- Reject/return for correction
- Open calculation
- Open audit drawer

### Status Badges
- draft
- pending_review
- approved
- rejected
- warning
- evidence_missing
- below_minimum

### Validation Rules
- Unit must be mm for MVP.
- current_thickness_mm required and must be positive.
- reading_date must be valid and not future unless explicitly allowed by Admin setting.
- evidence_file_id required before approval.
- Suspicious thickness values must show warning and require review.
- Approval requires engineer/lead engineer permission.

### Empty State
“No NDT measurements found. Add UT thickness readings or import a validated batch.”

### Error State
“NDT data could not be loaded.” Preserve filters and allow retry.

### Audit Drawer
NDT audit:
- measurement created
- reading updated
- evidence linked
- warning generated
- approved/rejected

### Permission Visibility
- Inspector can create draft/import if permitted.
- Engineer can review.
- Lead Engineer can approve.
- Management read-only.

---

## 2.8 Calculation Workbook

### Page Objective
Run and review deterministic API 653 MVP calculations using approved formula versions and explicitly supplied formulas only.

### Primary User Role
Engineer, Lead Engineer, Approver.

### Data Source / API Endpoint
- `POST /api/calculations/run`
- `GET /api/calculations/{calculation_run_id}`
- `POST /api/calculations/{calculation_run_id}/approve`
- `GET /api/ndt-measurements`
- `GET /api/evidence-links`

### Table Columns
**Calculation Runs**
- calculation_run_id
- asset_tag
- inspection_id
- formula_version
- run_status
- run_by
- run_at
- review_status
- approved_by
- approved_at
- warning_count

**Calculation Output Rows**
- component
- course_no
- corrosion_rate_mm_y
- remaining_life_y
- status
- warning
- evidence_code

### Filters
- asset_tag
- inspection_id
- formula_version
- run_status
- review_status
- warning only
- below threshold

### Forms and Fields
**Run Calculation Form**
- asset_id
- inspection_id
- formula_version
- ndt_measurement_ids
- calculation_basis_comment
- threshold_config_id or threshold_value
- evidence_link_confirmation

**Review Calculation Form**
- approve/reject
- reviewer_comment
- exception_reason if rejected/blocked

### Buttons / Actions
- Run calculation
- View formula version
- Compare calculation runs
- Export validation summary
- Approve calculation
- Reject calculation
- Create integrity decision
- Open evidence preview
- Open audit drawer

### Status Badges
- queued
- completed
- failed
- pending_review
- approved
- rejected
- warning
- blocked

### Validation Rules
- Only approved formula version can run.
- Required input must be present: previous thickness, current thickness, minimum required thickness, inspection interval, evidence reference.
- No proprietary formulas may be entered in UI.
- Calculation output must display disclaimer: “Engineering review required before final use.”
- Approval requires human engineer/lead engineer authority.
- Calculation cannot be used for report issue until approved.

### Empty State
“No calculation runs found. Select approved NDT measurements to run a deterministic calculation.”

### Error State
“Calculation could not be completed.” Show failed validation items and related error log.

### Audit Drawer
Calculation audit:
- run created
- input validation passed/failed
- formula version used
- output generated
- warnings raised
- approved/rejected

### Permission Visibility
- Run visible to `calculation.run`.
- Approve visible to `calculation.approve`.
- Formula version visibility according to formula registry read permission.

---

## 2.9 Integrity Decision

### Page Objective
Create, review, and approve engineering integrity decisions based on reviewed evidence, approved NDT data, and approved calculation outputs.

### Primary User Role
Engineer, Lead Engineer, Approver, Management read-only.

### Data Source / API Endpoint
- `GET /api/integrity-decisions`
- `POST /api/integrity-decisions`
- `POST /api/integrity-decisions/{decision_id}/approve`
- Supporting reads: `/api/calculations/{calculation_run_id}`, `/api/evidence-links`, `/api/inspections/{inspection_id}`

### Table Columns
- decision_id
- asset_tag
- inspection_id
- decision_type
- integrity_status
- basis_calculation_run_id
- evidence_count
- decision_status
- created_by
- created_at
- approved_by
- approved_at

### Filters
- asset_tag
- inspection_id
- integrity_status
- decision_status
- decision_type
- pending approval
- action required

### Forms and Fields
**Create Integrity Decision Form**
- asset_id
- inspection_id
- decision_type
- basis_calculation_run_id
- integrity_status
- decision_summary
- required_action
- operating_limitation
- due_date
- linked_evidence_ids
- engineering_basis_comment

**Approval Form**
- approve/reject
- approval_comment
- required_follow_up

### Buttons / Actions
- Create decision
- Link approved calculation
- Link evidence
- Approve decision
- Reject / request correction
- Create work order
- Generate report
- Open evidence preview
- Open audit drawer

### Status Badges
- draft
- pending_review
- approved
- rejected
- action_required
- blocked

### Validation Rules
- Decision requires approved calculation if calculation-dependent.
- Decision requires evidence linkage.
- AI output cannot be selected as direct final basis unless promoted and reviewed.
- Required action must create or link work order when status is action_required.
- Approval requires `integrity_decision.approve`.

### Empty State
“No integrity decisions found. Create one after inspection, evidence, NDT, and calculation gates are complete.”

### Error State
“Integrity decisions could not be loaded.” Show gate status diagnostics.

### Audit Drawer
Decision audit:
- created
- evidence linked
- calculation linked
- work order linked
- approved/rejected

### Permission Visibility
- Engineer can create draft.
- Lead Engineer/Approver can approve.
- Management can view approved decisions and dashboards.

---

## 2.10 Report Builder

### Page Objective
Generate, review, approve, and issue inspection/integrity reports with mandatory gate checks, evidence linkage, calculation approvals, and audit trail.

### Primary User Role
Engineer, Lead Engineer, Approver, Management.

### Data Source / API Endpoint
- `POST /api/reports/generate`
- `GET /api/reports/{report_id}`
- `POST /api/reports/{report_id}/issue`
- Supporting reads: `/api/assets/{asset_id}`, `/api/inspections/{inspection_id}`, `/api/integrity-decisions`, `/api/evidence-links`, `/api/calculations/{calculation_run_id}`

### Table Columns
- report_id
- report_no
- asset_tag
- inspection_id
- template_name
- version_no
- report_status
- gate_status
- generated_by
- generated_at
- issued_by
- issued_at

### Filters
- asset_tag
- inspection_id
- report_status
- template
- gate_status
- generated date
- issued date

### Forms and Fields
**Generate Report Form**
- asset_id
- inspection_id
- report_template_id
- included_sections
- calculation_run_id
- integrity_decision_id
- linked_evidence_ids
- report_title
- draft_notes

**Issue Report Form**
- issue_comment
- approver_confirmation
- final_evidence_check_confirmation
- final_calculation_check_confirmation

### Buttons / Actions
- Generate draft report
- Preview report
- Regenerate report version
- Download draft
- Submit for approval
- Issue report
- Block issue / request correction
- Open gate checklist
- Open evidence preview
- Open audit drawer

### Status Badges
- draft
- pending_review
- approved
- blocked
- issued
- superseded

### Validation Rules
- Report cannot be issued unless required data, calculation, review, evidence, and approval gates are satisfied.
- Draft report must clearly show “Not issued”.
- Issued report requires immutable versioning.
- Report issue requires `report.issue` and audit comment.
- Evidence and calculation references must be displayed in report preview.

### Empty State
“No reports found. Generate a draft after inspection and integrity decision records are ready.”

### Error State
“Report could not be generated or issued.” Show blocked gate list.

### Audit Drawer
Report audit:
- draft generated
- version regenerated
- submitted
- approved
- issue blocked
- issued
- downloaded if tracked

### Permission Visibility
- Generate visible to `report.generate`.
- Issue visible only to `report.issue` and only when gates pass.
- Management can read issued reports.

---

## 2.11 Work Orders

### Page Objective
Provide internal work order fallback for corrective actions before external SAP/Maximo production integration is available.

### Primary User Role
Engineer, Lead Engineer, Inspector, Management, IT Admin.

### Data Source / API Endpoint
- `GET /api/work-orders`
- `POST /api/work-orders`
- `PATCH /api/work-orders/{work_order_id}`
- Supporting reads: `/api/integrity-decisions`, `/api/inspections`, `/api/evidence-links`

### Table Columns
- work_order_id
- work_order_no
- asset_tag
- source_type
- source_record_id
- priority
- status
- assigned_to
- due_date
- created_by
- created_at
- closed_at

### Filters
- asset_tag
- status
- priority
- assigned_to
- due date
- overdue only
- source type
- created date

### Forms and Fields
**Create Work Order Form**
- asset_id
- source_type
- source_record_id
- title
- description
- priority
- recommended_action
- assigned_to
- due_date
- linked_evidence_ids

**Update Work Order Form**
- status
- progress_comment
- completion_summary
- closure_evidence_id
- closed_by

### Buttons / Actions
- Create work order
- Assign
- Update status
- Add comment
- Link evidence
- Close work order
- Reopen if permitted
- Open source record
- Open audit drawer

### Status Badges
- open
- assigned
- in_progress
- blocked
- completed
- closed
- overdue

### Validation Rules
- Work order requires asset_id, title, priority, source_type, due_date.
- Work order from action_required integrity decision must link source decision.
- Closure requires completion summary and closure evidence if required by configuration.
- External CMMS reference is optional in MVP.

### Empty State
“No work orders found. Create an internal work order from an action-required decision or finding.”

### Error State
“Work orders could not be loaded.” Show retry and preserve filters.

### Audit Drawer
Work order audit:
- created
- assigned
- status changed
- evidence linked
- closed/reopened

### Permission Visibility
- Create visible to `work_order.create`.
- Update visible to `work_order.update`.
- Management can read status summary.

---

## 2.12 Admin Settings

### Page Objective
Manage users, roles, permissions, system settings, formula visibility, workflow health, and application configuration.

### Primary User Role
Admin, IT Admin.

### Data Source / API Endpoint
- `GET /api/users`
- `POST /api/users`
- `GET /api/users/{user_id}`
- `PATCH /api/users/{user_id}`
- `GET /api/roles`
- `POST /api/roles`
- `POST /api/roles/{role_id}/permissions`
- `GET /api/workflow-events`
- `GET /api/error-logs`
- `GET /api/audit-logs`

### Table Columns
**Users**
- user_id
- name
- email
- status
- roles
- last_login_at
- created_at

**Roles**
- role_id
- role_name
- permission_count
- status
- updated_at

**System Health**
- module
- status
- last_event_at
- open_error_count
- owner_role

### Filters
- user status
- role
- permission
- module
- workflow status
- error severity
- audit event type

### Forms and Fields
**User Form**
- name
- email
- status
- roles
- department

**Role Form**
- role_name
- description
- permissions

**System Setting Form**
- setting_key
- setting_value
- effective_date
- approval_required

### Buttons / Actions
- Create user
- Edit user
- Disable user
- Create role
- Assign permissions
- View audit logs
- Acknowledge workflow event
- Open error log
- Export audit logs if permitted

### Status Badges
- active
- disabled
- locked
- healthy
- degraded
- failed
- acknowledged

### Validation Rules
- Admin cannot remove all admin permissions from the last active admin.
- Permission changes require audit event and reason.
- Sensitive system settings require confirmation and may require approval.
- Audit logs are immutable and read-only.

### Empty State
“No records found for the selected admin view.”

### Error State
“Admin settings could not be loaded.” Show restricted message if permission denied.

### Audit Drawer
Admin audit:
- user created/updated/disabled
- role created/updated
- permission assigned/removed
- setting changed
- workflow event acknowledged

### Permission Visibility
- Entire page requires `admin.manage` or specific admin read permissions.
- Audit export requires `audit.export` or equivalent.

---

# 3. Cross-Page Gate Rules

## 3.1 Evidence Gate
A record cannot be approved if required evidence linkage is missing for:
- findings,
- NDT measurements,
- calculation inputs,
- integrity decisions,
- issued reports.

## 3.2 AI Gate
AI output must remain in extraction/staging UI until human review. The UI must show:
- source reference,
- confidence score,
- field status,
- validation issues,
- reviewer and correction reason where applicable.

## 3.3 Calculation Gate
Calculation actions must use:
- approved formula version,
- deterministic calculation engine output,
- required input completeness,
- evidence-linked inputs,
- human approval before final use.

## 3.4 Report Issue Gate
Report issue button must be disabled unless backend returns gate pass for:
- asset approval,
- inspection approval,
- evidence completeness,
- calculation approval,
- integrity decision approval,
- report approval.

## 3.5 n8n Boundary Gate
Frontend must not expose n8n as the data owner. Workflow status may be displayed from AIM `/api/workflow-events`, but all actions must call AIM backend endpoints.

---

# 4. Delivery Notes

## What Changed
Created implementation-ready frontend page specifications for 12 AIM MVP pages, including objective, users, endpoints, columns, filters, forms, actions, statuses, validation, empty/error states, audit drawer, and permission visibility.

## AIM / n8n Boundary Confirmation
All frontend pages consume AIM backend APIs. n8n is visible only through workflow events/error logs exposed by AIM, and never as a direct frontend integration target.

## Suggested Run / Test Commands
```bash
npm run lint
npm run typecheck
npm run test
npm run test:rbac
npm run test:audit
npm run test:e2e
```

## Documentation Updates
If frontend route names, permissions, statuses, or API payloads change during implementation, update:
- `04_API/openapi.yaml`
- `03_Database/data_dictionary.*`
- `08_Frontend/component_inventory.md`
- `08_Frontend/design_system.md`
