# AIM Phase 2.0 UAT Scripts

**Sprint:** Phase 2.0 — MVP Release Readiness Pack  
**Purpose:** Execute controlled UAT for the Phase 1 Governance Closure baseline.  
**Audience:** UAT Lead, Developer, IT Admin, Inspector, Engineer, Lead Engineer, Approver, Management.  
**Dataset:** Use synthetic sample data only. Do not use real client, plant, inspection, credential, object-storage, or evidence data.

## Phase 2.0 Required UAT Coverage Index

This UAT pack covers the required controlled end-to-end AIM MVP journey:

- Authentication and RBAC
- Asset and inspection setup
- Evidence governance
- AI extraction and staging
- Human review and manual override
- NDT / reviewed measurement path
- Calculation governance
- Integrity decision
- Report approval and issue gates
- Internal work order fallback
- n8n workflow/error boundary
- Audit verification

## 0. UAT Governance Rules

These scripts must preserve the AIM source-of-truth rules:

- AIM is the system of record.
- PostgreSQL stores final structured engineering data.
- Object storage stores original evidence files.
- n8n is orchestration only and must call AIM backend APIs only.
- n8n must not write directly to PostgreSQL.
- AI output is extraction/staging assistance only.
- AI must not approve, promote, issue, close, or finalize engineering data.
- Engineer review is mandatory before promotion.
- Calculations require an explicit approved formula version.
- Calculation output must retain: **Engineering review required before final use.**
- Evidence linkage is mandatory for findings, NDT measurements, calculations, integrity decisions, reports, manual overrides, and work orders where applicable.
- Report issue is blocked until required gates pass.
- Internal work order is the MVP fallback before external CMMS integration.
- Every approval, rejection, correction, calculation, report issue, work order action, workflow failure, and evidence action must be auditable.

## 1. Standard UAT Case Format

Each UAT case below follows this format:

| Field | Description |
|---|---|
| UAT Case ID | Unique UAT identifier. |
| Source Requirement | Source-of-truth rule or Phase 1 closure requirement. |
| Role | Role executing the test. |
| Preconditions | Required records, users, permissions, and system state. |
| Test Data | Synthetic data reference from `docs/sample_data/sample_dataset_manifest.md`. |
| Steps | Ordered actions. |
| API Endpoint / UI Reference | Backend route or future UI/page reference. |
| Expected Result | Required system outcome. |
| Expected Audit Event | Audit action expected in `audit_logs`. |
| Expected Workflow/Error Event | Workflow event or error log expected where applicable. |
| Pass/Fail | UAT tester fills manually. |
| Evidence/Screenshot | Tester attaches screenshot, request/response, SQL proof, or log reference. |
| Reviewer/Sign-off | Role/name/date. |

## 2. UAT Cases

### UAT-AUTH-001 — Login with Valid User

| Field | Value |
|---|---|
| UAT Case ID | UAT-AUTH-001 |
| Source Requirement | JWT/session auth skeleton; backend RBAC required. |
| Role | Admin, Engineer, Approver, IT Admin |
| Preconditions | User exists and is active. |
| Test Data | `admin.uat@example.test`, `engineer.uat@example.test`, `approver.uat@example.test`. |
| Steps | 1. Submit valid credentials. 2. Store returned access token/session metadata. 3. Confirm no password is returned. |
| API Endpoint / UI Reference | `POST /api/v1/auth/login`; future `/login`. |
| Expected Result | Login succeeds and token/session metadata is returned. |
| Expected Audit Event | `auth.login_success` or equivalent login audit signal. |
| Expected Workflow/Error Event | None unless login fails. |
| Pass/Fail |  |
| Evidence/Screenshot |  |
| Reviewer/Sign-off |  |

### UAT-AUTH-002 — Logout Invalidates Session

| Field | Value |
|---|---|
| UAT Case ID | UAT-AUTH-002 |
| Source Requirement | JWT/session auth skeleton. |
| Role | Any authenticated role |
| Preconditions | Valid login session. |
| Test Data | Any UAT user. |
| Steps | 1. Call logout. 2. Retry protected route with old token/session. |
| API Endpoint / UI Reference | `POST /api/v1/auth/logout`; future top-bar logout. |
| Expected Result | Logout succeeds; old session/token is invalidated where supported. |
| Expected Audit Event | `auth.logout`. |
| Expected Workflow/Error Event | None. |
| Pass/Fail |  |
| Evidence/Screenshot |  |
| Reviewer/Sign-off |  |

### UAT-AUTH-003 — Refresh and Me Endpoint

