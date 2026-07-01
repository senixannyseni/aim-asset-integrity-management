# AIM+n8n MVP Product Requirements Document

**Document path:** `01_PRD/AIM_MVP_PRD.md`  
**Product:** Asset Integrity Management (AIM) + n8n Orchestration MVP  
**MVP focus:** Atmospheric storage tank inspection, evidence-linked engineering workflow, AI extraction staging review, deterministic API 653 calculation MVP using explicitly supplied formulas only, integrity decision, report issuance, KPI dashboard, and internal work order fallback.  
**Document status:** Implementation-ready PRD for developer/Codex handoff  
**Governance level:** Engineering-controlled, audit-first, human-reviewed  
**Last updated:** 2026-06-11

---

## 0. Non-Negotiable Architecture and Governance Rules

The AIM+n8n MVP must follow these rules without exception:

1. **AIM is the system of record.**
2. **PostgreSQL stores final structured engineering data.**
3. **Object storage stores original evidence files.**
4. **n8n is workflow orchestration only:** trigger, routing, reminder, approval notification, integration event, and audit event routing.
5. **n8n must not store final engineering data and must not write directly to PostgreSQL.**
6. **AI extraction output must always go to staging first, never directly to final engineering tables.**
7. **AI must never approve engineering data, final integrity decisions, calculations, or issued reports.**
8. **Engineer review is mandatory before extracted data is promoted to final engineering tables.**
9. **Calculation engine must be deterministic, testable, versioned, and auditable.**
10. **Do not invent API/ASME formulas and do not quote or reproduce copyrighted standard clauses.**
11. **Use formulas only from the provided workbook, explicit engineering basis, or user-approved test fixtures.**
12. **Every approval, rejection, correction, calculation, report issue, and work order action must write audit logs.**
13. **Evidence linkage is mandatory for findings, NDT measurements, calculations, integrity decisions, and reports.**
14. **Reports cannot be issued unless required data, calculation, review, evidence, and approval gates are satisfied.**
15. **MVP must include internal work order fallback before external CMMS integration.**

---

## 1. Pre-Implementation Governance Check

### 1.1 Assumptions

1. The MVP supports **atmospheric storage tanks only**.
2. The MVP starts with **API 653 calculation workflows using explicitly supplied formulas only**. No API/ASME formula may be invented, inferred, reconstructed, or copied from copyrighted standards.
3. The MVP is **organization-ready** but may be deployed initially for a single organization.
4. PostgreSQL is the source of truth for final structured data.
5. Object storage is S3-compatible or equivalent and stores original evidence files.
6. n8n may call AIM APIs and receive webhook events, but n8n must not write directly to AIM PostgreSQL tables.
7. AI extraction is optional assistance and must write only to staging entities.
8. Engineer review is required before staging data is promoted to final NDT, finding, calculation input, or asset history tables.
9. Calculation output must include formula source, formula version, input values, units, calculation run ID, reviewer, timestamp, and evidence references.
10. Report issuance requires completed data, evidence, calculation, integrity review, and approval gates.

### 1.2 Impacted Documents

| Document | Impact |
|---|---|
| `01_PRD/AIM_MVP_PRD.md` | New PRD created as the implementation baseline. |
| `02_ARCHITECTURE/AIM_System_Architecture.md` | Must align system-of-record, PostgreSQL, object storage, AI staging, n8n boundary, and audit rules. |
| `03_DATA_MODEL/AIM_PostgreSQL_ERD.md` | Must define final, staging, evidence, audit, calculation, report, and work order tables. |
| `04_API/AIM_OpenAPI.yaml` | Must define API-only interaction between frontend, n8n, AI services, calculation engine, and AIM backend. |
| `05_WORKFLOWS/n8n_AIM_Workflows.md` | Must define orchestration-only flows and explicitly prohibit direct DB writes. |
| `06_CALCULATION/API653_Calculation_Engine_MVP.md` | Must define deterministic formula registry, versioning, tests, evidence linkage, and review gates. |
| `07_SECURITY/AIM_RBAC_Audit_Model.md` | Must define permissions, role access, approval gates, and audit events. |
| `08_QA/AIM_MVP_Test_Plan.md` | Must include unit, integration, E2E, RBAC, audit, and governance tests. |

### 1.3 Impacted Tables

The final ERD may evolve, but the MVP must include tables equivalent to the following conceptual groups:

| Table / Entity | Purpose | Governance Notes |
|---|---|---|
| `organizations` | Tenant/company structure | Required for future multi-tenant readiness. |
| `users` | User identity | Integrated with auth provider or local identity service. |
| `roles` | Role definitions | Admin, Inspector, Engineer, Lead Engineer, Approver, Management, IT Admin. |
| `permissions` | Atomic permission catalog | Must map to route/API actions. |
| `user_role_assignments` | User-to-role mapping | Must be auditable. |
| `assets` | Final asset register | AIM/PostgreSQL source of truth. |
| `tank_details` | Atmospheric tank-specific attributes | Linked one-to-one or one-to-many with assets. |
| `inspection_plans` | Planned inspection scope | Created in AIM, may trigger n8n notifications. |
| `inspection_records` | Actual inspection execution records | Final data after review. |
| `evidence_files` | Metadata for uploaded files | Original files stored in object storage, not PostgreSQL binary blobs. |
| `evidence_links` | Links evidence to assets, findings, NDT, calculations, reports | Mandatory traceability layer. |
| `ai_extraction_jobs` | AI extraction job metadata | Staging only. |
| `ai_extraction_staging` | AI-generated structured candidate data | Cannot be treated as final engineering data. |
| `staging_review_actions` | Engineer review/correction/rejection of AI output | Required before promotion. |
| `ndt_ut_grids` | UT data room grouping | Final reviewed UT datasets. |
| `ndt_ut_measurements` | Final UT measurement points | Must include evidence link and review metadata. |
| `findings` | Inspection findings/anomalies | Must link to evidence. |
| `formula_registry` | Approved deterministic formula definitions or references | Only supplied formulas or approved test fixtures. |
| `calculation_runs` | Calculation execution instance | Versioned, auditable, deterministic. |
| `calculation_inputs` | Calculation input values and units | Must link to source/evidence. |
| `calculation_outputs` | Calculation results | Must include run ID and formula version. |
| `integrity_decisions` | Engineering decision record | Human decision only. |
| `review_gates` | Formal checkpoints | Required before report issue. |
| `reports` | Report metadata and status | Draft, review, approved, issued. |
| `report_sections` | Structured report content | Generated or manually authored, subject to approval. |
| `report_exports` | PDF/DOCX export metadata | Issuance requires gates. |
| `internal_work_orders` | MVP work order fallback | Required before external CMMS integration. |
| `workflow_events` | n8n/AIM event exchange log | n8n orchestration audit visibility. |
| `audit_logs` | Immutable audit trail | Required for all critical actions. |
| `notifications` | User notifications | May be triggered by n8n but stored by AIM if persistent. |

### 1.4 Impacted Endpoints

The MVP should expose REST or equivalent API endpoints with similar responsibilities:

