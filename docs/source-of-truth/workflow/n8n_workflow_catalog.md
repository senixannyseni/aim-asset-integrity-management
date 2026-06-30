# AIM+n8n MVP Workflow Catalog

**Document path:** `05_n8n/n8n_workflow_catalog.md`  
**Version:** 1.0.0  
**Status:** Implementation-ready MVP handoff  
**Applies to:** AIM+n8n atmospheric storage tank MVP

---

## 1. Pre-Implementation Governance Check

### Assumptions

- AIM is the system of record.
- PostgreSQL stores final structured engineering data through AIM backend services only.
- Object storage stores original evidence files.
- n8n is workflow orchestration only: trigger, routing, reminder, approval routing, notification, integration, and audit/workflow event posting.
- n8n must not store final engineering data and must not write directly to PostgreSQL.
- n8n must call AIM backend APIs only.
- Every workflow must post to `/api/workflow-events`.
- Every workflow failure must post to `/api/error-logs`.
- AI extraction output must always go to extraction/staging records first, never directly to final engineering tables.
- Engineer review is mandatory before any extracted data is promoted into final engineering tables.
- AI must never approve engineering data, calculations, integrity decisions, or issued reports.
- Calculation, integrity decision, and report issue require human review/approval gates.
- Internal AIM work order is the MVP fallback before SAP/Maximo or other CMMS integration.

### Impacted Documents

- `01_PRD/AIM_MVP_PRD.md`
- `03_Database/data_dictionary.md`
- `03_Database/data_dictionary.xlsx`
- `04_API/openapi.yaml`
- `04_API/api_payload_examples/`
- `05_n8n/n8n_workflow_catalog.md`
- `05_n8n/payload_examples.json`
- `05_n8n/error_handling.md`
- `05_n8n/sla_escalation_matrix.xlsx`
- `07_Calculation/engineering_basis.md`
- `07_Calculation/calculation_validation_method.md`

### Impacted Tables

- `evidence_files`
- `evidence_links`
- `extraction_jobs`
- `extraction_fields`
- `staging_records`
- `manual_overrides`
- `data_quality_checks`
- `ndt_measurements`
- `thickness_readings`
- `calculation_runs`
- `calculation_inputs`
- `calculation_outputs`
- `integrity_decisions`
- `reports`
- `report_versions`
- `internal_work_orders`
- `workflow_events`
- `workflow_tasks`
- `notification_logs`
- `error_logs`
- `audit_logs`
- `system_settings`

### Impacted Endpoints

- `POST /api/workflow-events`
- `POST /api/error-logs`
- `POST /api/evidence-files`
- `POST /api/evidence-links`
- `POST /api/extraction-jobs`
- `GET /api/extraction-jobs/{extraction_job_id}`
- `GET /api/staging-records`
- `POST /api/extraction-fields/{extraction_field_id}/review`
- `POST /api/staging-records/{staging_record_id}/promote`
- `GET /api/calculations/{calculation_run_id}`
- `POST /api/calculations/{calculation_run_id}/approve`
- `GET /api/reports/{report_id}`
- `POST /api/reports/{report_id}/issue`
- `POST /api/work-orders`
- `GET /api/work-orders/{work_order_id}`
- `GET /api/dashboard/kpis`
- `POST /api/workflow-events/{workflow_event_id}/acknowledge`
- `GET /api/error-logs`

### Required Permissions

- `workflow_event.create`
- `workflow_event.acknowledge`
- `error_log.create`
- `evidence.create`
- `evidence.link`
- `extraction.create`
- `staging.read`
- `staging.review`
- `staging.promote`
- `calculation.read`
- `calculation.review`
- `calculation.approve`
- `report.read`
- `report.issue`
- `work_order.create`
- `dashboard.read`
- `notification.send`

### Required Audit / Workflow Events

At minimum, each workflow must create:

- `workflow.<workflow_name>.started`
- `workflow.<workflow_name>.succeeded`
- `workflow.<workflow_name>.failed`