| Field | Value |
|---|---|
| UAT Case ID | UAT-AUTH-003 |
| Source Requirement | `/auth/refresh` and `/auth/me` must exist. |
| Role | Any authenticated role |
| Preconditions | Valid access/refresh token or session. |
| Test Data | Any UAT user. |
| Steps | 1. Call `/auth/me`. 2. Confirm user, roles, and permissions. 3. Call refresh endpoint where supported. |
| API Endpoint / UI Reference | `GET /api/v1/auth/me`, `POST /api/v1/auth/refresh`. |
| Expected Result | Current user context is returned from backend; permissions match seed/RBAC. |
| Expected Audit Event | Refresh audit event where implemented; read-only `/me` may not audit. |
| Expected Workflow/Error Event | None. |
| Pass/Fail |  |
| Evidence/Screenshot |  |
| Reviewer/Sign-off |  |

### UAT-AUTH-004 — Unauthenticated Request Blocked

| Field | Value |
|---|---|
| UAT Case ID | UAT-AUTH-004 |
| Source Requirement | Authentication required for protected routes. |
| Role | Anonymous |
| Preconditions | No token/session. |
| Test Data | Any protected API route. |
| Steps | 1. Call a protected route without token. |
| API Endpoint / UI Reference | Example: `GET /api/v1/assets`. |
| Expected Result | Request is blocked with `401` or equivalent unauthenticated response. |
| Expected Audit Event | Security denial audit where configured. |
| Expected Workflow/Error Event | None. |
| Pass/Fail |  |
| Evidence/Screenshot |  |
| Reviewer/Sign-off |  |

### UAT-AUTH-005 — Authenticated but Unauthorized Action Blocked

| Field | Value |
|---|---|
| UAT Case ID | UAT-AUTH-005 |
| Source Requirement | RBAC on every protected action. |
| Role | Inspector or Management/read-only |
| Preconditions | User authenticated without approval/issue permission. |
| Test Data | Approved report candidate. |
| Steps | 1. Attempt report issue or calculation approval. |
| API Endpoint / UI Reference | `POST /api/v1/reports/{reportId}/issue` or approval endpoint. |
| Expected Result | Request is blocked with `403` or equivalent permission error. |
| Expected Audit Event | Security/permission denial audit where configured. |
| Expected Workflow/Error Event | None. |
| Pass/Fail |  |
| Evidence/Screenshot |  |
| Reviewer/Sign-off |  |

### UAT-AUTH-006 — Demo/Local Auth Boundary

| Field | Value |
|---|---|
| UAT Case ID | UAT-AUTH-006 |
| Source Requirement | Demo header auth allowed only under `NODE_ENV=test/local/development`. |
| Role | IT Admin |
| Preconditions | Environment can be checked. |
| Test Data | Local env and non-local env configuration. |
| Steps | 1. Confirm demo auth works only in local/test if enabled. 2. Confirm production-like env disables demo auth. |
| API Endpoint / UI Reference | Request context middleware; future admin security page. |
| Expected Result | Demo/local auth cannot be used outside local-like environment. |
| Expected Audit Event | Security boundary audit where configured. |
| Expected Workflow/Error Event | Error log if unsafe demo auth is attempted in production-like mode. |
| Pass/Fail |  |
| Evidence/Screenshot |  |
| Reviewer/Sign-off |  |

### UAT-ASSET-001 — Create Atmospheric Storage Tank Asset

| Field | Value |
|---|---|
| UAT Case ID | UAT-ASSET-001 |
| Source Requirement | MVP supports atmospheric storage tank asset register. |
| Role | Admin or Engineer |
| Preconditions | User has `asset.create`. |
| Test Data | Asset `AIM-UAT-T-001`. |
| Steps | 1. Create asset. 2. Confirm asset type is `atmospheric_storage_tank`. 3. Retrieve asset detail. |
| API Endpoint / UI Reference | `POST /api/v1/assets`, `GET /api/v1/assets/{assetId}`; future `/assets`. |
| Expected Result | Asset is created in AIM/PostgreSQL, not n8n. |
| Expected Audit Event | `asset.created`. |
| Expected Workflow/Error Event | Optional workflow event for downstream notification only. |
| Pass/Fail |  |
| Evidence/Screenshot |  |
| Reviewer/Sign-off |  |

### UAT-ASSET-002 — Create Inspection Workspace

| Field | Value |
|---|---|
| UAT Case ID | UAT-ASSET-002 |
| Source Requirement | Inspection workspace required for evidence/extraction/calculation journey. |
| Role | Inspector or Engineer |
| Preconditions | Asset exists. |
| Test Data | Inspection `AIM-UAT-INS-001`. |
| Steps | 1. Create inspection. 2. Link to asset. 3. Confirm status and audit. |
| API Endpoint / UI Reference | `POST /api/v1/inspections`; future `/inspections`. |
| Expected Result | Inspection workspace exists and is linked to tank asset. |
| Expected Audit Event | `inspection.created`. |
| Expected Workflow/Error Event | Optional workflow started/notification event only. |
| Pass/Fail |  |
| Evidence/Screenshot |  |
| Reviewer/Sign-off |  |