| Endpoint Group | Example Endpoints | Notes |
|---|---|---|
| Auth/RBAC | `GET /me`, `GET /roles`, `POST /role-assignments` | Role assignment must be audited. |
| Asset Register | `GET /assets`, `POST /assets`, `GET /assets/{id}`, `PATCH /assets/{id}` | Final structured data in PostgreSQL. |
| Tank Details | `GET /assets/{id}/tank-details`, `PUT /assets/{id}/tank-details` | Atmospheric tank attributes only in MVP. |
| Inspection Workspace | `POST /inspection-plans`, `GET /inspection-records`, `PATCH /inspection-records/{id}` | Status workflow and validation gates. |
| Evidence Repository | `POST /evidence/upload-url`, `POST /evidence/complete`, `GET /evidence/{id}`, `POST /evidence-links` | File binary goes to object storage. Metadata goes to AIM. |
| AI Extraction | `POST /ai-extraction-jobs`, `GET /ai-extraction-jobs/{id}`, `GET /ai-extraction-staging`, `POST /ai-extraction-staging/{id}/review` | AI output stays in staging until reviewed. |
| Staging Promotion | `POST /staging-review-actions`, `POST /staging-records/{id}/promote` | Engineer-only promotion. |
| NDT UT Data Room | `POST /ndt/ut-grids`, `POST /ndt/ut-measurements/import`, `GET /ndt/ut-measurements` | Final only after review. |
| Findings | `POST /findings`, `GET /findings`, `PATCH /findings/{id}` | Evidence link required. |
| Calculation Engine | `GET /formula-registry`, `POST /calculation-runs`, `GET /calculation-runs/{id}`, `POST /calculation-runs/{id}/review` | Deterministic and versioned. |
| Integrity Decision | `POST /integrity-decisions`, `POST /integrity-decisions/{id}/submit-review`, `POST /integrity-decisions/{id}/approve` | AI cannot approve. |
| Report Builder | `POST /reports`, `PATCH /reports/{id}`, `POST /reports/{id}/submit-review`, `POST /reports/{id}/issue`, `GET /reports/{id}/export` | Issuance blocked unless gates pass. |
| Dashboard KPI | `GET /dashboard/kpi`, `GET /dashboard/inspection-status`, `GET /dashboard/work-orders` | Read-only aggregated views. |
| Internal Work Orders | `POST /work-orders`, `PATCH /work-orders/{id}`, `POST /work-orders/{id}/close` | Internal fallback required in MVP. |
| n8n Integration | `POST /workflow-events`, `GET /workflow-events`, `POST /webhooks/n8n/*` | API-only integration; no direct DB write. |
| Audit | `GET /audit-logs` | Restricted to authorized roles. |

### 1.5 Required Permissions

| Permission | Admin | Inspector | Engineer | Lead Engineer | Approver | Management | IT Admin |
|---|---:|---:|---:|---:|---:|---:|---:|
| `asset.read` | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| `asset.create` | Yes | No | Yes | Yes | No | No | No |
| `asset.update` | Yes | No | Yes | Yes | No | No | No |
| `inspection.plan.create` | Yes | Yes | Yes | Yes | No | No | No |
| `inspection.execute` | Yes | Yes | No | No | No | No | No |
| `evidence.upload` | Yes | Yes | Yes | Yes | No | No | No |
| `evidence.link` | Yes | Yes | Yes | Yes | No | No | No |
| `ai.extract.request` | Yes | Yes | Yes | Yes | No | No | No |
| `ai.staging.review` | No | No | Yes | Yes | No | No | No |
| `ai.staging.promote` | No | No | Yes | Yes | No | No | No |
| `ndt.ut.create` | Yes | Yes | Yes | Yes | No | No | No |
| `finding.create` | Yes | Yes | Yes | Yes | No | No | No |
| `calculation.run` | No | No | Yes | Yes | No | No | No |
| `calculation.review` | No | No | Yes | Yes | No | No | No |
| `integrity.decision.create` | No | No | Yes | Yes | No | No | No |
| `integrity.decision.approve` | No | No | No | Yes | Yes | No | No |
| `report.create` | Yes | No | Yes | Yes | No | No | No |
| `report.review` | No | No | Yes | Yes | Yes | No | No |
| `report.issue` | No | No | No | No | Yes | No | No |
| `dashboard.view` | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| `work_order.create` | Yes | Yes | Yes | Yes | No | No | No |
| `work_order.approve` | Yes | No | No | Yes | Yes | No | No |
| `audit.read` | Yes | No | No | Yes | Yes | No | Yes |
| `system.configure` | Yes | No | No | No | No | No | Yes |

### 1.6 Required Audit Events

The MVP must write immutable audit events for at least:

1. User login/logout or identity session events where available.
2. Role/permission assignment changes.
3. Asset creation, update, archival, and restoration.
4. Inspection plan creation, assignment, execution status change, closure, and reopening.
5. Evidence upload, evidence metadata change, evidence link creation/removal, and file access where feasible.
6. AI extraction job creation, completion, failure, and staging data creation.
7. Staging data review, correction, rejection, and promotion to final tables.
8. NDT UT measurement import, correction, review, and finalization.
9. Finding creation, correction, review, severity change, closure, and reopening.
10. Formula registry creation/update/retirement.
11. Calculation run creation, input change, result generation, review, rejection, and approval.
12. Integrity decision draft, submission, review, rejection, approval, and revision.
13. Report draft generation, manual edit, review, rejection, approval, issuance, export, and revision.
14. Internal work order creation, assignment, approval, status change, completion, cancellation, and closure.
15. n8n workflow event received, sent, failed, retried, and acknowledged.

Each audit log must include `actor_id`, `actor_role`, `action`, `entity_type`, `entity_id`, `timestamp`, `before_value` where applicable, `after_value` where applicable, `reason` where applicable, `source_ip` where available, and `correlation_id`.

### 1.7 Required Validation Rules

1. Asset tag must be unique within an organization.
2. Asset type must be `atmospheric_storage_tank` for MVP engineering workflows.
3. Evidence file metadata must be created only after object storage upload completion is confirmed.
4. Findings, NDT measurements, calculation inputs, integrity decisions, and reports must have evidence links where required.
5. AI extraction output must be stored only in staging tables.
6. AI staging records cannot be promoted without Engineer or Lead Engineer review.
7. Staging promotion must preserve AI original value, corrected value, reviewer, review timestamp, and reason for correction or rejection.
8. Calculation cannot run unless required inputs, units, formula version, and engineering basis are available.
9. Calculation formulas must be selected only from an approved formula registry populated from supplied formulas, explicit engineering basis, or user-approved test fixtures.
10. Calculation output must be reproducible from stored inputs and formula version.
11. Integrity decision cannot be approved by AI or by the same actor if segregation-of-duty is enabled.
12. Report cannot be issued unless required evidence, NDT, finding review, calculation review, integrity decision, and approval gates pass.
13. Work order cannot be closed without completion note and, where required, evidence or closure attachment.
14. n8n webhook payloads must be authenticated and validated before being accepted by AIM.
15. n8n must not be granted PostgreSQL credentials.

### 1.8 Required Test Cases

| Test Type | Required Test Coverage |
|---|---|
| Unit tests | Validators, permission guards, formula registry access, calculation determinism, audit event builder. |
| Integration tests | Evidence upload completion, AI staging review, staging promotion, calculation run, report gate validation, n8n webhook event handling. |
| End-to-end tests | Inspection-to-report journey, AI extraction-to-engineer-review journey, NDT UT import-to-calculation journey, internal work order journey. |
| RBAC tests | Each role can only perform allowed actions. AI and n8n cannot approve or write final engineering data. |
| Audit tests | Required events are written for every critical action. Audit logs are immutable through public APIs. |
| Data integrity tests | Final tables are not populated directly from AI staging without review. Evidence links are mandatory. |
| Report gate tests | Report issue fails when evidence, calculation, review, or approval gates are missing. |
| Calculation tests | Same formula version and inputs always produce identical outputs. Unapproved formula execution is rejected. |
| Security tests | Auth required, signed n8n webhooks, object storage upload restrictions, role escalation prevention. |
| Migration tests | New migrations apply cleanly and can be rolled back where supported. |

