# AIM MVP Frontend Component Inventory

**Document path:** `08_Frontend/component_inventory.md`  
**Product:** Asset Integrity Management (AIM) + n8n MVP  
**Purpose:** Define reusable frontend components for developer handoff and Codex implementation.  
**Status:** Implementation-ready baseline  
**Last updated:** 2026-06-11

---

## 0. Pre-Implementation Governance Check

### Assumptions
- Components are implemented in a modern React/Next.js frontend with TypeScript.
- All state-changing actions call AIM backend APIs only.
- Frontend does not directly write PostgreSQL, object storage, or n8n.
- Component permission visibility is driven by authenticated user permissions from `/api/auth/me`.
- Components must support auditability by displaying record status and exposing audit drawer where applicable.

### Impacted Documents
- `08_Frontend/page_specs.md`
- `08_Frontend/design_system.md`
- `04_API/openapi.yaml`
- `03_Database/data_dictionary.md`
- `06_Evidence/evidence_governance.md`
- `06_AI_Extraction/AI_Extraction_Control_Pack/human_review_sop.md`
- `07_Calculation/engineering_basis.md`

### Impacted Tables
Components surface data from all AIM MVP modules, especially:
- `assets`, `inspections`, `evidence_files`, `evidence_links`
- `extraction_jobs`, `extraction_fields`, `staging_records`, `manual_overrides`
- `ndt_measurements`, `calculation_runs`, `calculation_outputs`
- `integrity_decisions`, `reports`, `internal_work_orders`
- `workflow_events`, `error_logs`, `audit_logs`

### Impacted Endpoints
- All endpoints listed in `04_API/openapi.yaml`.
- Component-specific API use is documented below.

### Required Permissions
- Components must accept `requiredPermission` or `visibleWhen` guard properties where action visibility is restricted.
- Critical approval components require explicit permission and backend gate validation.

### Required Audit Events
- All approval, rejection, correction, calculation, report issue, work order, and evidence operations must result in backend audit events.
- Components must show success/failure states but must not generate audit events directly outside AIM APIs.

### Required Validation Rules
- Client-side validation may assist users but backend validation remains authoritative.
- Components must render backend validation errors exactly enough for user correction.

### Required Test Cases
- Component renders loading, empty, error, permission-denied, and success state.
- Component hides restricted action if permission missing.
- Component blocks unsafe action when backend gate status fails.
- Component displays audit drawer link for auditable records.

### Migration or Documentation Updates
- No migration required.
- Update this inventory when shared props, status names, design tokens, or API response shapes change.

---

# 1. Component Architecture

## 1.1 Component Layers

| Layer | Purpose | Example Components |
|---|---|---|
| App shell | Layout, navigation, auth context | `AppShell`, `SidebarNav`, `TopBar`, `Breadcrumbs` |
| Data display | Tables, cards, metrics, timelines | `DataTable`, `KpiCard`, `Timeline`, `StatusBadge` |
| Forms | Controlled forms and validation | `AssetForm`, `InspectionForm`, `NdtMeasurementForm` |
| Governance | Audit, approvals, gates, RBAC | `AuditDrawer`, `ApprovalActionPanel`, `PermissionGuard`, `GateChecklist` |
| Evidence | Evidence preview and linking | `EvidencePreviewDrawer`, `EvidenceLinkPanel`, `EvidenceMetadataCard` |
| AI review | AI extraction and staging review | `ExtractionFieldReviewTable`, `ConfidenceBadge`, `ManualOverrideModal` |
| Calculation | Formula version and outputs | `CalculationRunPanel`, `CalculationOutputTable`, `FormulaVersionBadge` |
| Workflow | n8n status surfaced through AIM | `WorkflowEventTimeline`, `ErrorLogPanel`, `SlaEscalationBadge` |

---

# 2. Core Layout Components

## 2.1 `AppShell`

### Purpose
Provide authenticated application layout with sidebar, top bar, content container, global notifications, and route-level permission handling.

### Used On
All pages.