Additional module events are listed in each workflow below.

### Required Validation Rules

- n8n may only call AIM backend API endpoints.
- n8n may not connect directly to PostgreSQL for read/write workflow operations.
- n8n may not persist final engineering data in workflow variables, local storage, or external data stores.
- All workflow payloads must include `workflow_id`, `source_system`, `n8n_execution_id` where available, and target `entity_type/entity_id`.
- All final engineering-state changes must be done by AIM backend APIs with RBAC, validation, and audit.
- Extraction and staging records must not be promoted unless human engineering review is recorded.
- Calculation approval must verify deterministic formula version, input evidence, output warnings, and disclaimer.
- Report issue must verify required data, evidence, calculation, review, and approval gates.
- Work order creation must use AIM internal work order fallback during MVP.

### Required Test Cases

- Workflow success path posts `started` and `succeeded` workflow events.
- Workflow failure path posts `failed` workflow event and creates `/api/error-logs`.
- n8n cannot directly write to PostgreSQL.
- n8n cannot call non-AIM APIs for final engineering state changes.
- AI extraction creates extraction/staging records only.
- Staging promotion fails without engineer approval and evidence linkage.
- Calculation approval fails without human review and evidence linkage.
- Report issue fails when any gate is false.
- Work order creation is internal AIM fallback with optional external CMMS reference.
- Retry policy does not duplicate approvals, promotions, report issue, or work order creation when idempotency key exists.

### Migration / Documentation Updates

- No direct database migration is required by this document.
- Backend must expose the API contracts in `04_API/openapi.yaml`.
- n8n workflow definitions must reference this catalog and payload examples.
- SLA settings should be loaded or manually mirrored from `05_n8n/sla_escalation_matrix.xlsx`.

---

## 2. Boundary Rules for n8n

| Rule | Requirement |
|---|---|
| System of record | AIM only |
| Final structured engineering data | Stored in PostgreSQL by AIM backend only |
| Original evidence files | Stored in object storage; AIM stores metadata/linkage |
| n8n role | Trigger, routing, reminder, approval routing, notification, integration, audit/workflow event |
| Direct DB writes | Forbidden |
| AI output | Extraction/staging only |
| Human review | Mandatory before promotion or approval |
| Calculation | Deterministic AIM calculation engine only |
| Report issue | Blocked unless all gates are satisfied |
| Failure handling | Every failure creates an AIM error log |

---

## 3. Workflow Catalog Summary

| Workflow ID | Workflow Name | Owner Role | Primary Trigger | Primary Outcome |
|---|---|---|---|---|
| WF-001 | File Intake | IT Admin | AIM evidence upload completed, object storage upload callback, or Inspector submits file metadata in AIM. | Evidence metadata registered in AIM and optional evidence link created. No final engineering data is written by n8n. |
| WF-002 | AI Extraction Trigger | Engineer | Evidence file verified or Inspector/Engineer requests AI extraction from AIM. | Extraction job created in AIM. AI results must land in extraction/staging tables only. |
| WF-003 | Staging Validation | Engineer | AIM extraction job completed event with extracted fields and staging records available for validation. | Staging records validated for completeness/quality flags and queued for human engineering review. |
| WF-004 | Engineer Review Reminder | Lead Engineer | Scheduled timer checks AIM for pending staging/extraction/calculation/report review items. | Review reminders sent without changing engineering data. |
| WF-005 | Approval Flow | Approver | AIM approval_requested event for asset, inspection, extraction field, or staging promotion. | Human-approved entity action recorded in AIM by backend API, with audit event generated by AIM. |
| WF-006 | Calculation Review | Lead Engineer | AIM calculation run completed or calculation review requested. | Calculation review/approval captured in AIM. Engineering review required before final use disclaimer retained. |
| WF-007 | Report Approval | Approver | AIM report generated and submitted for issue approval. | Report issued only when AIM gates and human approval are satisfied. |
| WF-008 | Action Required to Work Order | Lead Engineer | AIM integrity decision created/approved with required_action or action_required status. | Internal AIM work order created. External CMMS reference remains optional/null in MVP. |
| WF-009 | Dashboard Refresh | IT Admin | Scheduled refresh or AIM event after asset/inspection/calculation/report/work order update. | Dashboard refresh event completed. KPI source remains AIM backend; n8n stores no KPI data. |
| WF-010 | Error Queue and Recovery | IT Admin | AIM error log created, n8n workflow failure, or scheduled recovery queue check. | Error queue triaged and recovery action recorded in AIM workflow events. |