### 1.9 Migration / Documentation Updates

1. Add PRD baseline at `01_PRD/AIM_MVP_PRD.md`.
2. Create or update ERD and migration documents to include staging, final, evidence, audit, calculation, report, and work order entities.
3. Create or update OpenAPI specification for all MVP endpoint groups.
4. Create or update n8n workflow documentation proving orchestration-only behavior.
5. Create or update calculation engine documentation before implementing any calculation formula.
6. Create or update test plan and acceptance checklist before sprint execution.

---

## 2. Product Objective

The objective of the AIM+n8n MVP is to deliver a controlled Asset Integrity Management application for atmospheric storage tank inspection workflows where engineering data, evidence, calculations, integrity decisions, report issuance, and work order follow-up are traceable, reviewed by qualified humans, and auditable.

The MVP must help inspection and engineering teams move from fragmented PDFs, spreadsheets, manual notes, and disconnected approvals into a structured AIM workflow that supports:

1. A reliable asset register.
2. Inspection planning and execution workspace.
3. Evidence repository linked to engineering records.
4. AI-assisted extraction into staging.
5. Engineer review before data promotion.
6. NDT UT thickness data room.
7. Deterministic API 653 calculation MVP using only supplied formulas.
8. Human integrity decisions.
9. Controlled report building and issuance.
10. Dashboard KPI visibility.
11. Internal work order fallback before external CMMS integration.

The MVP is not intended to replace qualified engineering judgment. It is intended to improve governance, traceability, data quality, auditability, and workflow efficiency.

---

## 3. Business Problem

Inspection companies and asset owners often manage storage tank integrity using disconnected tools: PDFs, Excel thickness tables, photos, email approvals, scanned reports, and manually created recommendations. This creates recurring problems:

1. **Evidence fragmentation:** Inspection findings, UT measurements, photos, drawings, and report statements are not consistently linked.
2. **Manual data re-entry:** Engineers repeatedly copy values from PDFs and spreadsheets into calculation files and reports.
3. **Review risk:** AI or automated extraction can introduce incorrect values if results are not staged and reviewed.
4. **Calculation governance weakness:** Formula versions, input sources, reviewer actions, and output traceability are often unclear.
5. **Report issuance risk:** Reports may be issued without clear proof that evidence, calculation, review, and approval gates were completed.
6. **Work order gap:** Before SAP/Maximo integration is ready, recommendations may be lost without an internal work order fallback.
7. **Audit difficulty:** It is hard to prove who approved, corrected, rejected, calculated, decided, or issued a report.
8. **Management visibility gap:** Leadership lacks consolidated KPI views across asset status, inspection progress, findings, overdue actions, and report readiness.

The AIM+n8n MVP solves these problems by making AIM the system of record while using n8n only for orchestration, routing, notification, reminders, integration events, and audit event propagation.

---

## 4. Primary Users and Role Descriptions

### 4.1 Admin

Admin users configure business-level master data and operational settings.

**Responsibilities:**

1. Manage organizations, users, roles, and access assignments.
2. Configure asset categories, inspection templates, finding categories, and workflow settings.
3. Monitor system usage and workflow readiness.
4. Support data governance and user administration.

**Restrictions:**

1. Admin may not override engineering review gates unless explicitly assigned an engineering role.
2. Admin may not approve integrity decisions or issued reports unless assigned an Approver role.

### 4.2 Inspector

Inspectors perform field inspection activities and upload evidence.

**Responsibilities:**

1. View assigned inspections.
2. Upload inspection evidence such as PDFs, photos, drawings, UT files, and field notes.
3. Enter field observations and preliminary findings.
4. Submit inspection records for engineering review.
5. Create internal work order requests when permitted.

**Restrictions:**

1. Inspector cannot approve engineering data.
2. Inspector cannot promote AI extraction staging data to final tables unless also assigned Engineer permission.
3. Inspector cannot issue reports.

### 4.3 Engineer

Engineers review extracted data, validate NDT data, run deterministic calculations, create findings, and draft integrity decisions.

**Responsibilities:**

1. Review and correct AI extraction staging records.
2. Promote reviewed staging data into final engineering tables.
3. Validate UT thickness measurements and evidence links.
4. Run deterministic calculations using approved formula versions.
5. Draft integrity decisions and recommendations.
6. Draft or review technical report sections.

**Restrictions:**

1. Engineer cannot issue final reports unless also assigned Approver permission.
2. Engineer cannot use unsupplied or unapproved formulas.
3. Engineer cannot bypass required evidence links.

### 4.4 Lead Engineer

Lead Engineers supervise engineering quality, review calculations, review integrity decisions, and manage technical exceptions.

**Responsibilities:**

1. Review engineer-submitted calculations and integrity decisions.
2. Approve or reject technical packages before formal approval.
3. Resolve technical review comments.
4. Escalate missing evidence, formula gaps, or engineering basis issues.
5. Approve internal work order recommendations when configured.

**Restrictions:**

1. Lead Engineer cannot invent formulas or approve unsupported calculation basis.
2. Lead Engineer cannot issue final reports unless also assigned Approver permission.

### 4.5 Approver

Approvers provide formal authorization for final engineering decisions, report issuance, and selected work order actions.

**Responsibilities:**

1. Review completed evidence, calculations, integrity decisions, and report readiness gates.
2. Approve or reject final report issuance.
3. Approve selected work orders or recommendations according to workflow configuration.
4. Provide rejection reasons and required corrections.

**Restrictions:**

1. Approver cannot rely on AI-only recommendations.
2. Approver cannot issue a report if system gates fail.
3. Approver cannot bypass mandatory audit logging.

### 4.6 Management

Management users consume KPI dashboards and portfolio-level status.

**Responsibilities:**

1. View asset integrity KPIs.
2. Track inspection progress, overdue reviews, report status, and work order status.
3. Monitor risk indicators, action backlog, and operational bottlenecks.

**Restrictions:**

1. Management is read-only by default.
2. Management cannot edit engineering data, approve calculations, or issue reports unless assigned additional roles.

### 4.7 IT Admin

IT Admin users manage technical configuration, integration settings, security controls, and operational monitoring.

**Responsibilities:**

1. Configure authentication, environment variables, webhook secrets, object storage, and observability.
2. Monitor integration health between AIM, n8n, AI services, object storage, and email/notification channels.
3. Manage system backup/restore procedures and security settings.
4. Review technical audit logs.

**Restrictions:**

1. IT Admin cannot edit final engineering data unless assigned engineering permissions.
2. IT Admin cannot approve engineering decisions or issue reports unless assigned business roles.
3. IT Admin must not grant n8n direct PostgreSQL write access.

---

## 5. MVP Scope

### 5.1 Atmospheric Storage Tank

The MVP supports atmospheric storage tank asset integrity workflows only.

**Included:**

1. Tank identity and asset register.
2. Tank location, service, design metadata, and inspection metadata.
3. Tank component grouping such as shell, roof, floor, nozzle, and appurtenances where required by the provided data model.
4. Tank inspection record lifecycle.
5. UT thickness data room and reviewed measurements.
6. Findings and recommendations.
7. API 653 calculation MVP using explicitly supplied formulas only.
8. Report generation and issuance gates.

**Excluded:**