### UAT-EVID-001 — Register Evidence Metadata

| Field | Value |
|---|---|
| UAT Case ID | UAT-EVID-001 |
| Source Requirement | Object storage stores original file; AIM stores metadata. |
| Role | Inspector or Engineer |
| Preconditions | Asset and inspection exist. |
| Test Data | `AIM-UAT-T-001_UT_SHELL_COURSE_1.pdf`. |
| Steps | 1. Submit evidence metadata after storage upload placeholder. 2. Include checksum, MIME, size, extension, asset, inspection. |
| API Endpoint / UI Reference | `POST /api/v1/evidence-files`; future `/evidence`. |
| Expected Result | Evidence metadata record is created; binary is not stored in PostgreSQL. |
| Expected Audit Event | `evidence.uploaded` or `evidence.metadata.created`. |
| Expected Workflow/Error Event | Workflow event if file intake workflow used. |
| Pass/Fail |  |
| Evidence/Screenshot |  |
| Reviewer/Sign-off |  |

### UAT-EVID-002 — Evidence Validation Rejects Unsupported File Type

| Field | Value |
|---|---|
| UAT Case ID | UAT-EVID-002 |
| Source Requirement | Extension/MIME/size/checksum validation. |
| Role | Inspector |
| Preconditions | Evidence upload endpoint available. |
| Test Data | Unsupported extension `.exe` or MIME mismatch. |
| Steps | 1. Submit unsupported metadata. 2. Confirm rejection. |
| API Endpoint / UI Reference | `POST /api/v1/evidence-files`. |
| Expected Result | Upload/metadata registration is rejected. |
| Expected Audit Event | `evidence.upload_rejected` or equivalent. |
| Expected Workflow/Error Event | `error_logs` record for unsupported type when applicable. |
| Pass/Fail |  |
| Evidence/Screenshot |  |
| Reviewer/Sign-off |  |

### UAT-EVID-003 — Signed Download URL and Access Audit

| Field | Value |
|---|---|
| UAT Case ID | UAT-EVID-003 |
| Source Requirement | Signed URL endpoint and evidence access/download audit. |
| Role | Engineer |
| Preconditions | Evidence metadata exists and user has evidence read/download permission. |
| Test Data | Synthetic evidence file metadata. |
| Steps | 1. Request download/signed URL. 2. Confirm expiry metadata. 3. Confirm audit row. |
| API Endpoint / UI Reference | `GET /api/v1/evidence/{evidenceId}/download-url` or equivalent route. |
| Expected Result | Short-lived URL or placeholder signed URL metadata is returned. |
| Expected Audit Event | `EVIDENCE_SIGNED_URL_CREATED` or evidence access audit. |
| Expected Workflow/Error Event | None. |
| Pass/Fail |  |
| Evidence/Screenshot |  |
| Reviewer/Sign-off |  |

### UAT-EVID-004 — Linked Evidence Deletion Blocked

| Field | Value |
|---|---|
| UAT Case ID | UAT-EVID-004 |
| Source Requirement | Block deletion of linked evidence. |
| Role | Engineer or IT Admin |
| Preconditions | Evidence is linked to calculation/report/decision. |
| Test Data | Evidence link `EVL-UAT-001`. |
| Steps | 1. Attempt delete on linked evidence. |
| API Endpoint / UI Reference | Evidence delete/request endpoint if available. |
| Expected Result | Deletion is blocked or routed to controlled delete-request flow. |
| Expected Audit Event | `evidence.delete_blocked` or equivalent. |
| Expected Workflow/Error Event | Error log if blocking condition is recorded there. |
| Pass/Fail |  |
| Evidence/Screenshot |  |
| Reviewer/Sign-off |  |

### UAT-EVID-005 — Malware Scan Placeholder Status

| Field | Value |
|---|---|
| UAT Case ID | UAT-EVID-005 |
| Source Requirement | Malware scan placeholder status visible/recorded. |
| Role | IT Admin |
| Preconditions | Evidence metadata exists. |
| Test Data | Synthetic evidence metadata. |
| Steps | 1. Inspect evidence metadata. 2. Confirm malware scan placeholder/status field exists or is logged as pending/not_configured. |
| API Endpoint / UI Reference | `GET /api/v1/evidence-files`. |
| Expected Result | Malware scan status is represented and does not imply production scanner unless configured. |
| Expected Audit Event | Evidence security validation audit where configured. |
| Expected Workflow/Error Event | None unless scan fails. |
| Pass/Fail |  |
| Evidence/Screenshot |  |
| Reviewer/Sign-off |  |

### UAT-AI-001 — Create Extraction Job

