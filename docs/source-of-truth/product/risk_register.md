# AIM+n8n MVP Risk Register

## Document Control

| Item | Value |
|---|---|
| Document | `docs/risk_register.md` |
| Related workbook | `docs/risk_matrix.xlsx` |
| Project | AIM+n8n MVP |
| Current baseline date | 2026-06-11 |
| Owner | Product Owner / Lead Engineer / IT Admin |
| Review cadence | Weekly during MVP build; bi-weekly after stabilization |

## Pre-Implementation Governance Check

### Assumptions
- AIM is the system of record.
- PostgreSQL stores final structured engineering data.
- Object storage stores original evidence files.
- n8n is workflow orchestration only and must call AIM backend APIs only.
- AI extraction output goes only to `extraction_fields` and `staging_records`.
- Engineer review is mandatory before extracted data is promoted to final engineering tables.
- Calculation engine is deterministic, testable, versioned, and auditable.
- Formula use is limited to engineer-approved formula registry, supplied workbook formulas, or user-approved test fixtures.
- Evidence linkage is mandatory for findings, NDT measurements, calculations, integrity decisions, and reports.

### Impacted Documents
- `01_PRD/AIM_MVP_PRD.md`
- `03_Database/data_dictionary.md`
- `04_API/openapi.yaml`
- `05_n8n/n8n_workflow_catalog.md`
- `06_Evidence/evidence_governance.md`
- `06_AI_Extraction/AI_Extraction_Control_Pack/*`
- `07_Calculation/engineering_basis.md`
- `07_Calculation/calculation_validation_method.md`
- `08_Frontend/page_specs.md`
- `docs/security-baseline.md`
- `docs/risk_register.md`
- `docs/risk_matrix.xlsx`

### Impacted Tables
- `assets`
- `asset_components`
- `inspections`
- `inspection_findings`
- `evidence_files`
- `evidence_links`
- `extraction_jobs`
- `extraction_fields`
- `staging_records`
- `manual_overrides`
- `data_quality_checks`
- `ndt_measurements`
- `cml_points`
- `thickness_readings`
- `formula_versions`
- `calculation_runs`
- `calculation_inputs`
- `calculation_outputs`
- `integrity_decisions`
- `reports`
- `workflow_events`
- `workflow_tasks`
- `notification_logs`
- `error_logs`
- `audit_logs`
- `internal_work_orders`
- `system_settings`

### Impacted Endpoints
- `/api/assets`
- `/api/assets/{id}/approve`
- `/api/evidence`
- `/api/evidence-links`
- `/api/inspections`
- `/api/extraction-jobs`
- `/api/extraction-fields/{id}/approve`
- `/api/staging-records/{id}/promote`
- `/api/ndt-measurements`
- `/api/calculations/run`
- `/api/calculations/{id}/approve`
- `/api/integrity-decisions`
- `/api/reports/generate`
- `/api/reports/{id}/issue`
- `/api/work-orders`
- `/api/workflow-events`
- `/api/error-logs`
- `/api/audit-logs`

### Required Permissions
- `asset.create`, `asset.approve`
- `evidence.upload`, `evidence.link`, `evidence.read`
- `inspection.create`, `inspection.review`
- `ai_extraction.create`, `staging.review`, `staging.promote`
- `ndt.create`, `ndt.review`
- `calculation.run`, `calculation.review`, `calculation.approve`
- `integrity_decision.create`, `integrity_decision.approve`
- `report.generate`, `report.approve`, `report.issue`
- `work_order.create`, `work_order.update`
- `workflow_event.create`
- `error_log.create`, `audit.read`

### Required Audit Events
Every approval, rejection, correction, calculation, report issue, work order action, workflow event, and error event must write an audit log or workflow/error log as applicable.

### Required Validation Rules
- Role and permission checks must pass before protected actions.
- Evidence completeness must pass before final NDT, calculation approval, integrity decision, and report issue.
- Formula version must be approved before calculation run.
- AI extraction fields must include source, confidence, and field status.
- Low-confidence or failed validation fields must remain in engineer review.
- Reports cannot be issued until data, calculation, review, evidence, and approval gates pass.
- n8n must not write final engineering data directly to PostgreSQL.