1. Pressure vessel full workflow.
2. Pipeline full workflow.
3. Full API 581 quantitative RBI.
4. Full 3D scan processing.

### 5.2 Asset Register

The asset register is the master structured record for atmospheric storage tanks.

**Capabilities:**

1. Create, view, update, archive, and restore tank assets.
2. Capture asset tag, asset name, site, area, service, owner, status, and tank-specific attributes.
3. Link assets to inspections, evidence, findings, calculations, integrity decisions, reports, and work orders.
4. Enforce uniqueness and required fields.
5. Audit all create/update/archive actions.

### 5.3 Inspection Workspace

The inspection workspace supports planning, execution, data collection, review, and closure.

**Capabilities:**

1. Create inspection plan.
2. Assign inspector and engineer.
3. Define inspection scope and checklist.
4. Upload evidence.
5. Record field observations and preliminary findings.
6. Submit inspection for engineering review.
7. Track status from planned to executed to reviewed to closed.
8. Trigger n8n notifications and reminders through AIM events.

### 5.4 Evidence Repository

The evidence repository stores original files in object storage and stores metadata in PostgreSQL.

**Capabilities:**

1. Upload original PDFs, photos, drawings, NDT files, spreadsheets, and report attachments.
2. Store metadata such as file type, uploader, timestamp, checksum, asset, inspection, page/section reference, and object storage path.
3. Link evidence to findings, NDT measurements, calculations, integrity decisions, reports, and work orders.
4. Provide preview/download permissions.
5. Maintain evidence immutability after finalization, with versioning for replacements or superseded files.

### 5.5 AI Extraction Staging Review

AI extraction helps convert evidence files into candidate structured data but never writes directly to final engineering tables.

**Capabilities:**

1. Create AI extraction jobs from selected evidence files.
2. Store AI output in staging tables.
3. Display extracted values with confidence scores, source evidence links, and page/section references.
4. Allow Engineer or Lead Engineer to accept, correct, reject, or request re-extraction.
5. Promote only reviewed and accepted records into final tables.
6. Preserve original AI value, corrected value, reviewer, timestamp, reason, and evidence link.

### 5.6 NDT UT Thickness Data Room

The NDT UT thickness data room manages reviewed thickness measurements.

**Capabilities:**

1. Import UT thickness data from structured files or reviewed staging records.
2. Capture component, course/plate/zone, CML/TML where applicable, measurement point, nominal thickness where supplied, measured thickness, units, inspection date, method, technician/company, and evidence link.
3. Validate units, numeric ranges, duplicates, missing values, and evidence references.
4. Display measurement grids and status.
5. Support engineer review and correction.
6. Provide calculation-ready input sets only after review.

### 5.7 API 653 Calculation MVP Using Explicitly Supplied Formulas Only

The MVP includes deterministic calculation support for API 653-related workflows, but only where formulas are explicitly supplied by the approved workbook, explicit engineering basis, or user-approved test fixtures.

**Capabilities:**

1. Maintain a formula registry with formula ID, name, description, allowed asset type, source reference metadata, version, status, input schema, output schema, unit requirements, and test fixtures.
2. Execute deterministic calculations using stored formulas and validated inputs.
3. Store calculation runs with full input snapshot, output snapshot, formula version, actor, timestamp, and evidence links.
4. Block execution when formula is missing, retired, unsupported, or not approved.
5. Support engineer review and lead engineer approval of calculation results.
6. Prevent AI from creating, approving, or silently modifying formulas.

**Important restriction:** This PRD does not define or reproduce API/ASME formulas. Formula implementation must be done only after approved formulas are supplied.

### 5.8 Integrity Decision

Integrity decisions are human engineering decisions based on reviewed evidence, reviewed data, and approved calculation results.

**Capabilities:**

1. Draft integrity decision linked to asset and inspection record.
2. Reference findings, UT data, calculation runs, evidence, and recommendations.
3. Support decision statuses such as draft, submitted, under review, approved, rejected, revised, and superseded.
4. Require human reviewer/approver action.
5. Audit all decision changes.

### 5.9 Report Builder

The report builder creates controlled inspection/integrity reports.

**Capabilities:**

1. Generate report draft from reviewed asset data, inspection records, evidence, findings, calculations, and integrity decisions.
2. Allow manual editing of report sections with audit logs.
3. Track report status from draft to review to approved to issued.
4. Export PDF/DOCX where technically supported.
5. Block issuance unless required gates are complete.
6. Store issued report metadata, version, checksum, issue timestamp, and approver.

### 5.10 Dashboard KPI

The dashboard provides portfolio and workflow visibility.

**Capabilities:**

1. Asset count by status.
2. Inspection progress by status.
3. AI staging review queue count.
4. Pending engineering review count.
5. Pending calculation review count.
6. Report readiness and issued report count.
7. Overdue internal work orders.
8. Findings by severity/status.
9. Evidence completeness status.
10. Audit and workflow exception indicators for authorized users.

### 5.11 Internal Work Order Fallback

The MVP must include internal work orders before external SAP/Maximo/CMMS integration.

**Capabilities:**

1. Create work order from finding, recommendation, integrity decision, or report action item.
2. Assign owner, due date, priority, status, and required evidence.
3. Track status from draft to assigned to in progress to completed to verified to closed.
4. Link work order to asset, inspection, finding, evidence, report, and decision.
5. Trigger reminders and notifications through n8n.
6. Export or prepare future integration payload for external CMMS.

---

## 6. Explicit Out-of-Scope

The following are explicitly out-of-scope for the MVP:

1. **Full API 581 quantitative RBI.** MVP may store simple qualitative indicators or fixtures for future RBI, but full quantitative API 581 implementation is excluded.
2. **Full SAP/Maximo production integration.** MVP must include internal work order fallback and may prepare future integration events, but production-grade SAP/Maximo integration is excluded.
3. **Full 3D scan processing.** MVP may store 3D files as evidence, but automated 3D scan processing, mesh analysis, and 3D defect extraction are excluded.
4. **AI-only approval.** AI cannot approve engineering data, calculations, integrity decisions, work orders, or reports.
5. **Automatic engineering decision without review.** No automated final integrity decision is allowed without qualified human review and approval.
6. **Pressure vessel and pipeline complete workflows.** These may be future roadmap modules but are excluded from this MVP.
7. **Unapproved formula library.** No calculation formulas may be implemented without provided workbook, explicit engineering basis, or user-approved test fixtures.
8. **Direct n8n database integration.** n8n must not write directly to PostgreSQL and must not store final engineering records.

---

## 7. User Journeys

### 7.1 Journey 1 — Admin Configures MVP Workspace

1. Admin creates organization/site configuration.
2. Admin creates users and assigns roles.
3. Admin configures inspection templates and workflow defaults.
4. Admin verifies that audit logging and object storage are active.
5. System writes audit logs for all configuration changes.

**Success outcome:** Users can access only permitted modules, and system configuration is auditable.

### 7.2 Journey 2 — Inspector Creates Inspection Record and Uploads Evidence

1. Inspector opens assigned inspection plan.
2. Inspector records field observations.
3. Inspector uploads PDF, photos, UT data files, drawings, and other evidence.
4. AIM stores files in object storage and metadata in PostgreSQL.
5. Inspector links evidence to asset and inspection record.
6. Inspector submits inspection record for engineering review.
7. AIM emits workflow event for n8n notification.

**Success outcome:** Inspection package is ready for engineering review with evidence links.

### 7.3 Journey 3 — AI Extracts Candidate Data into Staging