| Field | Value |
|---|---|
| UAT Case ID | UAT-AI-001 |
| Source Requirement | AI extraction creates extraction/staging records only. |
| Role | Inspector or Engineer |
| Preconditions | Verified evidence exists. |
| Test Data | Evidence `EVD-UAT-001`. |
| Steps | 1. Create extraction job. 2. Confirm job references evidence and inspection. |
| API Endpoint / UI Reference | `POST /api/v1/extraction-jobs`; future `/ai-extraction`. |
| Expected Result | Extraction job is created in AIM. |
| Expected Audit Event | `extraction_job.created`. |
| Expected Workflow/Error Event | `workflow.ai_extraction_trigger.started/succeeded` if n8n workflow used. |
| Pass/Fail |  |
| Evidence/Screenshot |  |
| Reviewer/Sign-off |  |

### UAT-AI-002 — AI Output Remains Staging Only

| Field | Value |
|---|---|
| UAT Case ID | UAT-AI-002 |
| Source Requirement | AI must not write final engineering tables directly. |
| Role | IT Admin or Engineer |
| Preconditions | Extraction job has fields/staging records. |
| Test Data | Extraction fields: high confidence, low confidence, missing evidence, unit mismatch. |
| Steps | 1. Inspect extraction/staging records. 2. Verify final NDT/calculation/finding tables are not directly updated by AI. |
| API Endpoint / UI Reference | `GET /api/v1/extraction-jobs/{id}`, staging endpoints. |
| Expected Result | AI output exists only in `extraction_fields` and `staging_records` before review. |
| Expected Audit Event | `extraction_field.created`, `staging_record.created`. |
| Expected Workflow/Error Event | Workflow extraction success or validation warning event. |
| Pass/Fail |  |
| Evidence/Screenshot |  |
| Reviewer/Sign-off |  |

### UAT-AI-003 — Low Confidence and Missing Evidence Routed to Review

| Field | Value |
|---|---|
| UAT Case ID | UAT-AI-003 |
| Source Requirement | Confidence is triage only; missing evidence blocks promotion. |
| Role | Engineer |
| Preconditions | Extraction fields have confidence scores/flags. |
| Test Data | Low confidence field `<0.75`; missing evidence reference field. |
| Steps | 1. Review field statuses. 2. Attempt promotion before review/evidence link. |
| API Endpoint / UI Reference | Extraction field review and staging promote endpoints. |
| Expected Result | Low confidence requires review; missing evidence blocks promotion. |
| Expected Audit Event | `extraction_field.flagged`, `data_quality_check.failed`. |
| Expected Workflow/Error Event | Error log or workflow event for validation failure where applicable. |
| Pass/Fail |  |
| Evidence/Screenshot |  |
| Reviewer/Sign-off |  |

### UAT-AI-004 — AI Cannot Approve, Promote, or Finalize

| Field | Value |
|---|---|
| UAT Case ID | UAT-AI-004 |
| Source Requirement | AI must never approve engineering data or final actions. |
| Role | `ai_agent` service user |
| Preconditions | AI/service user exists with restricted permissions. |
| Test Data | Pending extraction field, staging record, report. |
| Steps | 1. Attempt approve/correct/promote/report issue. |
| API Endpoint / UI Reference | Review/promote/report endpoints. |
| Expected Result | Requests are blocked. |
| Expected Audit Event | Security policy violation or denied action audit where configured. |
| Expected Workflow/Error Event | Error log for AI attempted approval/decision if payload violates governance. |
| Pass/Fail |  |
| Evidence/Screenshot |  |
| Reviewer/Sign-off |  |

### UAT-REVIEW-001 — Engineer Approves Extracted Field

| Field | Value |
|---|---|
| UAT Case ID | UAT-REVIEW-001 |
| Source Requirement | Engineer review mandatory before promotion. |
| Role | Engineer |
| Preconditions | Extraction field has evidence link and acceptable validation. |
| Test Data | High-confidence field with source page/table reference. |
| Steps | 1. Compare field against evidence. 2. Approve field. |
| API Endpoint / UI Reference | `POST /api/v1/extraction-fields/{id}/review`. |
| Expected Result | Field status becomes approved by engineer or equivalent. |
| Expected Audit Event | `extraction_field.approved_by_engineer`. |
| Expected Workflow/Error Event | None. |
| Pass/Fail |  |
| Evidence/Screenshot |  |
| Reviewer/Sign-off |  |

### UAT-REVIEW-002 — Engineer Corrects Field with Manual Override Reason

| Field | Value |
|---|---|
| UAT Case ID | UAT-REVIEW-002 |
| Source Requirement | Manual correction requires reason and manual_overrides. |
| Role | Engineer |
| Preconditions | Extraction field is wrong but evidence supports correction. |
| Test Data | Original value `7.20`, corrected value `7.80`, reason `evidence_table_value`. |
| Steps | 1. Correct field. 2. Provide reason and evidence reference. 3. Inspect manual override. |
| API Endpoint / UI Reference | Extraction field review/correct endpoint. |
| Expected Result | Corrected status is recorded; original AI value remains immutable; `manual_overrides` record exists. |
| Expected Audit Event | `manual_override.created`. |
| Expected Workflow/Error Event | None. |
| Pass/Fail |  |
| Evidence/Screenshot |  |
| Reviewer/Sign-off |  |