---

## 4. Workflow Details

### WF-001 — File Intake

| Attribute | Description |
|---|---|
| Workflow ID | `WF-001` |
| Workflow Name | File Intake |
| Trigger | AIM evidence upload completed, object storage upload callback, or Inspector submits file metadata in AIM. |
| Input Payload | See `05_n8n/payload_examples.json` key `file_intake` / workflow section `WF_001` |
| Owner Role | IT Admin |
| Notification Recipient | Inspector, Engineer, IT Admin on failure |

**Node Sequence**

1. Webhook Trigger / Schedule Poll
2. Validate payload shape and source_system
3. Call AIM POST /api/workflow-events with status=started
4. Call AIM POST /api/evidence-files to register metadata
5. Optional: Call AIM POST /api/evidence-links if entity context is provided
6. Call AIM POST /api/workflow-events with status=succeeded
7. Notify Inspector/Engineer

**Backend API Endpoints Called**

- `POST /api/workflow-events`
- `POST /api/evidence-files`
- `POST /api/evidence-links`
- `POST /api/error-logs`

**Success Output**

Evidence metadata registered in AIM and optional evidence link created. No final engineering data is written by n8n.

**Failure Path**

Post error to /api/error-logs, post failed workflow event to /api/workflow-events, notify IT Admin and Inspector.

**Retry Policy**

Retry transient 5xx/network errors up to 3 times with exponential backoff: 1m, 5m, 15m. Do not retry validation or permission failures without correction.

**Escalation Rule**

Escalate to IT Admin after 30 minutes unresolved; escalate to Lead Engineer if evidence blocks inspection milestone for >4 hours.

**Audit / Workflow Event**

`workflow.file_intake.started|workflow.file_intake.succeeded|workflow.file_intake.failed; evidence.file.registered; evidence.link.created`

**Implementation Notes**

- n8n must post to `/api/workflow-events` at workflow start and completion.
- n8n must post to `/api/error-logs` for every failed execution path.
- n8n must use idempotency keys for actions that could create duplicate downstream records.
- n8n must not write final engineering data directly to PostgreSQL.
- n8n must not bypass AIM RBAC, validation, audit, or approval gates.

---

### WF-002 — AI Extraction Trigger

| Attribute | Description |
|---|---|
| Workflow ID | `WF-002` |
| Workflow Name | AI Extraction Trigger |
| Trigger | Evidence file verified or Inspector/Engineer requests AI extraction from AIM. |
| Input Payload | See `05_n8n/payload_examples.json` key `ai_extraction_trigger` / workflow section `WF_002` |
| Owner Role | Engineer |
| Notification Recipient | Engineer, IT Admin |

**Node Sequence**

1. Webhook Trigger from AIM
2. Validate evidence_file_id and inspection_id
3. Post workflow started to /api/workflow-events
4. Call AIM POST /api/extraction-jobs
5. Notify Engineer that extraction job has started
6. Post workflow succeeded to /api/workflow-events

**Backend API Endpoints Called**

- `POST /api/workflow-events`
- `POST /api/extraction-jobs`
- `GET /api/extraction-jobs/{extraction_job_id}`
- `POST /api/error-logs`

**Success Output**

Extraction job created in AIM. AI results must land in extraction/staging tables only.

**Failure Path**

Create AIM error log, mark workflow failed, notify Engineer and IT Admin.

**Retry Policy**

Retry API timeout/5xx up to 2 times with 2m and 10m delay. Do not retry when evidence_file_id is missing or unverified.