### Key Props
- `user`
- `permissions`
- `currentRoute`
- `children`
- `environmentLabel`

### Data Source / API
- `GET /api/auth/me`

### Validation / Behavior
- Redirect unauthenticated users to login.
- Show permission-denied state for unauthorized pages.
- Never expose hidden route data through client-side only checks.

### Test Cases
- Authenticated render.
- Unauthenticated redirect.
- Permission denied render.

---

## 2.2 `SidebarNav`

### Purpose
Show module navigation with role-aware visibility.

### Navigation Groups
- Overview: Dashboard
- Assets and Inspection: Asset Register, Inspection Workspace, NDT Data Room
- Evidence and AI: Evidence Room, AI Extraction Review
- Engineering: Calculation Workbook, Integrity Decision, Report Builder
- Operations: Work Orders
- Administration: Admin Settings

### Key Props
- `navItems`
- `permissions`
- `activeRoute`

### Permission Rule
Each item includes `requiredPermission`. Hidden if user lacks permission.

---

## 2.3 `PageHeader`

### Purpose
Standardize page title, subtitle, status summary, primary action, secondary actions, and audit drawer trigger.

### Key Props
- `title`
- `subtitle`
- `statusBadge`
- `primaryAction`
- `secondaryActions`
- `auditTarget`

---

# 3. Data Display Components

## 3.1 `DataTable`

### Purpose
Reusable table component for all module lists.

### Required Features
- Server-side pagination
- Server-side sorting
- Server-side filters
- Column visibility control
- Row click action
- Bulk selection where permitted
- Empty state
- Error state
- Loading skeleton

### Common Props
- `columns`
- `rows`
- `filters`
- `sort`
- `pagination`
- `isLoading`
- `error`
- `onRowClick`
- `rowActions`

### Validation / Behavior
- Do not calculate business-critical statuses on frontend unless explicitly returned by backend.
- Preserve filters after retry.

---

## 3.2 `StatusBadge`

### Purpose
Show record status consistently across modules.

### Status Inputs
- `draft`
- `pending_review`
- `needs_correction`
- `approved`
- `rejected`
- `blocked`
- `issued`
- `closed`
- `failed`
- `warning`

### Key Props
- `status`
- `label`
- `severity`
- `tooltip`

### Behavior
- Tooltip explains what the status means.
- Badge color follows `design_system.md`.

---

## 3.3 `KpiCard`

### Purpose
Dashboard metric display.

### Used On
Dashboard, Asset Detail, Work Orders, Admin Settings.

### Key Props
- `title`
- `value`
- `unit`
- `trend`
- `status`
- `drilldownRoute`

### Data Source / API
- `GET /api/dashboard/kpis`

---

## 3.4 `RecordTimeline`

### Purpose
Show chronological lifecycle events for assets, inspections, evidence, calculations, reports, and work orders.

### Data Source / API
- `GET /api/audit-logs`
- `GET /api/workflow-events`

### Behavior
- Audit entries must be immutable and read-only.
- Show timestamp, actor, event type, old value/new value summary where available.

---

# 4. Governance Components

## 4.1 `PermissionGuard`

### Purpose
Render or hide children based on permission and optional record status.

### Key Props
- `requiredPermission`
- `fallback`
- `mode`: `hide | disable | message`
- `children`

### Behavior
- UI hiding is not security; backend remains authoritative.
- Disabled actions must show reason.

---

## 4.2 `AuditDrawer`

### Purpose
Show audit logs for a selected record or module.

### Used On
All auditable pages.

### Key Props
- `entityType`
- `entityId`
- `open`
- `onClose`

### Data Source / API
- `GET /api/audit-logs?entity_type={entityType}&entity_id={entityId}`

### Table Columns
- event_type
- actor
- timestamp
- comment
- previous_value
- new_value
- source_module

### Validation / Behavior
- Read-only.
- Hide if user lacks `audit.read`.
- Show fallback: “Audit access restricted.”

---

## 4.3 `ApprovalActionPanel`