### UAT-REVIEW-003 — Rejection Requires Reason

| Field | Value |
|---|---|
| UAT Case ID | UAT-REVIEW-003 |
| Source Requirement | Rejection requires comment/reason. |
| Role | Engineer |
| Preconditions | Extraction field cannot be trusted. |
| Test Data | Mismatched asset tag or unsupported source field. |
| Steps | 1. Attempt reject without reason. 2. Confirm block. 3. Reject with reason. |
| API Endpoint / UI Reference | Extraction field review endpoint. |
| Expected Result | Rejection without reason is blocked; rejection with reason succeeds. |
| Expected Audit Event | `extraction_field.rejected_by_engineer`. |
| Expected Workflow/Error Event | Error log for invalid request if applicable. |
| Pass/Fail |  |
| Evidence/Screenshot |  |
| Reviewer/Sign-off |  |

### UAT-REVIEW-004 — Staging Promotion Requires Reviewed Fields and Evidence

| Field | Value |
|---|---|
| UAT Case ID | UAT-REVIEW-004 |
| Source Requirement | Promotion only after human review and evidence linkage. |
| Role | Engineer or Lead Engineer |
| Preconditions | Staging record exists with approved/corrected fields. |
| Test Data | Staging record `STG-UAT-001`. |
| Steps | 1. Attempt promote before all gates. 2. Resolve review/evidence gates. 3. Promote. |
| API Endpoint / UI Reference | `POST /api/v1/staging-records/{id}/promote`. |
| Expected Result | Promotion blocked until fields and evidence gates pass; final promotion is audited. |
| Expected Audit Event | `staging_record.promoted`. |
| Expected Workflow/Error Event | Error log/workflow event if blocked. |
| Pass/Fail |  |
| Evidence/Screenshot |  |
| Reviewer/Sign-off |  |

### UAT-NDT-001 — Reviewed NDT/UT Path Requires Evidence

| Field | Value |
|---|---|
| UAT Case ID | UAT-NDT-001 |
| Source Requirement | NDT measurements require evidence linkage and review before final use. |
| Role | Inspector or Engineer |
| Preconditions | Asset, inspection, evidence exist. |
| Test Data | UT measurement placeholder for Shell Course 1. |
| Steps | 1. Create/import NDT/UT sample if API supports it. 2. Confirm evidence link. 3. Attempt use without evidence/review. |
| API Endpoint / UI Reference | `POST /api/v1/ndt/measurements` or current NDT route; future `/ndt`. |
| Expected Result | Reviewed/evidence-linked data can proceed; missing review/evidence is blocked for final use. |
| Expected Audit Event | `ndt.measurement.created`, `ndt.measurement.reviewed` where applicable. |
| Expected Workflow/Error Event | Error log for missing evidence if applicable. |
| Pass/Fail |  |
| Evidence/Screenshot |  |
| Reviewer/Sign-off |  |

### UAT-CALC-001 — Calculation Requires Explicit Approved Formula Version

| Field | Value |
|---|---|
| UAT Case ID | UAT-CALC-001 |
| Source Requirement | Explicit approved formula version; no silent default. |
| Role | Engineer |
| Preconditions | Approved formula version fixture exists. |
| Test Data | Formula version from registry/test fixture. |
| Steps | 1. Run calculation without formula version. 2. Run with draft/unapproved version. 3. Run with approved version. |
| API Endpoint / UI Reference | `POST /api/v1/calculations/run`; future `/calculations`. |
| Expected Result | Missing/unapproved version blocked; approved explicit version runs. |
| Expected Audit Event | `CALCULATION_INPUT_REJECTED` for blocked; `CALCULATION_RUN_CREATED` for successful run. |
| Expected Workflow/Error Event | Error log for blocked validation where implemented. |
| Pass/Fail |  |
| Evidence/Screenshot |  |
| Reviewer/Sign-off |  |

### UAT-CALC-002 — Calculation Snapshots, Warning, Disclaimer, Evidence Link

| Field | Value |
|---|---|
| UAT Case ID | UAT-CALC-002 |
| Source Requirement | Deterministic, versioned, auditable calculation. |
| Role | Engineer |
| Preconditions | Reviewed input data and evidence link exist. |
| Test Data | Normal corrosion rate case. |
| Steps | 1. Run calculation. 2. Retrieve calculation run. 3. Verify formula/input/output snapshots, warning fields, evidence links, disclaimer. |
| API Endpoint / UI Reference | `POST /api/v1/calculations/run`, `GET /api/v1/calculations/{id}`. |
| Expected Result | Snapshots are persisted and disclaimer says `Engineering review required before final use.` |
| Expected Audit Event | `CALCULATION_RUN_CREATED`, warning audit if warnings exist. |
| Expected Workflow/Error Event | Optional review notification event only. |
| Pass/Fail |  |
| Evidence/Screenshot |  |
| Reviewer/Sign-off |  |