**Escalation Rule**

Escalate to IT Admin after 1 hour unresolved; escalate to Lead Engineer if extraction blocks review for >1 business day.

**Audit / Workflow Event**

`workflow.ai_extraction_trigger.started|workflow.ai_extraction_trigger.succeeded|workflow.ai_extraction_trigger.failed; extraction.job.created`

**Implementation Notes**

- n8n must post to `/api/workflow-events` at workflow start and completion.
- n8n must post to `/api/error-logs` for every failed execution path.
- n8n must use idempotency keys for actions that could create duplicate downstream records.
- n8n must not write final engineering data directly to PostgreSQL.
- n8n must not bypass AIM RBAC, validation, audit, or approval gates.

---

### WF-003 — Staging Validation

| Attribute | Description |
|---|---|
| Workflow ID | `WF-003` |
| Workflow Name | Staging Validation |
| Trigger | AIM extraction job completed event with extracted fields and staging records available for validation. |
| Input Payload | See `05_n8n/payload_examples.json` key `staging_validation` / workflow section `WF_003` |
| Owner Role | Engineer |
| Notification Recipient | Engineer, Lead Engineer on escalation, IT Admin on technical failure |

**Node Sequence**

1. Webhook Trigger from AIM extraction completed event
2. Post workflow started to /api/workflow-events
3. Call AIM GET /api/extraction-jobs/{extraction_job_id}
4. Call AIM GET /api/staging-records filtered by extraction_job_id
5. Route validation results to Engineer review queue
6. Post workflow succeeded to /api/workflow-events
7. Notify Engineer of records requiring review

**Backend API Endpoints Called**

- `POST /api/workflow-events`
- `GET /api/extraction-jobs/{extraction_job_id}`
- `GET /api/staging-records`
- `POST /api/error-logs`

**Success Output**

Staging records validated for completeness/quality flags and queued for human engineering review.

**Failure Path**

Log validation orchestration error, keep staging records unpromoted, notify Engineer and IT Admin.

**Retry Policy**

Retry read/status calls up to 3 times with 5m interval. Do not promote any record during failure recovery.

**Escalation Rule**

Escalate to Engineer after 4 hours pending validation; Lead Engineer after 1 business day.

**Audit / Workflow Event**

`workflow.staging_validation.started|workflow.staging_validation.succeeded|workflow.staging_validation.failed; staging.validation.queued`

**Implementation Notes**

- n8n must post to `/api/workflow-events` at workflow start and completion.
- n8n must post to `/api/error-logs` for every failed execution path.
- n8n must use idempotency keys for actions that could create duplicate downstream records.
- n8n must not write final engineering data directly to PostgreSQL.
- n8n must not bypass AIM RBAC, validation, audit, or approval gates.

---

### WF-004 — Engineer Review Reminder

| Attribute | Description |
|---|---|
| Workflow ID | `WF-004` |
| Workflow Name | Engineer Review Reminder |
| Trigger | Scheduled timer checks AIM for pending staging/extraction/calculation/report review items. |
| Input Payload | See `05_n8n/payload_examples.json` key `engineer_review_reminder` / workflow section `WF_004` |
| Owner Role | Lead Engineer |
| Notification Recipient | Engineer, Lead Engineer, Approver on escalation |

**Node Sequence**

1. Cron Trigger
2. Post workflow started to /api/workflow-events
3. Call AIM GET /api/staging-records?status=pending_engineer_review
4. Call AIM GET /api/calculations/{calculation_run_id} for due calculation reviews when referenced
5. Send reminder notification
6. Post workflow succeeded to /api/workflow-events

**Backend API Endpoints Called**

- `POST /api/workflow-events`
- `GET /api/staging-records`
- `GET /api/calculations/{calculation_run_id}`
- `POST /api/error-logs`

**Success Output**

Review reminders sent without changing engineering data.

**Failure Path**

Log error and notify IT Admin; failed reminders do not alter review status.