1. Engineer or Inspector requests AI extraction for selected evidence.
2. AIM creates AI extraction job.
3. AI service processes evidence and returns extracted candidate values.
4. AIM stores extracted data in `ai_extraction_staging` only.
5. Engineer reviews extraction results with source evidence context.
6. Engineer accepts, corrects, or rejects each record.
7. Accepted records are promoted to final tables only after review.

**Success outcome:** AI accelerates data capture without bypassing engineering review.

### 7.4 Journey 4 — Engineer Reviews UT Thickness Data

1. Engineer opens NDT UT data room for an asset/inspection.
2. Engineer imports UT data from reviewed staging or structured file.
3. System validates units, missing values, duplicate points, and evidence links.
4. Engineer corrects or rejects invalid measurements.
5. Engineer finalizes reviewed UT dataset.
6. System writes audit logs and marks data calculation-ready.

**Success outcome:** Reviewed UT data is available for deterministic calculation.

### 7.5 Journey 5 — Engineer Runs API 653 Calculation MVP

1. Engineer selects an approved formula from the formula registry.
2. System loads required input schema.
3. Engineer selects reviewed input data and evidence references.
4. System validates input completeness and units.
5. Calculation engine executes deterministic calculation.
6. System stores calculation run, inputs, outputs, formula version, and evidence references.
7. Engineer submits result for Lead Engineer review.
8. Lead Engineer approves or rejects with comments.

**Success outcome:** Calculation output is reproducible, reviewed, versioned, and auditable.

### 7.6 Journey 6 — Engineer Creates Integrity Decision

1. Engineer opens reviewed inspection package.
2. Engineer references findings, reviewed UT data, calculation runs, and evidence.
3. Engineer drafts integrity decision and recommendation.
4. Engineer submits decision to Lead Engineer or Approver.
5. Reviewer approves, rejects, or requests revision.
6. System writes audit logs.

**Success outcome:** Integrity decision is human-reviewed and evidence-linked.

### 7.7 Journey 7 — Report Builder Issues Controlled Report

1. Engineer creates report draft from reviewed data.
2. Report builder pulls approved asset, inspection, NDT, finding, calculation, decision, and evidence references.
3. Engineer edits report sections.
4. System checks report readiness gates.
5. Engineer submits report for approval.
6. Approver reviews and approves issuance.
7. System exports issued report and stores export metadata.
8. System writes audit logs.

**Success outcome:** Report is issued only after required gates are complete.

### 7.8 Journey 8 — Internal Work Order Fallback

1. Engineer creates work order from finding or integrity recommendation.
2. Work order is linked to asset, finding, evidence, and report where applicable.
3. Responsible owner is assigned.
4. n8n sends notification and reminder based on AIM workflow event.
5. Work owner updates progress.
6. Engineer or Approver verifies completion.
7. Work order is closed with completion note and required evidence.

**Success outcome:** Recommendations are converted into traceable actions even before CMMS integration.

### 7.9 Journey 9 — Management Reviews KPI Dashboard

1. Management opens dashboard.
2. System displays asset, inspection, finding, report, review, and work order KPIs.
3. Management filters by site, asset, inspection status, due date, and severity.
4. Management exports or reviews summary where permitted.

**Success outcome:** Leadership can monitor portfolio status without editing engineering records.

### 7.10 Journey 10 — IT Admin Monitors Integration Boundary

1. IT Admin reviews workflow event logs.
2. IT Admin verifies n8n webhook health and retry status.
3. IT Admin confirms no n8n direct PostgreSQL credentials exist.
4. IT Admin monitors object storage connectivity and audit events.

**Success outcome:** AIM/n8n boundary is operationally visible and enforceable.

---

## 8. MVP Success Criteria

The MVP is successful when all criteria below are met.

### 8.1 Product Success Criteria

1. Users can register atmospheric storage tank assets.
2. Inspectors can create and complete inspection records with evidence uploads.
3. Evidence files are stored in object storage, with metadata and links in PostgreSQL.
4. AI extraction creates staging records only.
5. Engineers can review, correct, reject, and promote AI staging data.
6. Reviewed UT thickness data can be managed in the NDT UT data room.
7. Calculation engine can run approved deterministic formula workflows using supplied formulas only.
8. Integrity decisions can be drafted, reviewed, approved, rejected, and revised.
9. Reports can be built, reviewed, approved, issued, and exported only after gates pass.
10. Internal work orders can be created, assigned, tracked, verified, and closed.
11. Dashboard KPIs show meaningful operational status.

### 8.2 Governance Success Criteria

1. n8n does not write directly to PostgreSQL.
2. AI does not write directly to final engineering tables.
3. AI cannot approve anything.
4. Reports cannot be issued when required evidence, calculation, review, or approval gates are missing.
5. Every critical action produces an audit log.
6. Calculation runs are deterministic and versioned.
7. Engineering data is evidence-linked.
8. Work order fallback exists before external CMMS integration.

### 8.3 Engineering Readiness Criteria

1. Migration scripts apply cleanly.
2. API contract is documented.
3. RBAC tests pass.
4. Audit tests pass.
5. Calculation determinism tests pass.
6. E2E inspection-to-report workflow passes.
7. Developer handoff documentation is complete.
8. Deployment configuration separates AIM backend, PostgreSQL, object storage, n8n, and AI service.

---

## 9. Functional Requirements by Module

### 9.1 Module A — User, Role, and Permission Management

| Requirement ID | Requirement | Priority |
|---|---|---|
| AIM-MVP-AUTH-001 | System shall authenticate users before granting access. | Must |
| AIM-MVP-AUTH-002 | System shall support role-based access control for Admin, Inspector, Engineer, Lead Engineer, Approver, Management, and IT Admin. | Must |
| AIM-MVP-AUTH-003 | System shall enforce permission checks at API and UI layers. | Must |
| AIM-MVP-AUTH-004 | System shall write audit logs for role assignment changes. | Must |
| AIM-MVP-AUTH-005 | System shall prevent unauthorized users from approving calculations, decisions, reports, and work orders. | Must |

### 9.2 Module B — Asset Register

| Requirement ID | Requirement | Priority |
|---|---|---|
| AIM-MVP-ASSET-001 | System shall create atmospheric storage tank asset records. | Must |
| AIM-MVP-ASSET-002 | System shall enforce unique asset tag per organization. | Must |
| AIM-MVP-ASSET-003 | System shall store tank-specific attributes separately from common asset attributes. | Must |
| AIM-MVP-ASSET-004 | System shall allow asset search, filter, and detail view. | Must |
| AIM-MVP-ASSET-005 | System shall link assets to inspections, evidence, findings, calculations, reports, and work orders. | Must |
| AIM-MVP-ASSET-006 | System shall audit all asset create/update/archive actions. | Must |

### 9.3 Module C — Inspection Workspace

| Requirement ID | Requirement | Priority |
|---|---|---|
| AIM-MVP-INSP-001 | System shall create inspection plans for atmospheric storage tanks. | Must |
| AIM-MVP-INSP-002 | System shall assign inspectors and engineers to inspections. | Must |
| AIM-MVP-INSP-003 | System shall support inspection checklist and scope fields. | Should |
| AIM-MVP-INSP-004 | System shall track inspection status lifecycle. | Must |
| AIM-MVP-INSP-005 | System shall allow evidence upload and linking from inspection workspace. | Must |
| AIM-MVP-INSP-006 | System shall submit inspection records for engineering review. | Must |
| AIM-MVP-INSP-007 | System shall emit workflow events for n8n notifications. | Must |