### UAT-CALC-003 — Calculation Workbook Edge Cases

| Field | Value |
|---|---|
| UAT Case ID | UAT-CALC-003 |
| Source Requirement | Validation workbook cases remain covered. |
| Role | Engineer or Lead Engineer |
| Preconditions | Calculation engine available. |
| Test Data | Zero corrosion rate, negative corrosion rate, missing previous thickness, missing evidence, unit mismatch. |
| Steps | 1. Execute each validation fixture. 2. Confirm warning/block behavior. |
| API Endpoint / UI Reference | Calculation engine tests/API. |
| Expected Result | Zero corrosion rate avoids divide-by-zero; negative rate warns; missing previous thickness is incomplete; missing evidence/unit mismatch block final use. |
| Expected Audit Event | Calculation warning/rejection events where persisted. |
| Expected Workflow/Error Event | Error logs for invalid final-use attempts where applicable. |
| Pass/Fail |  |
| Evidence/Screenshot |  |
| Reviewer/Sign-off |  |

### UAT-DEC-001 — Create Draft Integrity Decision

| Field | Value |
|---|---|
| UAT Case ID | UAT-DEC-001 |
| Source Requirement | Integrity decisions are human engineering decisions. |
| Role | Engineer |
| Preconditions | Reviewed calculation output and evidence exist. |
| Test Data | Decision `DEC-UAT-001`. |
| Steps | 1. Create draft decision referencing calculation. 2. Link evidence directly to the created integrity decision before approval. |
| API Endpoint / UI Reference | `POST /api/v1/integrity-decisions`; future `/integrity-decisions`. |
| Expected Result | Draft decision is created and not final until authorized approval. |
| Expected Audit Event | `INTEGRITY_DECISION_CREATED`. |
| Expected Workflow/Error Event | Optional approval requested event only. |
| Pass/Fail |  |
| Evidence/Screenshot |  |
| Reviewer/Sign-off |  |

### UAT-DEC-002 — Decision Approval Requires Human Authorized Actor and Comment

| Field | Value |
|---|---|
| UAT Case ID | UAT-DEC-002 |
| Source Requirement | AI/n8n cannot approve; comments required; SoD applies. |
| Role | Lead Engineer or Approver |
| Preconditions | Draft decision exists and has direct linked evidence. |
| Test Data | Decision `DEC-UAT-001`. |
| Steps | 1. Attempt approval as ai_agent/n8n_service. 2. Attempt approval without direct evidence link. 3. Attempt human approval without comment. 4. Link direct evidence and approve with comment. |
| API Endpoint / UI Reference | Integrity decision approval endpoint. |
| Expected Result | Service/no-evidence/no-comment attempts are blocked; authorized human approval with direct evidence and comment succeeds. |
| Expected Audit Event | `INTEGRITY_DECISION_APPROVED` or `INTEGRITY_DECISION_APPROVAL_BLOCKED`. |
| Expected Workflow/Error Event | Error log for blocked policy violation where applicable. |
| Pass/Fail |  |
| Evidence/Screenshot |  |
| Reviewer/Sign-off |  |

### UAT-REPORT-001 — Report Issue Blocked Until Gates Pass

| Field | Value |
|---|---|
| UAT Case ID | UAT-REPORT-001 |
| Source Requirement | Reports cannot be issued unless data, calculation, review, evidence, and approval gates pass. |
| Role | Approver |
| Preconditions | Report exists with one or more missing gates. |
| Test Data | Report `RPT-UAT-001`. |
| Steps | 1. Attempt issue with missing gate. 2. Inspect gate checklist. 3. Confirm blocked audit/error. |
| API Endpoint / UI Reference | `POST /api/v1/reports/{reportId}/issue`; future `/reports`. |
| Expected Result | Issue is blocked with `REPORT_GATES_NOT_SATISFIED`. |
| Expected Audit Event | `REPORT_ISSUE_BLOCKED` or `report.issue_blocked`. |
| Expected Workflow/Error Event | Error log if blocked issue creates error record. |
| Pass/Fail |  |
| Evidence/Screenshot |  |
| Reviewer/Sign-off |  |

### UAT-REPORT-002 — Required Report Issue Gates Verified