### Purpose
Standardize approve/reject/request correction flows.

### Used On
Assets, inspections, NDT, calculations, integrity decisions, reports.

### Key Props
- `entityType`
- `entityId`
- `currentStatus`
- `requiredPermission`
- `gateStatus`
- `onApprove`
- `onReject`
- `onRequestCorrection`

### Required Fields
- approval decision
- comment/reason
- confirmation checkbox for high-risk actions

### Validation Rules
- Approval comment required for report issue, calculation approval, integrity decision approval, and rejection.
- Button disabled when `gateStatus !== pass`.
- Backend controls final acceptance.

---

## 4.4 `GateChecklist`

### Purpose
Display whether required gates are complete before approval or issue.

### Gate Types
- required_data_complete
- evidence_linked
- engineer_review_complete
- calculation_approved
- integrity_decision_approved
- report_template_selected
- workflow_errors_resolved

### Key Props
- `gates`
- `blocking`
- `lastCheckedAt`

### Behavior
- Failed gates show corrective action link.
- Used before report issue and calculation approval.

---

# 5. Evidence Components

## 5.1 `EvidencePreviewDrawer`

### Purpose
Preview supported evidence files and show metadata, checksum, and linkage context.

### Supported File Types
- PDF
- XLSX
- CSV
- JPG
- PNG
- DWG
- DXF
- STL
- ZIP

### Preview Pattern
- PDF: page preview with page reference.
- Image: zoomable image preview.
- XLSX/CSV: tabular preview, first rows only.
- DWG/DXF/STL/ZIP: metadata preview and download/open action only unless viewer is available.

### Key Props
- `evidenceFileId`
- `evidenceCode`
- `sourceReference`
- `open`
- `onClose`

### Data Source / API
- `GET /api/evidence-files`
- `GET /api/evidence-links`

### Validation / Behavior
- Signed URL access should be generated by backend/object storage service, not hardcoded in frontend.
- Show checksum and verification status.
- Show unsupported preview fallback.

---

## 5.2 `EvidenceLinkPanel`

### Purpose
Create and display links between evidence files and engineering records.

### Used On
Inspections, findings, NDT, calculation, integrity decision, report builder.

### Key Props
- `linkedEntityType`
- `linkedEntityId`
- `assetId`
- `inspectionId`
- `required`
- `onLinkCreated`

### Data Source / API
- `GET /api/evidence-links`
- `POST /api/evidence-links`

### Validation Rules
- Link requires evidence_file_id, linked_entity_type, linked_entity_id, and link_reason.
- Missing evidence blocks approval where required.

---

## 5.3 `EvidenceMetadataCard`

### Purpose
Show evidence metadata compactly.

### Fields
- evidence_code
- source_file_name
- file_type
- method
- component
- cml_tml_grid_reference
- page_figure_table_reference
- checksum
- uploaded_by
- uploaded_at
- verification_status

---

# 6. AI Extraction Components

## 6.1 `ExtractionJobTable`

### Purpose
List extraction jobs and their validation/review status.

### Data Source / API
- `GET /api/extraction-jobs`

### Columns
- extraction_job_id
- asset_tag
- inspection_id
- schema_name
- prompt_version
- status
- field_count
- low_confidence_count
- validation_error_count
- created_at

---

## 6.2 `ExtractionFieldReviewTable`

### Purpose
Review extracted fields with source, confidence, status, validation result, and correction tools.

### Data Source / API
- `GET /api/extraction-jobs/{extraction_job_id}`
- `POST /api/extraction-fields/{extraction_field_id}/review`

### Columns
- field_name
- extracted_value
- normalized_value
- unit
- source_reference
- confidence_score
- field_status
- validation_status
- reviewer
- action

### Required Behaviors
- Low confidence row highlighting.
- Evidence preview side-by-side.
- Correction modal requires reason.
- Rejection requires reason.
- Promotion unavailable until required fields are reviewed.

---

## 6.3 `ConfidenceBadge`