### 9.4 Module D — Evidence Repository

| Requirement ID | Requirement | Priority |
|---|---|---|
| AIM-MVP-EVD-001 | System shall store original evidence files in object storage. | Must |
| AIM-MVP-EVD-002 | System shall store evidence metadata in PostgreSQL. | Must |
| AIM-MVP-EVD-003 | System shall generate upload URL or equivalent upload flow. | Must |
| AIM-MVP-EVD-004 | System shall compute or store file checksum where technically feasible. | Should |
| AIM-MVP-EVD-005 | System shall link evidence to engineering entities. | Must |
| AIM-MVP-EVD-006 | System shall prevent deletion of evidence linked to final issued reports unless superseded through controlled process. | Must |
| AIM-MVP-EVD-007 | System shall audit evidence upload, link, unlink, and access events where feasible. | Must |

### 9.5 Module E — AI Extraction Staging Review

| Requirement ID | Requirement | Priority |
|---|---|---|
| AIM-MVP-AI-001 | System shall create AI extraction jobs from selected evidence files. | Must |
| AIM-MVP-AI-002 | System shall store AI outputs only in staging tables. | Must |
| AIM-MVP-AI-003 | System shall display AI extracted values with source evidence and confidence metadata. | Must |
| AIM-MVP-AI-004 | System shall allow Engineer/Lead Engineer to accept, correct, or reject staging records. | Must |
| AIM-MVP-AI-005 | System shall promote accepted staging records to final tables only after review. | Must |
| AIM-MVP-AI-006 | System shall audit AI extraction, review, correction, rejection, and promotion. | Must |
| AIM-MVP-AI-007 | System shall prevent AI from approving engineering data, calculations, decisions, or reports. | Must |

### 9.6 Module F — NDT UT Thickness Data Room

| Requirement ID | Requirement | Priority |
|---|---|---|
| AIM-MVP-NDT-001 | System shall create UT data groups by asset and inspection. | Must |
| AIM-MVP-NDT-002 | System shall import UT measurement data from reviewed staging or structured file. | Must |
| AIM-MVP-NDT-003 | System shall validate numeric values, units, missing fields, duplicate measurement points, and evidence links. | Must |
| AIM-MVP-NDT-004 | System shall allow Engineer to review and correct UT measurements. | Must |
| AIM-MVP-NDT-005 | System shall mark reviewed UT data as calculation-ready. | Must |
| AIM-MVP-NDT-006 | System shall audit import, correction, review, and finalization actions. | Must |

### 9.7 Module G — API 653 Calculation MVP

| Requirement ID | Requirement | Priority |
|---|---|---|
| AIM-MVP-CALC-001 | System shall provide an approved formula registry. | Must |
| AIM-MVP-CALC-002 | System shall reject calculation execution for missing, retired, unsupported, or unapproved formulas. | Must |
| AIM-MVP-CALC-003 | System shall execute calculations deterministically from stored formula version and input snapshot. | Must |
| AIM-MVP-CALC-004 | System shall store calculation input values, units, formula version, outputs, evidence links, and actor metadata. | Must |
| AIM-MVP-CALC-005 | System shall support calculation review and approval workflow. | Must |
| AIM-MVP-CALC-006 | System shall include automated tests for approved formulas before deployment. | Must |
| AIM-MVP-CALC-007 | System shall not implement API/ASME formulas unless explicitly supplied. | Must |

### 9.8 Module H — Findings and Recommendations

| Requirement ID | Requirement | Priority |
|---|---|---|
| AIM-MVP-FIND-001 | System shall create findings linked to asset and inspection. | Must |
| AIM-MVP-FIND-002 | System shall require evidence link for findings. | Must |
| AIM-MVP-FIND-003 | System shall support severity, category, status, recommendation, and due date. | Must |
| AIM-MVP-FIND-004 | System shall support engineering review of findings. | Must |
| AIM-MVP-FIND-005 | System shall allow findings to create internal work orders. | Must |
| AIM-MVP-FIND-006 | System shall audit finding creation, correction, review, and closure. | Must |

### 9.9 Module I — Integrity Decision

| Requirement ID | Requirement | Priority |
|---|---|---|
| AIM-MVP-DEC-001 | System shall create integrity decisions linked to asset and inspection. | Must |
| AIM-MVP-DEC-002 | System shall require references to reviewed evidence, findings, NDT data, and calculations where applicable. | Must |
| AIM-MVP-DEC-003 | System shall support decision review and approval workflow. | Must |
| AIM-MVP-DEC-004 | System shall prevent AI-only or automatic final decision approval. | Must |
| AIM-MVP-DEC-005 | System shall audit decision creation, revision, approval, rejection, and supersession. | Must |

### 9.10 Module J — Report Builder

| Requirement ID | Requirement | Priority |
|---|---|---|
| AIM-MVP-RPT-001 | System shall create report drafts from reviewed AIM data. | Must |
| AIM-MVP-RPT-002 | System shall support editable report sections. | Must |
| AIM-MVP-RPT-003 | System shall validate report readiness gates before approval and issuance. | Must |
| AIM-MVP-RPT-004 | System shall prevent report issuance when required evidence, calculation, review, or approval is missing. | Must |
| AIM-MVP-RPT-005 | System shall support PDF/DOCX export where technically available. | Should |
| AIM-MVP-RPT-006 | System shall store issued report metadata, version, checksum, and approver. | Must |
| AIM-MVP-RPT-007 | System shall audit draft generation, edit, review, approval, issuance, and export. | Must |

### 9.11 Module K — Dashboard KPI

| Requirement ID | Requirement | Priority |
|---|---|---|
| AIM-MVP-KPI-001 | System shall display asset count by status. | Must |
| AIM-MVP-KPI-002 | System shall display inspection progress by status. | Must |
| AIM-MVP-KPI-003 | System shall display pending AI staging review count. | Must |
| AIM-MVP-KPI-004 | System shall display pending engineering review and calculation review count. | Must |
| AIM-MVP-KPI-005 | System shall display report readiness and issued report count. | Must |
| AIM-MVP-KPI-006 | System shall display internal work order status and overdue count. | Must |
| AIM-MVP-KPI-007 | System shall apply role-based visibility to dashboard data. | Must |

### 9.12 Module L — Internal Work Order Fallback

| Requirement ID | Requirement | Priority |
|---|---|---|
| AIM-MVP-WO-001 | System shall create internal work orders from findings, decisions, recommendations, or reports. | Must |
| AIM-MVP-WO-002 | System shall link work orders to asset, inspection, finding, evidence, decision, and report where applicable. | Must |
| AIM-MVP-WO-003 | System shall support assignment, priority, due date, status, and completion evidence. | Must |
| AIM-MVP-WO-004 | System shall support work order approval or verification where configured. | Must |
| AIM-MVP-WO-005 | System shall emit workflow events for n8n reminders and notifications. | Must |
| AIM-MVP-WO-006 | System shall audit work order creation, status changes, completion, verification, and closure. | Must |

### 9.13 Module M — n8n Orchestration Boundary

| Requirement ID | Requirement | Priority |
|---|---|---|
| AIM-MVP-N8N-001 | AIM shall emit workflow events for n8n to route notifications, reminders, approvals, and integration messages. | Must |
| AIM-MVP-N8N-002 | n8n shall call AIM APIs for permitted workflow actions. | Must |
| AIM-MVP-N8N-003 | n8n shall not write directly to PostgreSQL. | Must |
| AIM-MVP-N8N-004 | n8n shall not store final engineering records. | Must |
| AIM-MVP-N8N-005 | AIM shall authenticate and validate webhook calls from n8n. | Must |
| AIM-MVP-N8N-006 | AIM shall log workflow events, retries, failures, and acknowledgments. | Must |