| Field | Value |
|---|---|
| UAT Case ID | UAT-REPORT-002 |
| Source Requirement | Report issue gate checklist completeness. |
| Role | Approver |
| Preconditions | Report gate checklist available. |
| Test Data | Report `RPT-UAT-001`. |
| Steps | 1. Verify gate checklist includes required_data_complete, evidence_linked, calculation_completed, calculation_reviewed, calculation_approved, integrity_decision_created, integrity_decision_approved, report_approved, unresolved_critical_warnings_absent, workflow_errors_resolved, approver_comment_present. |
| API Endpoint / UI Reference | Report issue endpoint response or report detail endpoint. |
| Expected Result | All listed gates are visible or auditable. |
| Expected Audit Event | `report.gate_checked` or equivalent. |
| Expected Workflow/Error Event | None unless gate failure logged. |
| Pass/Fail |  |
| Evidence/Screenshot |  |
| Reviewer/Sign-off |  |

### UAT-REPORT-003 — Report Issue Requires Human Issuer Comment and Blocks AI/n8n

| Field | Value |
|---|---|
| UAT Case ID | UAT-REPORT-003 |
| Source Requirement | Preserve `REPORT_ISSUE_COMMENT_REQUIRED`; AI/n8n cannot issue. |
| Role | Approver, ai_agent, n8n_service |
| Preconditions | Report gates otherwise pass. |
| Test Data | Report `RPT-UAT-READY-001`. |
| Steps | 1. Attempt issue as service user. 2. Attempt human issue without comment. 3. Issue with authorized human and comment. |
| API Endpoint / UI Reference | `POST /api/v1/reports/{reportId}/issue`. |
| Expected Result | Service user blocked; no-comment blocked with `REPORT_ISSUE_COMMENT_REQUIRED`; authorized human issue succeeds. |
| Expected Audit Event | `REPORT_ISSUE_BLOCKED`, then `REPORT_ISSUED` when successful. |
| Expected Workflow/Error Event | Error log for blocked issue where implemented. |
| Pass/Fail |  |
| Evidence/Screenshot |  |
| Reviewer/Sign-off |  |

### UAT-WO-001 — Create Internal Work Order from Approved Decision or Issued Report

| Field | Value |
|---|---|
| UAT Case ID | UAT-WO-001 |
| Source Requirement | Internal AIM work order fallback required before external CMMS. |
| Role | Engineer or Lead Engineer |
| Preconditions | Approved decision or issued report source exists. |
| Test Data | Work order `WO-UAT-001`. |
| Steps | 1. Create work order referencing asset, inspection, decision/report. 2. Confirm external CMMS ref remains null/optional. |
| API Endpoint / UI Reference | `POST /api/v1/work-orders`; future `/work-orders`. |
| Expected Result | Internal work order created in AIM; no SAP/Maximo/CMMS integration is invoked. |
| Expected Audit Event | `INTERNAL_WORK_ORDER_CREATED`. |
| Expected Workflow/Error Event | Optional workflow action notification only. |
| Pass/Fail |  |
| Evidence/Screenshot |  |
| Reviewer/Sign-off |  |

### UAT-WO-002 — Update Internal Work Order

| Field | Value |
|---|---|
| UAT Case ID | UAT-WO-002 |
| Source Requirement | Create/update/close work orders; audit all actions. |
| Role | Engineer or Lead Engineer |
| Preconditions | Internal work order exists. |
| Test Data | Work order `WO-UAT-001`. |
| Steps | 1. Update priority/assignee/status note. 2. Retrieve work order. |
| API Endpoint / UI Reference | `PATCH /api/v1/work-orders/{workOrderId}`. |
| Expected Result | Work order update persists and is audited. |
| Expected Audit Event | `INTERNAL_WORK_ORDER_UPDATED`. |
| Expected Workflow/Error Event | Optional notification event only. |
| Pass/Fail |  |
| Evidence/Screenshot |  |
| Reviewer/Sign-off |  |

### UAT-WO-003 — Close Requires Completion Note and Evidence When Configured

| Field | Value |
|---|---|
| UAT Case ID | UAT-WO-003 |
| Source Requirement | Work order cannot close without completion note/evidence when required. |
| Role | Engineer or Lead Engineer |
| Preconditions | Open work order exists and closure evidence required flag can be set. |
| Test Data | Work order `WO-UAT-001`; closure evidence link `EVL-UAT-CLOSE-001`. |
| Steps | 1. Attempt close without note. 2. Attempt close without required evidence. 3. Close with note and evidence. |
| API Endpoint / UI Reference | `POST /api/v1/work-orders/{workOrderId}/close`. |
| Expected Result | Missing note/evidence is blocked; valid close succeeds. |
| Expected Audit Event | `INTERNAL_WORK_ORDER_CLOSE_BLOCKED`, then `INTERNAL_WORK_ORDER_CLOSED`. |
| Expected Workflow/Error Event | Error log for blocked close where implemented. |
| Pass/Fail |  |
| Evidence/Screenshot |  |
| Reviewer/Sign-off |  |

### UAT-N8N-001 — Workflow Events Through AIM API Only

