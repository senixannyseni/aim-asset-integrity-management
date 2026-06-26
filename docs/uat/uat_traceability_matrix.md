# AIM Phase 2.0 UAT Traceability Matrix

**Purpose:** Map Phase 2.0 UAT cases to source-of-truth requirements, modules, roles, endpoints, tables/entities, and expected audit behavior.

Status values:

- `covered` — UAT script directly verifies the requirement.
- `partial` — UAT script verifies part of the requirement; additional manual/operational proof needed.
- `not applicable` — requirement is outside current MVP execution scope.
- `future` — explicitly deferred and not part of this MVP release.

| UAT Case ID | PRD / Source Requirement | Module | Role | Endpoint or Document Section | Table / Entity | Audit Requirement | Status |
|---|---|---|---|---|---|---|---|
| UAT-AUTH-001 | Backend JWT/session auth skeleton and login audit. | Auth/RBAC | Admin, Engineer, Approver, IT Admin | `POST /api/v1/auth/login`; Security Baseline Authentication | `users`, `auth_refresh_sessions`, `audit_logs` | `auth.login_success` / failed login audit | covered |
| UAT-AUTH-002 | Logout invalidates session. | Auth/RBAC | Any authenticated role | `POST /api/v1/auth/logout` | `auth_refresh_sessions`, `audit_logs` | `auth.logout` | covered |
| UAT-AUTH-003 | `/auth/me` and refresh return backend user context. | Auth/RBAC | Any authenticated role | `GET /api/v1/auth/me`, `POST /api/v1/auth/refresh` | `users`, `roles`, `permissions`, `user_roles`, `role_permissions` | refresh audit where configured | covered |
| UAT-AUTH-004 | Protected routes require authentication. | Security | Anonymous | Protected endpoint such as `GET /api/v1/assets` | all protected entities | optional security denial audit | covered |
| UAT-AUTH-005 | Authenticated but unauthorized actions blocked. | RBAC | Inspector, Management | Controlled approval/issue routes | controlled entities | optional denied action audit | covered |
| UAT-AUTH-006 | Demo/local auth boundary restricted to local/test/development. | Security | IT Admin | Request context middleware | `users`, service users | security boundary audit/error when unsafe | covered |
| UAT-ASSET-001 | MVP asset register supports atmospheric storage tanks. | Assets | Admin, Engineer | `POST /api/v1/assets`; `/assets` page spec | `assets` | `asset.created` | covered |
| UAT-ASSET-002 | Inspection workspace linked to asset. | Inspections | Inspector, Engineer | `POST /api/v1/inspections`; `/inspections` page spec | `inspections` | `inspection.created` | covered |
| UAT-EVID-001 | AIM stores evidence metadata; object storage stores original file. | Evidence | Inspector, Engineer | `POST /api/v1/evidence-files` | `evidence_files` | `evidence.uploaded` / metadata created | covered |
| UAT-EVID-002 | Evidence upload validation rejects unsupported type/MIME/size/checksum failure. | Evidence/Security | Inspector | Evidence metadata validation | `evidence_files`, `error_logs` | `evidence.upload_rejected` | covered |
| UAT-EVID-003 | Signed URL endpoint and evidence access/download audit. | Evidence | Engineer | Evidence download/signed URL endpoint | `evidence_files`, `audit_logs` | `EVIDENCE_SIGNED_URL_CREATED` | covered |
| UAT-EVID-004 | Linked evidence deletion blocked or routed to delete approval flow. | Evidence | Engineer, IT Admin | Evidence delete/request endpoint | `evidence_links`, `evidence_files` | `evidence.delete_blocked` | covered |
| UAT-EVID-005 | Malware scan placeholder status represented. | Evidence/Security | IT Admin | Evidence metadata view | `evidence_files` | evidence security validation audit where configured | partial |
| UAT-AI-001 | AI extraction job created through AIM. | AI Extraction | Inspector, Engineer | `POST /api/v1/extraction-jobs` | `extraction_jobs` | `extraction_job.created` | covered |
| UAT-AI-002 | AI output remains extraction/staging only. | AI Extraction/Staging | Engineer, IT Admin | Extraction/staging endpoints | `extraction_fields`, `staging_records` | `extraction_field.created`, `staging_record.created` | covered |
| UAT-AI-003 | Low-confidence and missing evidence routed to review and block promotion. | AI Validation | Engineer | Field review and staging promote endpoints | `extraction_fields`, `data_quality_checks`, `staging_records` | `data_quality_check.failed` | covered |
| UAT-AI-004 | AI cannot approve, promote, issue, or finalize. | Governance/RBAC | ai_agent | Controlled action endpoints | controlled entities | security/policy violation audit | covered |
| UAT-REVIEW-001 | Engineer approves extracted field after evidence check. | Staging Review | Engineer | `POST /api/v1/extraction-fields/{id}/review` | `extraction_fields` | `extraction_field.approved_by_engineer` | covered |
| UAT-REVIEW-002 | Manual correction requires reason and `manual_overrides`. | Staging Review | Engineer | extraction field correct endpoint | `manual_overrides`, `extraction_fields` | `manual_override.created` | covered |
| UAT-REVIEW-003 | Rejection requires reason. | Staging Review | Engineer | extraction field review endpoint | `extraction_fields` | `extraction_field.rejected_by_engineer` | covered |
| UAT-REVIEW-004 | Staging promotion requires reviewed/corrected fields and evidence. | Staging Promotion | Engineer, Lead Engineer | `POST /api/v1/staging-records/{id}/promote` | `staging_records`, `evidence_links` | `staging_record.promoted` | covered |
| UAT-NDT-001 | Reviewed NDT/UT path requires evidence before final use. | NDT | Inspector, Engineer | NDT measurement endpoint and `/ndt` page spec | `ndt_measurements`, `thickness_readings`, `evidence_links` | `ndt.measurement.created/reviewed` where implemented | partial |
| UAT-CALC-001 | Explicit approved formula version required; no default formula. | Calculation | Engineer | `POST /api/v1/calculations/run` | `formula_versions`, `calculation_runs` | `CALCULATION_INPUT_REJECTED`, `CALCULATION_RUN_CREATED` | covered |
| UAT-CALC-002 | Calculation snapshots, warning, disclaimer, evidence linkage. | Calculation | Engineer | calculation run/retrieve endpoints | `calculation_runs`, `calculation_inputs`, `calculation_outputs`, `evidence_links` | `CALCULATION_RUN_CREATED`, warning audit where configured | covered |
| UAT-CALC-003 | Workbook edge cases: zero/negative/missing/evidence/unit. | Calculation Validation | Engineer, Lead Engineer | validation workbook and calculation tests | `calculation_validation_cases`, `calculation_outputs` | calculation warning/rejection audit | covered |
| UAT-DEC-001 | Draft integrity decision is human-authored and evidence/calculation-linked. | Integrity Decision | Engineer | `POST /api/v1/integrity-decisions` | `integrity_decisions` | `INTEGRITY_DECISION_CREATED` | covered |
| UAT-DEC-002 | Decision approval requires authorized human, comment, SoD. | Integrity Decision | Lead Engineer, Approver | integrity approval endpoint | `integrity_decisions`, `audit_logs` | approved/rejected/blocked audit | covered |
| UAT-REPORT-001 | Report issue blocked until gates pass. | Reports | Approver | `POST /api/v1/reports/{reportId}/issue` | `reports`, `review_gates`, `error_logs` | `REPORT_ISSUE_BLOCKED` / `report.issue_blocked` | covered |
| UAT-REPORT-002 | Required report issue gates visible/auditable. | Reports | Approver | report issue response/detail | `review_gates`, `reports` | `report.gate_checked` | covered |
| UAT-REPORT-003 | Report issue requires human issuer comment; AI/n8n blocked. | Reports | Approver, ai_agent, n8n_service | `POST /api/v1/reports/{reportId}/issue` | `reports`, `audit_logs` | `REPORT_ISSUE_COMMENT_REQUIRED`, `REPORT_ISSUE_BLOCKED`, `REPORT_ISSUED` | covered |
| UAT-WO-001 | Internal AIM work order fallback before external CMMS. | Work Orders | Engineer, Lead Engineer | `POST /api/v1/work-orders` | `internal_work_orders` | `INTERNAL_WORK_ORDER_CREATED` | covered |
| UAT-WO-002 | Work order update audited. | Work Orders | Engineer, Lead Engineer | `PATCH /api/v1/work-orders/{workOrderId}` | `internal_work_orders` | `INTERNAL_WORK_ORDER_UPDATED` | covered |
| UAT-WO-003 | Work order close requires completion note and evidence when configured. | Work Orders | Engineer, Lead Engineer | `POST /api/v1/work-orders/{workOrderId}/close` | `internal_work_orders`, `evidence_links` | `INTERNAL_WORK_ORDER_CLOSE_BLOCKED`, `INTERNAL_WORK_ORDER_CLOSED` | covered |
| UAT-N8N-001 | Workflow events must be posted through AIM API only. | Workflow Events | IT Admin, n8n_service | `POST /api/v1/workflow-events` | `workflow_events` | workflow event audit where configured | covered |
| UAT-N8N-002 | Workflow failure creates AIM error log. | Error Logs | IT Admin, n8n_service | `POST /api/v1/error-logs`, `POST /api/v1/workflow-events` | `error_logs`, `workflow_events` | `error_log.created` | covered |
| UAT-N8N-003 | n8n cannot approve/promote/issue/finalize engineering data. | Workflow/RBAC | n8n_service | controlled action endpoints | controlled entities | security/policy violation audit | covered |
| UAT-AUDIT-001 | Critical actions write audit logs. | Audit | Lead Engineer, Approver, IT Admin | `GET /api/v1/audit-logs` | `audit_logs` | all critical module audit events | covered |
| UAT-AUDIT-002 | Audit read permission enforced. | Audit/RBAC | Inspector, IT Admin | `GET /api/v1/audit-logs` | `audit_logs` | optional audit access audit | covered |

## Coverage Summary

| Source Area | UAT Coverage | Notes |
|---|---:|---|
| Auth/RBAC | covered | Login/logout/me/refresh, unauthorized and unauthorized-by-role paths, demo auth boundary. |
| Evidence governance | covered | Upload metadata, validation, signed URL, audit, deletion block, malware placeholder. |
| AI extraction/staging | covered | Extraction jobs, field confidence/review, staging-only, service-user block. |
| Human review/manual override | covered | Approve/correct/reject/promote with evidence and reason. |
| NDT/reviewed data | partial | Uses current NDT API where supported; final evidence gate verified. |
| Calculation governance | covered | Formula version, snapshots, disclaimer, workbook edge cases. |
| Integrity decision | covered | Human-only decision/approval, comments, SoD. |
| Report issue gates | covered | Full gate checklist, blocked and successful issue, tokens preserved. |
| Internal work orders | covered | Create/update/close, completion note/evidence, no external CMMS. |
| n8n boundary/error handling | covered | AIM API only, workflow/error logs, no finalization by n8n. |
| Audit logs | covered | Critical actions and audit read permissions. |