### Purpose
Display confidence category.

### Categories
- high
- medium
- low
- blocked

### Behavior
- Tooltip shows threshold rule from `field_confidence_rules.md`.

---

## 6.4 `ManualOverrideModal`

### Purpose
Capture reviewer correction with reason and audit trail.

### Required Fields
- corrected_value
- corrected_unit
- correction_reason
- evidence_reference_override if applicable
- reviewer_comment

### Validation Rules
- reason required.
- correction cannot directly approve final engineering data unless followed by review action.

---

# 7. Engineering Data Components

## 7.1 `AssetForm`

### Purpose
Create or edit asset metadata.

### Endpoint
- `POST /api/assets`
- `PATCH /api/assets/{asset_id}`

### Fields
- asset_tag
- asset_name
- asset_type
- location
- service_fluid
- design_code_reference
- design_data_available
- commissioning_date
- owner_department
- status
- notes

### Validation
- asset_tag required and unique.
- asset_type fixed to atmospheric storage tank for MVP.

---

## 7.2 `InspectionForm`

### Purpose
Create/edit inspection records.

### Endpoint
- `POST /api/inspections`

### Fields
- asset_id
- inspection_no
- inspection_type
- inspection_date_start
- inspection_date_end
- inspection_scope
- inspection_method
- inspector_user_id
- notes

### Validation
- date range valid.
- asset_id required.

---

## 7.3 `FindingEditor`

### Purpose
Add/edit inspection findings.

### Fields
- component
- finding_type
- finding_description
- severity
- location_reference
- evidence_code
- recommended_action

### Validation
- Evidence required before approval.
- recommended_action required for medium/high severity findings.

---

## 7.4 `NdtMeasurementForm`

### Purpose
Create UT thickness measurement records.

### Endpoint
- `POST /api/ndt-measurements`

### Fields
- asset_id
- inspection_id
- method
- component
- course_no
- cml_point_id
- reading_location
- previous_thickness_mm
- current_thickness_mm
- minimum_required_thickness_mm
- years_between_inspections
- reading_date
- unit
- evidence_file_id
- technician
- notes

### Validation
- unit must be mm for MVP.
- thickness values must be positive unless exception handling is triggered.
- evidence required before approval.

---

# 8. Calculation Components

## 8.1 `CalculationRunPanel`

### Purpose
Run deterministic calculation with approved formula version.

### Endpoint
- `POST /api/calculations/run`

### Fields
- asset_id
- inspection_id
- formula_version
- ndt_measurement_ids
- calculation_basis_comment
- threshold_config_id or threshold_value
- evidence_link_confirmation

### Behavior
- Show formula version selector.
- Show warning: “Engineering review required before final use.”
- Disable run if required evidence or formula version missing.

---

## 8.2 `CalculationOutputTable`

### Purpose
Display calculation outputs.

### Columns
- component
- course_no
- corrosion_rate_mm_y
- remaining_life_y
- status
- warning
- evidence_code

### Behavior
- Output is read-only.
- Warnings must be visually distinct.
- Evidence link available per row.

---

## 8.3 `FormulaVersionBadge`

### Purpose
Show formula version and approval state.

### Fields
- formula_version
- formula_status
- approved_by
- approved_at

### Rule
Only approved formula versions may be used to run calculations.

---

# 9. Integrity and Reporting Components

## 9.1 `IntegrityDecisionForm`

### Purpose
Create engineering integrity decisions.

### Endpoint
- `POST /api/integrity-decisions`

### Fields
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

### Validation
- Approved calculation required if calculation-dependent.
- Evidence link required.
- Action required decision must create or link work order.

---

## 9.2 `ReportBuilderPanel`

### Purpose
Generate and issue reports with gate control.

### Endpoint
- `POST /api/reports/generate`
- `POST /api/reports/{report_id}/issue`

### Fields
- asset_id
- inspection_id
- report_template_id
- included_sections
- calculation_run_id
- integrity_decision_id
- linked_evidence_ids
- report_title
- draft_notes