### Required Test Cases
- Approval endpoint is inaccessible without correct permission.
- Direct n8n-to-database path is not possible.
- AI output cannot promote without reviewer approval.
- Missing evidence blocks calculation approval and report issue.
- Formula validation failure blocks release.
- Error branch creates `/api/error-logs`.
- Audit logs are generated for all protected actions.

### Migration / Documentation Updates
This document does not create a database migration by itself. It should be used to drive backlog issues, test coverage, and release readiness checks.

## Scoring Method

| Likelihood | Meaning |
|---:|---|
| 1 | Rare |
| 2 | Unlikely |
| 3 | Possible |
| 4 | Likely |
| 5 | Almost certain |

| Severity | Meaning |
|---:|---|
| 1 | Minor inconvenience |
| 2 | Limited operational impact |
| 3 | Moderate schedule or quality impact |
| 4 | Major operational, engineering, or security impact |
| 5 | Critical safety, compliance, audit, or client impact |

**Risk score = likelihood × severity**

| Score Range | Rating | Response |
|---:|---|---|
| 1-5 | Low | Monitor |
| 6-10 | Medium | Mitigate through planned controls |
| 11-15 | High | Active mitigation and owner review |
| 16-25 | Critical | Executive visibility, gate control, and contingency readiness |

## Top-10 Critical Risks Summary

| Rank | Risk ID | Category | Description | Likelihood | Severity | Score | Owner | Status |
|---:|---|---|---|---:|---:|---:|---|---|
| 1 | AIX-001 | AI extraction risk | AI extracts incorrect engineering values with high confidence. | 4 | 5 | 20 | Engineer | Mitigating |
| 2 | CMP-001 | Compliance and audit risk | Audit logs are incomplete for approval, correction, calculation, report issue, or work order action. | 4 | 5 | 20 | IT Admin | Mitigating |
| 3 | ENG-001 | Engineering risk | Integrity decision is made without complete engineering review. | 4 | 5 | 20 | Lead Engineer | Mitigating |
| 4 | EVD-001 | Evidence traceability risk | Evidence link is missing for finding, NDT reading, calculation, decision, or report. | 4 | 5 | 20 | Lead Engineer | Mitigating |
| 5 | FML-001 | Formula validation risk | Unapproved formula version is used by the calculation engine. | 4 | 5 | 20 | Lead Engineer | Mitigating |
| 6 | SEC-001 | Security risk | Unauthorized user accesses restricted evidence files. | 4 | 5 | 20 | IT Admin | Mitigating |
| 7 | ADP-001 | User adoption risk | Inspectors and engineers continue using spreadsheets outside AIM. | 4 | 4 | 16 | Management | Open |
| 8 | DQ-001 | Data quality risk | Required engineering fields are missing or inconsistent. | 4 | 4 | 16 | Engineer | Open |
| 9 | SCP-001 | Scope creep risk | MVP expands into full RBI, FFS, or production CMMS before core gates are stable. | 4 | 4 | 16 | Product Owner | Open |
| 10 | AIX-002 | AI extraction risk | AI output is promoted directly into final tables. | 3 | 5 | 15 | IT Admin | Mitigating |

## Full Risk Register