| Field | Value |
|---|---|
| UAT Case ID | UAT-N8N-001 |
| Source Requirement | n8n orchestration only; every workflow posts workflow events. |
| Role | IT Admin or n8n_service |
| Preconditions | n8n service credentials configured through AIM API path only. |
| Test Data | Synthetic workflow event for `WF-001` or `WF-002`. |
| Steps | 1. Post workflow started/succeeded event through AIM API. 2. Confirm record exists. |
| API Endpoint / UI Reference | `POST /api/v1/workflow-events`. |
| Expected Result | Workflow event is accepted by AIM API; no direct DB write is used. |
| Expected Audit Event | Workflow event audit where configured. |
| Expected Workflow/Error Event | `workflow.file_intake.started` / `workflow.file_intake.succeeded` or equivalent. |
| Pass/Fail |  |
| Evidence/Screenshot |  |
| Reviewer/Sign-off |  |

### UAT-N8N-002 — Workflow Failure Creates Error Log

| Field | Value |
|---|---|
| UAT Case ID | UAT-N8N-002 |
| Source Requirement | Every n8n failure creates AIM error log and workflow event. |
| Role | IT Admin or n8n_service |
| Preconditions | Error-log endpoint available. |
| Test Data | Synthetic `N8N_PAYLOAD_INVALID` or `N8N_AIM_API_TIMEOUT`. |
| Steps | 1. Submit invalid workflow/error path. 2. Confirm `/api/error-logs` record and failed workflow event. |
| API Endpoint / UI Reference | `POST /api/v1/error-logs`, `POST /api/v1/workflow-events`. |
| Expected Result | Failure is visible in AIM error queue. |
| Expected Audit Event | `error_log.created` or equivalent. |
| Expected Workflow/Error Event | `workflow.<name>.failed`. |
| Pass/Fail |  |
| Evidence/Screenshot |  |
| Reviewer/Sign-off |  |

### UAT-N8N-003 — n8n Cannot Approve, Promote, Issue, or Finalize

| Field | Value |
|---|---|
| UAT Case ID | UAT-N8N-003 |
| Source Requirement | n8n cannot approve/promote/issue/finalize engineering data. |
| Role | n8n_service |
| Preconditions | n8n service user exists. |
| Test Data | Pending staging record, calculation, report, work order. |
| Steps | 1. Attempt staging promote, calculation approve, integrity approve, report issue, work order close as n8n_service. |
| API Endpoint / UI Reference | Controlled action endpoints. |
| Expected Result | All final engineering actions are blocked. |
| Expected Audit Event | Security/policy violation audit where configured. |
| Expected Workflow/Error Event | Error log for attempted governance violation where configured. |
| Pass/Fail |  |
| Evidence/Screenshot |  |
| Reviewer/Sign-off |  |

### UAT-AUDIT-001 — Critical Actions Write Audit Logs

| Field | Value |
|---|---|
| UAT Case ID | UAT-AUDIT-001 |
| Source Requirement | Every approval/rejection/correction/calculation/report/work-order/evidence action must be audited. |
| Role | Lead Engineer, Approver, IT Admin |
| Preconditions | Execute critical actions from previous UAT cases. |
| Test Data | Any records created during UAT. |
| Steps | 1. Query audit log for each critical action. 2. Verify actor, role, entity type/id, reason/comment where applicable, request/correlation ID where available. |
| API Endpoint / UI Reference | `GET /api/v1/audit-logs`; future audit drawer. |
| Expected Result | Audit rows exist and are immutable/read-only through public APIs. |
| Expected Audit Event | Multiple module events. |
| Expected Workflow/Error Event | None. |
| Pass/Fail |  |
| Evidence/Screenshot |  |
| Reviewer/Sign-off |  |

### UAT-AUDIT-002 — Audit Read Permission Enforced

| Field | Value |
|---|---|
| UAT Case ID | UAT-AUDIT-002 |
| Source Requirement | Audit read is restricted. |
| Role | Inspector and IT Admin |
| Preconditions | Audit logs exist. |
| Test Data | Audit records from UAT. |
| Steps | 1. Attempt audit read as Inspector. 2. Attempt audit read as IT Admin/Lead Engineer/Approver. |
| API Endpoint / UI Reference | `GET /api/v1/audit-logs`. |
| Expected Result | Unauthorized read blocked; authorized read succeeds. |
| Expected Audit Event | Security access audit where configured. |
| Expected Workflow/Error Event | None. |
| Pass/Fail |  |
| Evidence/Screenshot |  |
| Reviewer/Sign-off |  |

## 3. UAT Completion Criteria

UAT is complete only when:

1. All critical UAT cases pass or have accepted defects.
2. All failed cases have defect IDs and owners.
3. Required evidence/screenshots/log references are attached.
4. Lead Engineer confirms engineering gates behave correctly.
5. Approver confirms report issue gates behave correctly.
6. IT Admin confirms n8n boundary, audit logs, error logs, object storage configuration, and auth/RBAC.
7. Product Owner signs the go/no-go decision.