### 9.14 Module N — Audit and Compliance

| Requirement ID | Requirement | Priority |
|---|---|---|
| AIM-MVP-AUD-001 | System shall write audit logs for all critical actions listed in this PRD. | Must |
| AIM-MVP-AUD-002 | System shall make audit logs immutable through public APIs. | Must |
| AIM-MVP-AUD-003 | System shall support audit filtering by actor, entity, action, date, and correlation ID. | Should |
| AIM-MVP-AUD-004 | System shall preserve before/after values where applicable. | Must |
| AIM-MVP-AUD-005 | System shall expose audit logs only to authorized roles. | Must |

---

## 10. Non-Functional Requirements

### 10.1 Security

1. Authentication is required for all application access.
2. RBAC must be enforced at backend API level and reflected in frontend UI.
3. Object storage access must use signed URLs or controlled download endpoints.
4. n8n webhook calls must be authenticated using shared secret, signature, mTLS, or equivalent mechanism.
5. Secrets must not be stored in source code.
6. n8n must not receive PostgreSQL write credentials.
7. Audit logs must not expose sensitive secrets or raw credentials.

### 10.2 Auditability

1. Critical actions must create immutable audit logs.
2. Audit records must include correlation IDs across AIM, AI service, n8n, and report export actions.
3. Issued reports must reference the exact approved data, calculation runs, decisions, and evidence versions used at issuance time.
4. Calculation runs must be reproducible from stored input snapshots and formula versions.

### 10.3 Data Integrity

1. AI staging and final engineering tables must be separated.
2. Final engineering records must require human review metadata when sourced from AI extraction.
3. Evidence links must be mandatory for engineering records where required.
4. Data corrections must preserve original value, corrected value, actor, timestamp, and reason.
5. Report-issued snapshots must not silently change when upstream data is later revised.

### 10.4 Performance

1. Dashboard KPI endpoint should return within acceptable operational latency for MVP datasets.
2. Asset list and inspection list should support pagination.
3. Evidence upload should support large files through object storage upload flow rather than direct database storage.
4. Long-running AI extraction and report export should be asynchronous or job-based.

### 10.5 Availability and Resilience

1. AIM backend, PostgreSQL, object storage, n8n, and AI services should be deployable as separate services.
2. Failure of AI extraction must not block manual data entry.
3. Failure of n8n notification must not corrupt AIM records.
4. Workflow event retries should be visible to IT Admin.
5. Object storage upload failure must prevent evidence metadata finalization.

### 10.6 Maintainability

1. API contracts must be documented.
2. Database migrations must be version controlled.
3. Calculation formulas must be versioned and tested.
4. Business rules and validation gates must be centralized where feasible.
5. Code must distinguish staging data, final data, evidence metadata, and audit logs clearly.

### 10.7 Usability

1. Users must see clear statuses for inspection, staging review, calculation review, integrity decision, report readiness, and work orders.
2. Users must be prevented from taking unauthorized actions rather than discovering failures after submission.
3. Evidence preview and links must be easy to access from findings, NDT measurements, calculations, decisions, and reports.
4. Review screens must show original AI value, corrected value, evidence source, and confidence metadata where available.

### 10.8 Compliance and Engineering Governance

1. The system must not claim compliance with formulas not implemented from approved sources.
2. API/ASME standard text must not be reproduced in the application unless properly licensed and approved.
3. The system must clearly show calculation basis, formula source metadata, and version.
4. Human approval must remain mandatory for final engineering outcomes.

---

## 11. Acceptance Criteria

### 11.1 System Boundary Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| AC-BND-001 | n8n workflow is configured | n8n needs to update workflow state | n8n calls AIM API and does not write directly to PostgreSQL. |
| AC-BND-002 | AI extraction completes | AI returns candidate values | AIM stores values in staging only. |
| AC-BND-003 | AI extraction generated staging data | No engineer review exists | System blocks promotion to final engineering tables. |
| AC-BND-004 | User attempts to issue report | Required gate is incomplete | System blocks issuance and displays missing gate. |

### 11.2 Asset Register Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| AC-ASSET-001 | Admin or Engineer has permission | User creates tank asset with required fields | System creates asset and writes audit log. |
| AC-ASSET-002 | Asset tag already exists in organization | User creates duplicate tag | System rejects request with validation error. |
| AC-ASSET-003 | Management views asset list | User has read permission only | System displays assets but hides edit controls. |

### 11.3 Evidence Repository Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| AC-EVD-001 | User uploads evidence | Object storage upload completes | AIM stores metadata and checksum/status. |
| AC-EVD-002 | Evidence upload fails | User tries to finalize metadata | System rejects finalization. |
| AC-EVD-003 | Finding requires evidence | User saves finding without evidence link | System rejects request. |
| AC-EVD-004 | Evidence is linked to issued report | User attempts uncontrolled deletion | System blocks deletion or requires controlled supersession. |

### 11.4 AI Staging Review Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| AC-AI-001 | Evidence exists | User requests AI extraction | System creates AI extraction job. |
| AC-AI-002 | AI returns output | Job completes | System stores extracted values in staging tables only. |
| AC-AI-003 | Engineer reviews staging row | Engineer corrects value | System records original value, corrected value, reviewer, reason, timestamp, and audit log. |
| AC-AI-004 | Inspector without permission reviews staging | Inspector attempts promotion | System denies action. |

### 11.5 NDT UT Data Room Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| AC-NDT-001 | Reviewed UT data exists | Engineer imports to UT data room | System validates and stores final measurements. |
| AC-NDT-002 | UT row has missing measurement unit | User submits import | System rejects or flags row for correction. |
| AC-NDT-003 | UT row lacks required evidence link | Engineer finalizes dataset | System blocks finalization. |
| AC-NDT-004 | UT dataset is reviewed | Engineer marks calculation-ready | System writes audit log and exposes dataset to calculation engine. |

### 11.6 Calculation Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| AC-CALC-001 | Formula is not approved | Engineer tries to run calculation | System rejects calculation. |
| AC-CALC-002 | Formula is approved and inputs are valid | Engineer runs calculation | System stores deterministic output with formula version and input snapshot. |
| AC-CALC-003 | Same inputs and formula version are used | Calculation is rerun | System returns identical output. |
| AC-CALC-004 | Calculation result exists | Lead Engineer reviews result | System records approval/rejection and audit log. |
| AC-CALC-005 | AI attempts approval | AI approval event is received | System rejects action. |

### 11.7 Integrity Decision Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| AC-DEC-001 | Reviewed evidence and calculation exist | Engineer creates decision | System allows draft with links. |
| AC-DEC-002 | Decision lacks required calculation reference | User submits for approval | System blocks submission or marks missing requirement. |
| AC-DEC-003 | Approver reviews decision | Approver rejects decision | System records rejection reason and audit log. |
| AC-DEC-004 | AI attempts to approve decision | System receives action | System rejects action. |

### 11.8 Report Builder Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| AC-RPT-001 | Reviewed data exists | Engineer creates report draft | System generates draft from reviewed data only. |
| AC-RPT-002 | Report has missing evidence gate | Approver attempts issue | System blocks issuance. |
| AC-RPT-003 | All gates pass | Approver issues report | System exports report, stores metadata, and writes audit log. |
| AC-RPT-004 | Report is issued | Upstream finding later changes | Issued report snapshot remains unchanged unless revised through controlled process. |