| Risk ID | Category | Description | Cause | Impact | Likelihood | Severity | Risk Score | Mitigation | Contingency | Owner | Status | Review Date |
|---|---|---|---|---|---:|---:|---:|---|---|---|---|---|
| ENG-001 | Engineering risk | Integrity decision is made without complete engineering review. | Approval gate is bypassed or role permission is misconfigured. | Unsafe or unsupported integrity decision; report cannot be trusted. | 4 | 5 | 20 | Enforce maker-checker approval workflow, RBAC protection, evidence checklist, and audit logging before decision finalization. | Block decision finalization; revert to draft; require Lead Engineer review and corrective audit entry. | Lead Engineer | Mitigating | 2026-06-30 |
| ENG-002 | Engineering risk | Incorrect asset/component context used during inspection review. | Asset tag, component, course number, or inspection ID is selected incorrectly. | NDT readings and calculations may be associated with the wrong tank/component. | 3 | 4 | 12 | Use asset/component pickers from AIM master data, validation rules, and evidence link confirmation. | Quarantine affected records; run lineage check; require manual correction reason. | Engineer | Open | 2026-06-30 |
| FML-001 | Formula validation risk | Unapproved formula version is used by the calculation engine. | Formula registry is not enforced or fallback logic uses undocumented calculation. | Invalid calculation output and potential non-compliance with engineering basis. | 4 | 5 | 20 | Calculation engine must require active engineer-approved formula_version_id and pass validation workbook test cases. | Disable calculation run; rollback to last approved formula version; notify Lead Engineer and IT Admin. | Lead Engineer | Mitigating | 2026-06-30 |
| FML-002 | Formula validation risk | Formula behavior changes without regression testing. | Code or workbook fixture changes are deployed without validation run. | Calculation results become inconsistent across reports or audit periods. | 3 | 5 | 15 | CI must execute calculation validation suite using validation_workbook fixtures before release. | Freeze release; compare previous vs current outputs; issue correction notice for impacted calculations. | IT Admin | Open | 2026-06-30 |
| AIX-001 | AI extraction risk | AI extracts incorrect engineering values with high confidence. | Poor scan quality, ambiguous table layout, or model hallucination. | Wrong staging values may be promoted if reviewer misses the issue. | 4 | 5 | 20 | Require source reference, confidence, data quality checks, suspicious value rules, and engineer review before promotion. | Keep field in review_required; manual re-entry from evidence; create manual_overrides record. | Engineer | Mitigating | 2026-06-30 |
| AIX-002 | AI extraction risk | AI output is promoted directly into final tables. | Developer bypasses staging pattern or endpoint incorrectly maps extracted values. | Architecture rule violation; final data loses mandatory human review traceability. | 3 | 5 | 15 | API must only accept extraction output into extraction_fields and staging_records; final promotion endpoint requires reviewer approval. | Disable promotion endpoint; audit all affected rows; revert final records to previous version. | IT Admin | Mitigating | 2026-06-30 |
| DQ-001 | Data quality risk | Required engineering fields are missing or inconsistent. | Incomplete inspection report, partial upload, or manual entry error. | Calculation and reporting gates fail or produce incomplete outputs. | 4 | 4 | 16 | Mandatory field validation, staging quality checks, and completeness checklist per module. | Create review task; request missing source document/evidence from Inspector. | Engineer | Open | 2026-06-30 |
| DQ-002 | Data quality risk | Duplicate report number or duplicate inspection record is created. | No uniqueness validation across asset, report number, and inspection date. | Conflicting asset history and incorrect dashboard KPI/report traceability. | 3 | 4 | 12 | Enforce duplicate detection on report_number, asset_id, inspection_date, and evidence checksum. | Merge or supersede duplicate record with audit trail and approver sign-off. | Admin | Open | 2026-06-30 |
| EVD-001 | Evidence traceability risk | Evidence link is missing for finding, NDT reading, calculation, decision, or report. | Evidence is uploaded but not linked to downstream engineering record. | Audit failure; report cannot prove basis for engineering conclusion. | 4 | 5 | 20 | Make evidence_links mandatory before NDT finalization, calculation approval, integrity decision, and report issue. | Block workflow at gate; create evidence completion task; escalate after SLA breach. | Lead Engineer | Mitigating | 2026-06-30 |
| EVD-002 | Evidence traceability risk | Original evidence file is overwritten or deleted without approval. | Object storage versioning or deletion approval controls are incomplete. | Loss of original audit source and inability to reproduce decision basis. | 3 | 5 | 15 | Enable versioning, checksum, soft-delete metadata, deletion request/approval, and audit logs. | Restore previous object version or backup; mark affected records as under investigation. | IT Admin | Open | 2026-06-30 |
| SEC-001 | Security risk | Unauthorized user accesses restricted evidence files. | Signed URLs are too broad, RBAC not checked, or storage path is exposed. | Confidential engineering/client data leak. | 4 | 5 | 20 | Generate short-lived signed URLs only after AIM RBAC check; no public bucket access. | Revoke URLs, rotate credentials, review audit logs, notify security owner. | IT Admin | Mitigating | 2026-06-30 |
| SEC-002 | Security risk | Malicious or unsafe file is uploaded as evidence. | Upload validation only checks extension; no MIME/checksum/scanning control. | Malware exposure or unsafe file distribution to users. | 3 | 4 | 12 | Validate extension, MIME, file size, checksum, and integrate malware scanning fixture before production. | Quarantine file; block preview/download; investigate uploader and affected objects. | IT Admin | Open | 2026-06-30 |
| N8N-001 | n8n workflow risk | n8n writes or stores final engineering data outside AIM. | Workflow is configured to write PostgreSQL directly or retain extracted data as durable source. | System-of-record violation and audit inconsistency. | 3 | 5 | 15 | n8n credentials must not include DB write access; workflows call AIM APIs only; every run posts workflow event. | Disable workflow; rotate credentials; reconcile data against AIM; record incident audit event. | IT Admin | Mitigating | 2026-06-30 |
| N8N-002 | n8n workflow risk | Workflow failure is not logged or escalated. | Error branch missing, API timeout, or retry policy not configured. | Silent failure; review/approval tasks may be delayed or lost. | 3 | 4 | 12 | Every workflow has failure branch to /api/error-logs and /api/workflow-events with SLA escalation. | Run error recovery workflow; manually recreate failed task; notify owner. | IT Admin | Open | 2026-06-30 |
| CMMS-001 | CMMS integration risk | External CMMS integration delays block MVP action management. | SAP/Maximo credentials, API access, or mapping not available during MVP timeline. | Action tracking delayed if system depends on external integration. | 4 | 3 | 12 | Implement internal work order fallback as MVP default; external integration remains phase 2. | Use internal work_orders until CMMS UAT and mapping are approved. | Admin | Monitored | 2026-07-15 |
| CMMS-002 | CMMS integration risk | Work order status becomes inconsistent between AIM and external CMMS. | No reconciliation rule, webhook mismatch, or manual updates in CMMS. | Dashboard action KPIs and closure evidence become unreliable. | 3 | 4 | 12 | Define integration mapping, idempotency keys, sync logs, and reconciliation reports before production integration. | Freeze external sync; treat AIM work order as internal source until reconciled. | IT Admin | Open | 2026-07-15 |
| ADP-001 | User adoption risk | Inspectors and engineers continue using spreadsheets outside AIM. | Workflow is perceived as slower or not aligned with site habits. | Incomplete AIM records and poor data quality for dashboard/reporting. | 4 | 4 | 16 | Provide role-based training, import templates, fast upload, and clear review queues. | Run migration/backfill session; assign data steward to support first inspections. | Management | Open | 2026-07-15 |
| ADP-002 | User adoption risk | Approvers do not act within SLA. | Approval responsibilities or notifications are unclear. | Reports and work orders are delayed. | 3 | 3 | 9 | SLA escalation matrix, dashboard overdue view, and recurring reminder workflow. | Escalate to alternate approver or management after SLA breach. | Approver | Open | 2026-07-15 |
| OPS-001 | Deployment and operation risk | Production environment lacks backup/restore readiness. | Backup policy, retention, or restore drill is not completed before go-live. | Data loss or extended downtime after incident. | 3 | 5 | 15 | Define PostgreSQL backup, object storage versioning, restore drill, and RPO/RTO acceptance criteria. | Activate DR runbook; restore from latest verified backup; communicate incident status. | IT Admin | Open | 2026-06-30 |
| OPS-002 | Deployment and operation risk | Observability is insufficient for API, workflow, and extraction failures. | Logs, metrics, and alerting are not configured across backend/n8n/storage. | Issues remain undetected until users report them. | 3 | 4 | 12 | Implement structured logs, workflow/error dashboards, uptime checks, and alert routing. | Run manual health checks; triage error_logs and workflow_events daily. | IT Admin | Open | 2026-07-15 |
| SCP-001 | Scope creep risk | MVP expands into full RBI, FFS, or production CMMS before core gates are stable. | Stakeholders request advanced modules during build. | Delivery slips and validation scope becomes unmanageable. | 4 | 4 | 16 | Maintain explicit out-of-scope list and change control board; defer advanced modules to roadmap. | Re-baseline sprint backlog and obtain sponsor approval for scope trade-offs. | Product Owner | Open | 2026-06-30 |
| SCP-002 | Scope creep risk | Frontend requests add non-MVP analytics before data governance is complete. | Dashboard expectations grow beyond validated data model. | Team spends effort on visuals without reliable underlying data. | 3 | 4 | 12 | Prioritize core data lifecycle, evidence linkage, and approval gates before advanced analytics. | Move new charts to backlog; deliver basic KPI only in MVP. | Product Owner | Monitored | 2026-07-15 |
| CMP-001 | Compliance and audit risk | Audit logs are incomplete for approval, correction, calculation, report issue, or work order action. | Developers implement business action without audit wrapper. | Cannot prove who did what, when, and why. | 4 | 5 | 20 | Centralize audit middleware/service; every protected endpoint requires x-audit-event-generated mapping and tests. | Block release; run audit gap report; backfill audit records where supported. | IT Admin | Mitigating | 2026-06-30 |
| CMP-002 | Compliance and audit risk | Report is issued without satisfying data, calculation, review, evidence, and approval gates. | Report issue endpoint does not enforce readiness checks. | Invalid or premature official report could be sent to client/management. | 3 | 5 | 15 | Report issue endpoint must check required gates and evidence completeness before status=issued. | Revoke issued report version; mark superseded; require reapproval and incident audit. | Approver | Mitigating | 2026-06-30 |