**Retry Policy**

Retry failed notification once after 15m; API failures retry 3 times with 5m interval.

**Escalation Rule**

Escalate overdue review to Lead Engineer after 1 business day; Approver after 2 business days if blocking report issue.

**Audit / Workflow Event**

`workflow.engineer_review_reminder.started|workflow.engineer_review_reminder.succeeded|workflow.engineer_review_reminder.failed; notification.review_reminder.sent`

**Implementation Notes**

- n8n must post to `/api/workflow-events` at workflow start and completion.
- n8n must post to `/api/error-logs` for every failed execution path.
- n8n must use idempotency keys for actions that could create duplicate downstream records.
- n8n must not write final engineering data directly to PostgreSQL.
- n8n must not bypass AIM RBAC, validation, audit, or approval gates.

---

### WF-005 — Approval Flow

| Attribute | Description |
|---|---|
| Workflow ID | `WF-005` |
| Workflow Name | Approval Flow |
| Trigger | AIM approval_requested event for asset, inspection, extraction field, or staging promotion. |
| Input Payload | See `05_n8n/payload_examples.json` key `approval_flow` / workflow section `WF_005` |
| Owner Role | Approver |
| Notification Recipient | Lead Engineer, Approver, requester |

**Node Sequence**

1. Webhook Trigger from AIM approval request
2. Validate entity_type and permission target
3. Post workflow started to /api/workflow-events
4. Notify assigned Approver/Lead Engineer
5. Wait for AIM approval action
6. Call applicable AIM approval/review endpoint only after human action
7. Post workflow succeeded or failed to /api/workflow-events

**Backend API Endpoints Called**

- `POST /api/workflow-events`
- `POST /api/assets/{asset_id}/approve`
- `POST /api/inspections/{inspection_id}/approve`
- `POST /api/extraction-fields/{extraction_field_id}/review`
- `POST /api/staging-records/{staging_record_id}/promote`
- `POST /api/error-logs`

**Success Output**

Human-approved entity action recorded in AIM by backend API, with audit event generated by AIM.

**Failure Path**

Create error log, leave entity in previous state, notify requester and IT Admin.

**Retry Policy**

Retry notification failures 2 times. Do not retry approval API after ambiguous timeout without idempotency key check.

**Escalation Rule**

Escalate pending approval to next authority after 1 business day; block downstream report issue until approval exists.

**Audit / Workflow Event**

`workflow.approval_flow.started|workflow.approval_flow.succeeded|workflow.approval_flow.failed; approval.requested; approval.action.recorded`

**Implementation Notes**

- n8n must post to `/api/workflow-events` at workflow start and completion.
- n8n must post to `/api/error-logs` for every failed execution path.
- n8n must use idempotency keys for actions that could create duplicate downstream records.
- n8n must not write final engineering data directly to PostgreSQL.
- n8n must not bypass AIM RBAC, validation, audit, or approval gates.

---

### WF-006 — Calculation Review

| Attribute | Description |
|---|---|
| Workflow ID | `WF-006` |
| Workflow Name | Calculation Review |
| Trigger | AIM calculation run completed or calculation review requested. |
| Input Payload | See `05_n8n/payload_examples.json` key `calculation_review` / workflow section `WF_006` |
| Owner Role | Lead Engineer |
| Notification Recipient | Engineer, Lead Engineer, Approver on escalation |

**Node Sequence**

1. Webhook Trigger from AIM calculation_run completed
2. Post workflow started to /api/workflow-events
3. Call AIM GET /api/calculations/{calculation_run_id}
4. Validate presence of formula_version_id, evidence_link_id, warnings, and disclaimer
5. Notify Engineer/Lead Engineer for review
6. After human approval, call AIM POST /api/calculations/{calculation_run_id}/approve
7. Post workflow succeeded to /api/workflow-events

**Backend API Endpoints Called**

- `POST /api/workflow-events`
- `GET /api/calculations/{calculation_run_id}`
- `POST /api/calculations/{calculation_run_id}/approve`
- `POST /api/error-logs`