### Behavior
- Report preview shows draft/issued watermark.
- Issue action disabled unless gates pass.
- Issue action requires confirmation comment.

---

## 9.3 `ReportGateChecklist`

### Purpose
Show report issue readiness.

### Gates
- asset approved
- inspection approved
- evidence complete
- NDT approved
- calculation approved
- integrity decision approved
- report template valid

### Behavior
- Each failed gate links to source page.

---

# 10. Workflow and Operations Components

## 10.1 `WorkOrderForm`

### Purpose
Create/update internal work orders.

### Endpoint
- `POST /api/work-orders`
- `PATCH /api/work-orders/{work_order_id}`

### Fields
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
- status
- completion_summary

### Validation
- source required for decision/finding-driven work orders.
- closure requires completion summary.

---

## 10.2 `WorkflowEventTimeline`

### Purpose
Display n8n workflow status as captured by AIM.

### Endpoint
- `GET /api/workflow-events`

### Fields
- workflow_id
- event_type
- entity_type
- entity_id
- status
- created_at
- owner_role

### Rule
Frontend displays workflow events from AIM only. It must not call n8n directly.

---

## 10.3 `ErrorLogPanel`

### Purpose
Display error logs and recovery status.

### Endpoint
- `GET /api/error-logs`

### Fields
- error_id
- source_module
- severity
- error_code
- message
- status
- owner_role
- created_at

### Behavior
- IT Admin can drill into technical detail.
- Non-technical users see safe user message.

---

# 11. Admin Components

## 11.1 `UserManagementTable`

### Purpose
Manage users.

### Endpoints
- `GET /api/users`
- `POST /api/users`
- `PATCH /api/users/{user_id}`

### Columns
- user_id
- name
- email
- status
- roles
- last_login_at

---

## 11.2 `RolePermissionMatrix`

### Purpose
Manage role-permission assignments.

### Endpoints
- `GET /api/roles`
- `POST /api/roles/{role_id}/permissions`

### Behavior
- Permission change requires reason.
- Prevent removing last active admin authority.

---

# 12. State Components

## 12.1 `EmptyState`

### Props
- `title`
- `description`
- `primaryAction`
- `illustrationType`

### Rule
Use module-specific language. Do not imply a workflow is complete when no records exist.

## 12.2 `ErrorState`

### Props
- `title`
- `message`
- `errorCode`
- `retryAction`
- `supportAction`

### Rule
Every API error must show actionable state and avoid exposing sensitive stack trace.

## 12.3 `LoadingSkeleton`

### Props
- `variant`: page, table, form, card
- `rowCount`

---

# 13. Component Test Checklist

| Component Category | Required Tests |
|---|---|
| Layout | auth, permissions, responsive navigation |
| Data table | loading, empty, error, pagination, filters |
| Forms | required fields, invalid input, submit success, backend error |
| Approval | gate pass/fail, comment required, permission denied |
| Evidence | preview, unsupported file, link creation, checksum status |
| AI review | confidence display, correction reason, promote blocked |
| Calculation | approved formula only, evidence required, disclaimer visible |
| Report | issue blocked until gates pass, issued watermark |
| Work orders | create, update, close, evidence link |
| Audit | visible when permitted, read-only, correct entity filter |

---

# 14. Delivery Notes

## What Changed
Created a reusable component inventory aligned with AIM MVP frontend pages, OpenAPI endpoints, evidence governance, AI extraction controls, calculation rules, and audit/RBAC requirements.

## AIM / n8n Boundary Confirmation
All components call AIM backend APIs only. n8n appears only as workflow status and error logs surfaced by AIM.

## Suggested Run / Test Commands
```bash
npm run lint
npm run typecheck
npm run test:components
npm run test:rbac
npm run test:audit
npm run test:e2e
```

## Documentation Updates
If component names, props, statuses, permissions, or workflows change, update:
- `08_Frontend/page_specs.md`
- `08_Frontend/design_system.md`
- `04_API/openapi.yaml`