## Category-Level Notes

### 1. Engineering risk
Engineering risks focus on incorrect context, incomplete review, or approval bypass. The MVP must enforce human engineering authority for integrity decisions.

### 2. Formula validation risk
Formula risks are controlled through approved formula versions, deterministic execution, regression test fixtures, and mandatory validation workbook comparison.

### 3. AI extraction risk
AI extraction is limited to structuring and staging. AI cannot approve data, issue reports, or make final engineering decisions.

### 4. Data quality risk
Data quality depends on completeness, uniqueness, unit consistency, and evidence-backed correction workflows.

### 5. Evidence traceability risk
Evidence linkage is mandatory across findings, NDT readings, calculations, integrity decisions, and reports.

### 6. Security risk
Security risks are highest around restricted evidence access, file upload validation, secrets, and approval endpoint protection.

### 7. n8n workflow risk
n8n must remain orchestration-only. All workflow state changes must go through AIM backend APIs and post `/api/workflow-events`.

### 8. CMMS integration risk
MVP must not depend on production SAP/Maximo integration. Internal work order fallback is the required default.

### 9. User adoption risk
Adoption risk is mitigated through clear work queues, import templates, training, and role-specific UI.

### 10. Deployment and operation risk
Operational readiness requires backup/restore, monitoring, structured logs, and error queue ownership.