### 11.9 Internal Work Order Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| AC-WO-001 | Finding has recommendation | Engineer creates work order | System links work order to finding, asset, inspection, and evidence. |
| AC-WO-002 | Work order is assigned | Due date approaches | AIM emits workflow event for n8n reminder. |
| AC-WO-003 | Work order lacks completion note | User tries to close | System blocks closure. |
| AC-WO-004 | Completion evidence is required | User closes without evidence | System blocks closure. |

### 11.10 Dashboard Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| AC-KPI-001 | User has dashboard permission | User opens dashboard | System displays KPI cards by role visibility. |
| AC-KPI-002 | Management opens dashboard | Management clicks engineering edit action | System does not provide edit action. |
| AC-KPI-003 | Pending staging reviews exist | Dashboard loads | System displays pending staging review count. |

---

## 12. Open Questions

1. What is the approved initial formula workbook for API 653 MVP calculations?
2. Which exact API 653 calculation cases are required for MVP release 1?
3. What is the minimum required tank metadata set for the first pilot client?
4. What evidence file types and maximum file sizes must be supported in MVP?
5. Should issued reports be generated as PDF only, DOCX only, or both?
6. What is the required report template and section structure?
7. What identity provider will be used: local auth, Google/Microsoft SSO, or enterprise SSO?
8. What object storage will be used: AWS S3, MinIO, Azure Blob, Google Cloud Storage, or other?
9. What deployment target is preferred: Docker Compose, Kubernetes, cloud PaaS, or on-premise VM?
10. What level of segregation-of-duty is required between Engineer, Lead Engineer, and Approver?
11. Should AI extraction be enabled in MVP release 1 or feature-flagged until governance review?
12. What exact n8n workflows are required for the first release: notifications, reminders, approvals, report issuance, work order reminders, or all?
13. Should internal work orders support cost estimate, material list, and manpower estimate in MVP?
14. What KPI definitions are required for management dashboard?
15. What retention and archival policy is required for evidence files and audit logs?

---

## 13. Risks and Assumptions

### 13.1 Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Formula source not supplied | Calculation MVP cannot be completed safely | Block formula implementation until workbook or approved basis is provided. |
| AI extraction errors | Incorrect engineering data if not reviewed | Enforce staging-only AI output and mandatory engineer review. |
| Evidence not linked | Reports and decisions lose traceability | Enforce evidence link validation gates. |
| n8n direct DB access accidentally granted | Violates system-of-record boundary | Do not provision DB credentials to n8n; test and document integration boundary. |
| Report issued without review | Engineering governance failure | Implement hard report gates and audit tests. |
| RBAC too permissive | Unauthorized approval or data changes | Implement permission matrix and automated RBAC tests. |
| Large evidence files overload backend | Performance and storage issues | Use object storage upload flow and metadata-only DB records. |
| Undefined approval workflow | Implementation ambiguity | Define status lifecycle and approval rules before sprint execution. |
| Weak audit immutability | Compliance and trust issue | Restrict audit mutation APIs; use append-only pattern. |
| External CMMS delayed | Recommendations not tracked | Include internal work order fallback in MVP. |

### 13.2 Assumptions

1. The first MVP release is focused on atmospheric storage tank workflows.
2. API 653 calculation formulas will be supplied separately through approved workbook, explicit engineering basis, or approved test fixtures.
3. The first MVP can use internal work orders instead of SAP/Maximo integration.
4. AI extraction is used to accelerate data entry but not to approve or finalize engineering data.
5. Management dashboard KPIs can be derived from AIM PostgreSQL records.
6. Evidence files are stored in object storage and not as PostgreSQL binary blobs.
7. The application can be deployed as separate services for AIM backend, PostgreSQL, object storage, n8n, and AI service.

---

## 14. Developer Handoff Notes

### 14.1 Recommended Repository Structure

```text
01_PRD/
  AIM_MVP_PRD.md
02_ARCHITECTURE/
  AIM_System_Architecture.md
03_DATA_MODEL/
  AIM_PostgreSQL_ERD.md
04_API/
  AIM_OpenAPI.yaml
05_WORKFLOWS/
  n8n_AIM_Workflows.md
06_CALCULATION/
  API653_Calculation_Engine_MVP.md
07_SECURITY/
  AIM_RBAC_Audit_Model.md
08_QA/
  AIM_MVP_Test_Plan.md
apps/
  web/
  api/
services/
  calculation-engine/
  ai-extraction-service/
  workflow-adapter/
infra/
  docker-compose.yml
  migrations/
```

### 14.2 Implementation Sequencing Recommendation

1. Implement RBAC, audit log, organization/user foundation.
2. Implement asset register and tank details.
3. Implement evidence repository and object storage upload flow.
4. Implement inspection workspace.
5. Implement AI extraction job and staging review workflow.
6. Implement NDT UT data room.
7. Implement formula registry and deterministic calculation runner with test fixtures.
8. Implement findings and integrity decision workflow.
9. Implement report builder and issuance gates.
10. Implement internal work order fallback.
11. Implement dashboard KPIs.
12. Implement n8n workflow events and notification/reminder orchestration.

### 14.3 Mandatory Engineering Controls for Codex Implementation

Before implementing or editing any AIM feature, Codex must state:

1. Assumptions.
2. Impacted documents.
3. Impacted tables.
4. Impacted endpoints.
5. Required permissions.
6. Required audit events.
7. Required validation rules.
8. Required test cases.
9. Migration or documentation updates.

For every deliverable, Codex must:

1. Explain what changed.
2. Provide run/test commands where applicable.
3. Update documentation if behavior changes.
4. Preserve the AIM/n8n boundary.

---

## 15. Suggested Run/Test Commands

Exact commands depend on the selected stack. For a typical Node/TypeScript + PostgreSQL implementation, use equivalent commands:

```bash
# Install dependencies
pnpm install

# Run static checks
pnpm lint
pnpm typecheck

# Run database migrations
pnpm db:migrate

# Run unit tests
pnpm test:unit

# Run integration tests
pnpm test:integration

# Run end-to-end tests
pnpm test:e2e

# Run calculation determinism tests
pnpm test:calculation

# Run RBAC and audit tests
pnpm test:security
pnpm test:audit

# Start local stack
pnpm dev
```

For Docker Compose-based local development:

```bash
# Start AIM, PostgreSQL, object storage, n8n, and supporting services
docker compose up -d

# View logs
docker compose logs -f

# Stop local stack
docker compose down
```

---

## 16. Delivery Notes

### 16.1 What Changed

This document creates the implementation-ready MVP PRD for AIM+n8n, covering product objectives, users, MVP scope, explicit exclusions, user journeys, success criteria, functional requirements, non-functional requirements, acceptance criteria, open questions, risks, and developer handoff controls.

### 16.2 AIM / n8n Boundary Confirmation

This PRD preserves the required boundary:

1. AIM is the system of record.
2. PostgreSQL stores final structured engineering data.
3. Object storage stores original evidence files.
4. n8n orchestrates workflow events only.
5. n8n does not store final engineering data.
6. n8n does not write directly to PostgreSQL.
7. AI writes only to staging.
8. Engineer review is mandatory before promotion to final data.

### 16.3 Documentation Updates

This PRD should be committed as:

```text
01_PRD/AIM_MVP_PRD.md
```

Related architecture, ERD, API, workflow, security, calculation, and QA documents should be created or updated based on this PRD.