**Success Output**

Calculation review/approval captured in AIM. Engineering review required before final use disclaimer retained.

**Failure Path**

Log error, keep calculation unapproved, notify Lead Engineer and IT Admin.

**Retry Policy**

Retry read/status calls up to 3 times. Approval calls require idempotency key and must not be replayed blindly.

**Escalation Rule**

Escalate to Lead Engineer after 1 business day pending; Approver after 2 business days if report is blocked.

**Audit / Workflow Event**

`workflow.calculation_review.started|workflow.calculation_review.succeeded|workflow.calculation_review.failed; calculation.review.requested; calculation.approved`

**Implementation Notes**

- n8n must post to `/api/workflow-events` at workflow start and completion.
- n8n must post to `/api/error-logs` for every failed execution path.
- n8n must use idempotency keys for actions that could create duplicate downstream records.
- n8n must not write final engineering data directly to PostgreSQL.
- n8n must not bypass AIM RBAC, validation, audit, or approval gates.

---

### WF-007 — Report Approval

| Attribute | Description |
|---|---|
| Workflow ID | `WF-007` |
| Workflow Name | Report Approval |
| Trigger | AIM report generated and submitted for issue approval. |
| Input Payload | See `05_n8n/payload_examples.json` key `report_approval` / workflow section `WF_007` |
| Owner Role | Approver |
| Notification Recipient | Approver, Lead Engineer, Management on escalation |

**Node Sequence**

1. Webhook Trigger from AIM report pending issue
2. Post workflow started to /api/workflow-events
3. Call AIM GET /api/reports/{report_id}
4. Verify gate_confirmation is true for required data, calculation, review, evidence, and approval
5. Notify Approver
6. After human approval, call AIM POST /api/reports/{report_id}/issue
7. Post workflow succeeded to /api/workflow-events

**Backend API Endpoints Called**

- `POST /api/workflow-events`
- `GET /api/reports/{report_id}`
- `POST /api/reports/{report_id}/issue`
- `POST /api/error-logs`

**Success Output**

Report issued only when AIM gates and human approval are satisfied.

**Failure Path**

Log error or gate failure, keep report unissued, notify Approver and Lead Engineer.

**Retry Policy**

Retry report read calls 3 times. Do not retry report issue after ambiguous timeout without checking report status in AIM.

**Escalation Rule**

Escalate unissued approved reports to Management after 2 business days; technical failures to IT Admin immediately.

**Audit / Workflow Event**

`workflow.report_approval.started|workflow.report_approval.succeeded|workflow.report_approval.failed; report.issue.requested; report.issued|report.issue.blocked`

**Implementation Notes**

- n8n must post to `/api/workflow-events` at workflow start and completion.
- n8n must post to `/api/error-logs` for every failed execution path.
- n8n must use idempotency keys for actions that could create duplicate downstream records.
- n8n must not write final engineering data directly to PostgreSQL.
- n8n must not bypass AIM RBAC, validation, audit, or approval gates.

---

### WF-008 — Action Required to Work Order

| Attribute | Description |
|---|---|
| Workflow ID | `WF-008` |
| Workflow Name | Action Required to Work Order |
| Trigger | AIM integrity decision created/approved with required_action or action_required status. |
| Input Payload | See `05_n8n/payload_examples.json` key `action_required_to_work_order` / workflow section `WF_008` |
| Owner Role | Lead Engineer |
| Notification Recipient | Inspector, Engineer, Lead Engineer, IT Admin on failure |

**Node Sequence**

1. Webhook Trigger from AIM integrity decision event
2. Post workflow started to /api/workflow-events
3. Validate decision_id, asset_id, inspection_id, evidence_link_id, and required_action
4. Call AIM POST /api/work-orders for internal work order fallback
5. Notify assigned Inspector/Engineer
6. Post workflow succeeded to /api/workflow-events

**Backend API Endpoints Called**