### 11. Scope creep risk
Advanced API 581 RBI, API 579 FFS, production CMMS, full 3D scan processing, and AI-only approval remain out of scope for MVP.

### 12. Compliance and audit risk
Compliance depends on mandatory audit logs, immutable evidence linkage, approval gates, and controlled report issuance.

## Review Workflow

1. Product Owner reviews scope and adoption risks.
2. Lead Engineer reviews engineering, formula, AI extraction, data quality, evidence, and compliance risks.
3. IT Admin reviews security, deployment, n8n, and integration risks.
4. Management reviews top-10 critical risks and unresolved mitigation blockers.
5. Updates must be logged in the workbook `Risk_Register` and summarized in project status reporting.

## Delivery Notes

### What Changed
Created a structured risk register for AIM+n8n MVP and defined scoring, mitigation, contingency, ownership, and review cadence.

### AIM / n8n Boundary Confirmation
This risk register preserves the required boundary: AIM is the system of record; n8n is workflow orchestration only; AI output remains staged until engineer review; evidence and audit gates are mandatory.

### Run / Test Commands
```bash
npm run test:rbac
npm run test:audit
npm run test:evidence-linkage
npm run test:ai-extraction
npm run test:staging-review
npm run test:calculation
npm run test:workflow
npm run test:error-handling
npm run test:report-gates
```

### Documentation Updates
Update this document and `docs/risk_matrix.xlsx` whenever a new risk is identified, score changes, status changes, or mitigation/contingency owner changes.