- `POST /api/workflow-events`
- `POST /api/work-orders`
- `GET /api/work-orders/{work_order_id}`
- `POST /api/error-logs`

**Success Output**

Internal AIM work order created. External CMMS reference remains optional/null in MVP.

**Failure Path**

Log error, notify Lead Engineer and IT Admin, keep decision action unresolved.

**Retry Policy**

Retry work order creation only with idempotency key. Network/5xx retry 3 times with 5m, 15m, 30m delay.

**Escalation Rule**

Escalate high priority work order creation failures after 1 hour; critical after 15 minutes.

**Audit / Workflow Event**

`workflow.work_order_create.started|workflow.work_order_create.succeeded|workflow.work_order_create.failed; work_order.created`

**Implementation Notes**

- n8n must post to `/api/workflow-events` at workflow start and completion.
- n8n must post to `/api/error-logs` for every failed execution path.
- n8n must use idempotency keys for actions that could create duplicate downstream records.
- n8n must not write final engineering data directly to PostgreSQL.
- n8n must not bypass AIM RBAC, validation, audit, or approval gates.

---

### WF-009 — Dashboard Refresh

| Attribute | Description |
|---|---|
| Workflow ID | `WF-009` |
| Workflow Name | Dashboard Refresh |
| Trigger | Scheduled refresh or AIM event after asset/inspection/calculation/report/work order update. |
| Input Payload | See `05_n8n/payload_examples.json` key `dashboard_refresh` / workflow section `WF_009` |
| Owner Role | IT Admin |
| Notification Recipient | IT Admin; Management only for KPI breach |

**Node Sequence**

1. Cron or AIM event trigger
2. Post workflow started to /api/workflow-events
3. Call AIM GET /api/dashboard/kpis
4. Notify Management only if KPI threshold breach exists
5. Post workflow succeeded to /api/workflow-events

**Backend API Endpoints Called**

- `POST /api/workflow-events`
- `GET /api/dashboard/kpis`
- `POST /api/error-logs`

**Success Output**

Dashboard refresh event completed. KPI source remains AIM backend; n8n stores no KPI data.

**Failure Path**

Log error and notify IT Admin; dashboard remains based on last AIM-computed state.

**Retry Policy**

Retry GET KPI call up to 3 times with 5m interval.

**Escalation Rule**

Escalate recurring dashboard refresh failures after 3 failed runs or 4 hours.

**Audit / Workflow Event**

`workflow.dashboard_refresh.started|workflow.dashboard_refresh.succeeded|workflow.dashboard_refresh.failed; dashboard.refresh.requested`

**Implementation Notes**

- n8n must post to `/api/workflow-events` at workflow start and completion.
- n8n must post to `/api/error-logs` for every failed execution path.
- n8n must use idempotency keys for actions that could create duplicate downstream records.
- n8n must not write final engineering data directly to PostgreSQL.
- n8n must not bypass AIM RBAC, validation, audit, or approval gates.

---

### WF-010 — Error Queue and Recovery

| Attribute | Description |
|---|---|
| Workflow ID | `WF-010` |
| Workflow Name | Error Queue and Recovery |
| Trigger | AIM error log created, n8n workflow failure, or scheduled recovery queue check. |
| Input Payload | See `05_n8n/payload_examples.json` key `error_queue_recovery` / workflow section `WF_010` |
| Owner Role | IT Admin |
| Notification Recipient | IT Admin, owner role, Lead Engineer for critical engineering blockers |

**Node Sequence**

1. Error Trigger / Cron Trigger
2. Post workflow started to /api/workflow-events
3. Call AIM GET /api/error-logs filtered by unresolved status/severity
4. Classify retryable vs non-retryable based on diagnostics_json.safe_to_retry
5. For retryable cases, re-run orchestration step through AIM API only
6. Call AIM POST /api/workflow-events/{workflow_event_id}/acknowledge when recovery action is accepted
7. Notify IT Admin and owner role
8. Post workflow succeeded/failed to /api/workflow-events

**Backend API Endpoints Called**

- `POST /api/workflow-events`
- `GET /api/error-logs`
- `POST /api/workflow-events/{workflow_event_id}/acknowledge`
- `POST /api/error-logs`

**Success Output**

Error queue triaged and recovery action recorded in AIM workflow events.

**Failure Path**

Create secondary error log with parent_error_log_id, notify IT Admin immediately.

**Retry Policy**

Retry recovery workflow once automatically for safe_to_retry=true; manual IT Admin intervention for repeated or non-retryable failures.

**Escalation Rule**

Critical errors escalate immediately to IT Admin and Lead Engineer; unresolved high severity after 2 hours to Management.

**Audit / Workflow Event**

`workflow.error_recovery.started|workflow.error_recovery.succeeded|workflow.error_recovery.failed; error.triaged; workflow_event.acknowledged`

**Implementation Notes**

- n8n must post to `/api/workflow-events` at workflow start and completion.
- n8n must post to `/api/error-logs` for every failed execution path.
- n8n must use idempotency keys for actions that could create duplicate downstream records.
- n8n must not write final engineering data directly to PostgreSQL.
- n8n must not bypass AIM RBAC, validation, audit, or approval gates.

---

## 5. Developer Handoff Notes

### Required n8n Global Credentials

- AIM backend base URL.
- AIM service account token with least-privilege workflow permissions.
- Notification provider credentials, if notifications are externalized.
- No PostgreSQL credential should be configured in n8n for MVP engineering workflows.
- No object storage write credential should be used by n8n unless the integration is strictly for presigned upload routing and not final engineering data storage.

### Required n8n Environment Variables

```bash
AIM_API_BASE_URL=https://aim.example.com
AIM_WORKFLOW_SERVICE_TOKEN=<secret>
N8N_ENVIRONMENT=mvp
N8N_RETRY_MAX=3
N8N_DEFAULT_TIMEZONE=Asia/Jakarta
```

### Idempotency Key Pattern

```text
<workflow_id>-<n8n_execution_id>-<entity_type>-<entity_id>-<yyyyMMddHHmmss>
```

### Minimum Workflow Event Payload

```json
{
  "source_system": "n8n",
  "event_type": "workflow.<name>.<status>",
  "entity_type": "<entity_type>",
  "entity_id": "<entity_id>",
  "payload_json": {
    "workflow_id": "WF-XXX",
    "workflow_name": "<name>",
    "boundary_note": "n8n orchestrates only and AIM remains system of record."
  },
  "n8n_execution_id": "<execution_id>"
}
```

### Minimum Error Log Payload

```json
{
  "source_system": "n8n",
  "severity": "high",
  "error_code": "N8N_WORKFLOW_FAILURE",
  "error_message": "Workflow failed before successful AIM API completion.",
  "entity_type": "workflow_event",
  "entity_id": "pending",
  "request_id": "req_<n8n_execution_id>",
  "diagnostics_json": {
    "workflow_id": "WF-XXX",
    "node_name": "<node>",
    "safe_to_retry": true
  }
}
```

---

## 6. Delivery Notes

### What Changed

This document defines ten MVP n8n workflows, endpoint calls, success paths, failure paths, retry logic, escalation rules, recipients, owner roles, and workflow/audit events.

### AIM / n8n Boundary Confirmation

AIM remains the system of record. n8n only orchestrates workflow and must call AIM backend APIs. n8n must never write final engineering data directly to PostgreSQL.

### Run / Test Commands

```bash
npm run test:workflow
npm run test:api
npm run test:rbac
npm run test:audit
```

For n8n workflow JSON validation after export:

```bash
n8n export:workflow --all --output=./05_n8n/exports/
n8n execute --id=<workflow_id>
```

### Documentation Updates

- Update this catalog when an endpoint, workflow step, permission, retry rule, or escalation rule changes.
- Update `05_n8n/payload_examples.json` when workflow payloads change.
- Update `05_n8n/sla_escalation_matrix.xlsx` when operational SLA changes.
