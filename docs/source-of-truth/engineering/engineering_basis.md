# AIM Calculation and Integrity Decision MVP — Engineering Basis

**Document path:** `07_Calculation/engineering_basis.md`  
**Project:** AIM+n8n MVP  
**Document owner:** Engineering / Integrity Governance  
**Status:** Draft for implementation handoff  
**Version:** Rev. 0.1  
**Last updated:** 2026-06-11

---

## 0. Pre-Implementation Governance Check

### Assumptions

1. AIM is the system of record for asset integrity data, engineering review status, calculation results, integrity decisions, report status, and internal work orders.
2. PostgreSQL stores final structured engineering data after mandatory engineer review and approval.
3. Object storage stores original evidence files, including PDF reports, NDT sheets, UT readings, photos, drawings, screenshots, and supporting documents.
4. n8n is used only for workflow orchestration: trigger, routing, reminder, approval notification, integration handoff, and audit event dispatch.
5. n8n must not store final engineering data and must not write directly to PostgreSQL final engineering tables.
6. AI extraction output must go to staging first and must never be written directly to final engineering tables.
7. Engineer review is mandatory before extracted or calculated data is promoted, accepted, used in final reports, or used for integrity decisions.
8. Calculation formulas must be deterministic, testable, versioned, and auditable.
9. No API/ASME copyrighted standard clauses are reproduced in this document.
10. No formula is invented from standards. MVP formulas may only come from an engineer-approved formula registry, a provided workbook, or user-approved test fixtures.
11. Evidence linkage is mandatory for measurements, calculations, findings, integrity decisions, and issued reports.
12. The MVP covers atmospheric storage tanks only.

### Impacted Documents

| Document | Impact |
|---|---|
| `01_PRD/AIM_MVP_PRD.md` | This engineering basis supports the calculation and integrity decision scope defined in the PRD. |
| `07_Calculation/engineering_basis.md` | New source-of-truth document for MVP engineering assumptions, data requirements, evidence requirements, formula governance, and review authority. |
| Future `07_Calculation/formula_registry.md` | Must reference this document and list only approved formulas, parameters, units, test cases, and version metadata. |
| Future `07_Calculation/calculation_test_fixtures.md` | Must provide engineer-approved test cases for corrosion rate, remaining life, and threshold-based status logic. |
| Future API documentation | Must implement the validation, review, approval, and audit requirements in this document. |

### Impacted Tables

Indicative table impact for implementation planning:

| Table | Purpose / Impact |
|---|---|
| `assets` | Stores atmospheric storage tank master data. |
| `asset_design_data` | Stores design basis data where available, including API 650-related design reference metadata without reproducing standard clauses. |
| `inspections` | Stores inspection event metadata. |
| `evidence_files` | Stores evidence metadata and object storage references. |
| `evidence_links` | Links evidence to measurements, findings, calculations, integrity decisions, and reports. |
| `ndt_ut_measurements_staging` | Stores AI/manual imported UT readings pending review. |
| `ndt_ut_measurements` | Stores reviewed and accepted UT readings. |
| `shell_course_summary_staging` | Stores extracted shell course summaries pending review. |
| `shell_course_summary` | Stores reviewed and accepted shell course summary data. |
| `formula_registry` | Stores engineer-approved formula IDs, versions, input schema, output schema, source basis, and status. |
| `calculation_runs` | Stores calculation execution metadata, formula versions, user, timestamp, and status. |
| `calculation_inputs` | Stores immutable calculation input snapshots. |
| `calculation_outputs` | Stores deterministic calculation outputs and disclaimers. |
| `integrity_decisions` | Stores engineer-reviewed integrity status and decision rationale. |
| `review_tasks` | Stores engineering review tasks for staging, calculation, decision, and report gates. |
| `reports` | Stores report metadata and issue status. |
| `work_orders_internal` | Stores MVP internal work order fallback actions. |
| `audit_logs` | Stores all approval, rejection, correction, calculation, report issue, and work order action events. |

### Impacted Endpoints

Indicative API impact for implementation planning:

| Endpoint | Purpose / Impact |
|---|---|
| `POST /api/assets` | Create tank asset master data. |
| `GET /api/assets/:assetId` | Retrieve asset and engineering basis metadata. |
| `POST /api/inspections` | Create inspection event. |
| `POST /api/evidence` | Register evidence metadata and object storage reference. |
| `POST /api/ai-extractions/ut-thickness/staging` | Store AI extraction output in staging only. |
| `GET /api/review-tasks` | Retrieve pending review tasks. |
| `POST /api/review-tasks/:taskId/approve` | Approve reviewed staging data, calculation result, integrity decision, or report gate according to role. |
| `POST /api/review-tasks/:taskId/reject` | Reject staging data or gated outputs with reason. |
| `POST /api/review-tasks/:taskId/correct` | Submit engineering correction with evidence link and reason. |
| `GET /api/formula-registry` | Retrieve active engineer-approved formulas and versions. |
| `POST /api/calculations/run` | Run deterministic calculation using approved formula version and reviewed data. |
| `GET /api/calculations/:calculationRunId` | Retrieve calculation result with input snapshot, formula version, evidence links, audit trail, and disclaimer. |
| `POST /api/integrity-decisions` | Create draft integrity decision based on reviewed data and calculation output. |
| `POST /api/reports/:reportId/issue` | Issue report only after required gates are satisfied. |
| `POST /api/work-orders/internal` | Create internal work order fallback action. |
| `GET /api/audit-logs` | Query audit trail. |

### Required Permissions

| Permission | Roles |
|---|---|
| `asset:create` | Admin, Engineer, Lead Engineer |
| `asset:update` | Admin, Engineer, Lead Engineer |
| `inspection:create` | Inspector, Engineer, Lead Engineer |
| `evidence:upload` | Inspector, Engineer, Lead Engineer |
| `evidence:link` | Inspector, Engineer, Lead Engineer |
| `ai_extraction:create_staging` | System, Inspector, Engineer |
| `staging:review` | Engineer, Lead Engineer |
| `staging:approve` | Engineer, Lead Engineer |
| `staging:reject` | Engineer, Lead Engineer |
| `staging:correct` | Engineer, Lead Engineer |
| `formula_registry:read` | Engineer, Lead Engineer, Approver, IT Admin |
| `formula_registry:manage` | Lead Engineer, IT Admin, Admin, subject to engineering governance |
| `calculation:run` | Engineer, Lead Engineer |
| `calculation:review` | Engineer, Lead Engineer |
| `integrity_decision:create` | Engineer, Lead Engineer |
| `integrity_decision:approve` | Lead Engineer, Approver |
| `report:issue` | Approver |
| `work_order:create_internal` | Engineer, Lead Engineer, Approver |
| `audit:read` | Admin, Lead Engineer, Approver, Management, IT Admin |
| `system:configure` | Admin, IT Admin |

### Required Audit Events

Every audit event must include at minimum: `event_id`, `event_type`, `actor_user_id`, `actor_role`, `asset_id`, `inspection_id` where applicable, `entity_type`, `entity_id`, `before_state`, `after_state`, `reason`, `evidence_link_ids`, `timestamp`, and `request_id`.

Required event types:

1. `asset.created`
2. `asset.updated`
3. `inspection.created`
4. `evidence.uploaded`
5. `evidence.linked`
6. `ai_extraction.staged`
7. `staging.review_started`
8. `staging.corrected`
9. `staging.approved`
10. `staging.rejected`
11. `formula_registry.version_created`
12. `formula_registry.version_activated`
13. `formula_registry.version_retired`
14. `calculation.run_requested`
15. `calculation.completed`
16. `calculation.failed`
17. `calculation.reviewed`
18. `integrity_decision.drafted`
19. `integrity_decision.corrected`
20. `integrity_decision.approved`
21. `integrity_decision.rejected`
22. `report.gate_checked`
23. `report.issued`
24. `report.issue_blocked`
25. `work_order_internal.created`
26. `work_order_internal.updated`
27. `work_order_internal.closed`

### Required Validation Rules

1. Asset type must be `atmospheric_storage_tank` for MVP calculations.
2. Calculation cannot run without reviewed and approved input data.
3. Calculation cannot run without an active engineer-approved formula version.
4. Calculation input units must match the formula registry input schema.
5. Calculation output must store the exact formula version used.
6. Calculation output must include the disclaimer: **Engineering review required before final use.**
7. UT thickness data must include asset ID, inspection ID, measurement location or shell course reference, measured value, unit, inspection date, and evidence linkage.
8. Shell course summary must include shell course identifier, relevant thickness summary fields, unit, source inspection, and evidence linkage.
9. AI extraction records must remain in staging until engineer review.
10. AI cannot approve staging data, calculations, integrity decisions, or reports.
11. Integrity decision cannot be approved without reviewed calculation output and linked evidence.
12. Report cannot be issued unless data, calculation, review, evidence, and approval gates pass.
13. Any correction must include correction reason, reviewer identity, timestamp, and evidence linkage where applicable.
14. Work order cannot be created from an unapproved integrity decision unless explicitly marked as preliminary and internally controlled.

### Required Test Cases

| Test Area | Required Cases |
|---|---|
| Formula registry | Active formula exists; inactive formula cannot be used; version is immutable after activation; retired version cannot be used for new runs. |
| Calculation execution | Runs only with reviewed data; rejects missing evidence; rejects invalid unit; stores input snapshot; stores formula version; writes audit event. |
| Corrosion rate | Uses only approved registry/workbook/test fixture formula; deterministic output; handles missing previous thickness according to exception rules. |
| Remaining life | Uses only approved registry/workbook/test fixture formula; deterministic output; handles zero or invalid corrosion rate according to exception rules. |
| Status logic | Applies approved threshold configuration; produces expected status for normal, watch, repair/replace, and insufficient-data scenarios. |
| Staging review | AI data cannot be promoted without engineer approval; correction writes audit log; rejection writes reason and audit log. |
| Integrity decision | Cannot approve without reviewed calculation and evidence; approval writes audit log; rejection requires reason. |
| Report issue gate | Blocks issue when evidence, calculation, review, or approval is missing; writes `report.issue_blocked`; allows issue when all gates pass. |
| n8n boundary | n8n workflow can trigger notification/audit event dispatch but cannot write final engineering tables directly. |
| Work order fallback | Internal work order can be created from approved decision; status changes are audited. |

### Migration / Documentation Updates

1. Create or update schema migrations for calculation, formula registry, staging, evidence linkage, integrity decision, report gates, internal work order, and audit log tables.
2. Update API documentation to reflect mandatory review, approval, evidence, formula versioning, and audit requirements.
3. Update developer README with calculation engine boundaries and test commands.
4. Add formula registry documentation before implementing production calculations.
5. Add fixture documentation for MVP calculations.

---

## 1. Purpose

This document defines the engineering basis for the AIM calculation and integrity decision MVP. It establishes the controlled scope, assumptions, data requirements, evidence requirements, formula governance, review authority, exception handling, and sign-off expectations for MVP calculation features.

This document is not a substitute for licensed engineering standards, professional engineering judgment, or client-specific engineering procedures. It is a product and implementation control document for building a deterministic, auditable, review-gated calculation workflow inside AIM.

---

## 2. Engineering Scope for MVP

The MVP engineering scope is limited to calculation and integrity decision support for atmospheric storage tanks using reviewed inspection and NDT data.

### 2.1 Included Engineering Functions

1. Store and manage atmospheric storage tank asset master data.
2. Store inspection event metadata.
3. Store original evidence files in object storage and evidence metadata in AIM.
4. Stage AI-extracted or imported UT thickness and shell course summary data for engineer review.
5. Promote reviewed and approved inspection/NDT data to final structured PostgreSQL tables.
6. Run deterministic MVP calculations using approved formula versions only.
7. Produce calculation outputs for corrosion rate, remaining life, and threshold-based status logic.
8. Support engineer-drafted integrity decisions based on reviewed data and calculation outputs.
9. Enforce approval gates before report issue.
10. Create internal work order fallback actions when an approved decision requires follow-up.

### 2.2 Excluded Engineering Functions

1. Full quantitative RBI under API 581.
2. Full FFS assessment under API 579.
3. Full design verification under API 650.
4. Full repair design or repair procedure generation.
5. Full 3D scan processing or automated geometry interpretation.
6. Automatic AI approval of any engineering result.
7. Automatic final integrity decision without engineer review and approval.
8. Automatic production SAP/Maximo work order integration.

---

## 3. Asset Type Covered

### 3.1 MVP Asset Type

The MVP covers:

- **Asset category:** Static equipment
- **Asset type:** Atmospheric storage tank
- **Primary inspection focus:** Tank shell thickness condition and shell course-level summary
- **Primary calculation focus:** Corrosion rate, remaining life, and threshold-based status logic

### 3.2 Minimum Asset Metadata

Each tank asset must include at least:

| Field | Required | Notes |
|---|---:|---|
| `asset_id` | Yes | AIM-generated unique identifier. |
| `asset_tag` | Yes | Site-facing equipment tag. |
| `asset_name` | Yes | Human-readable name. |
| `asset_type` | Yes | Must be `atmospheric_storage_tank` for MVP calculation. |
| `facility` | Yes | Facility/site name. |
| `location` | Optional | Area, unit, or plant location. |
| `service_fluid` | Optional | Product/service where available. |
| `design_code_reference` | Optional | Reference metadata only, for example API 650 design data when available. |
| `commissioning_date` | Optional | Used for context only unless approved for a formula. |
| `status` | Yes | Active, inactive, mothballed, retired, or other approved status. |

---

## 4. Inspection and NDT Scope

### 4.1 Included Inspection Scope

The MVP supports inspection records for atmospheric storage tanks with emphasis on:

1. General inspection metadata.
2. UT thickness inspection data.
3. Shell course summary.
4. Evidence linkage to source inspection reports, NDT sheets, photos, screenshots, drawings, and other supporting evidence.
5. Engineer review of staged extraction/import results.

### 4.2 Included NDT Scope

The MVP NDT data room supports:

1. UT thickness measurement records.
2. Measurement grouping by asset, inspection, shell course, component, CML/TML/location reference, or other approved location model.
3. Shell course-level thickness summary.
4. Evidence link per measurement group, individual measurement, or shell course summary row depending on available source evidence.
5. Review workflow for imported or AI-extracted data.

### 4.3 Excluded NDT Scope for MVP

1. Automated interpretation of MFL floor scan maps.
2. Automated 3D scan processing.
3. Automated defect sizing beyond explicitly supplied reviewed data.
4. Automated acceptance/rejection based solely on AI output.
5. Unreviewed use of extracted NDT data in final calculations.

---

## 5. Standards Referenced at a High Level

This MVP references the following standards only at a high governance level. The product must not reproduce copyrighted clauses, tables, figures, proprietary text, or controlled formulas from these standards.

| Standard | High-Level Use in MVP |
|---|---|
| API 653 | Storage tank inspection, repair, alteration, reconstruction governance context. Used as a reference category for tank integrity workflows. No copyrighted clauses or formulas are reproduced. |
| API 579 | Future Fitness-For-Service extension. Not implemented as full FFS in MVP. |
| API 580 / API 581 | Future RBI governance and quantitative RBI extension. Full quantitative RBI is out of scope for MVP. |
| API 650 | Design data reference when available. Used as metadata/context only unless explicit engineer-approved formulas or client-provided design data are supplied. |

### 5.1 Copyright and Formula Rule

The AIM MVP must follow this rule:

> Do not reproduce copyrighted standard clauses. Do not invent formulas. Use only engineer-approved formula registry or provided workbook formulas.

Implementation consequences:

1. Developers must not implement API/ASME formulas from memory, internet snippets, or assumptions.
2. Formula implementation must be traceable to an approved formula registry entry, a provided workbook formula, or a user-approved test fixture.
3. Every formula entry must include its owner, version, effective date, input schema, output schema, units, validation rules, and test cases.
4. The calculation engine must reject any request referencing a missing, inactive, unapproved, or retired formula version.

---

## 6. MVP Formula List

The MVP formula list defines formula categories only. The exact mathematical expressions must be supplied through the approved formula registry, provided workbook, or approved test fixtures.

### 6.1 Formula Category: Corrosion Rate

**Purpose:** Estimate corrosion rate using approved thickness data and approved formula logic.

**Allowed source:** Engineer-approved formula registry or provided workbook formula only.

**Typical input categories:**

- Current reviewed thickness value or summary value.
- Previous reviewed thickness value or approved nominal/baseline value, where applicable.
- Inspection date interval or approved time basis.
- Unit metadata.
- Evidence links for source values.

**Required output categories:**

- Corrosion rate value.
- Unit.
- Formula ID and version.
- Input snapshot.
- Evidence link references.
- Calculation status.
- Disclaimer: **Engineering review required before final use.**

### 6.2 Formula Category: Remaining Life

**Purpose:** Estimate remaining life using approved thickness/corrosion-related input and approved formula logic.

**Allowed source:** Engineer-approved formula registry or provided workbook formula only.

**Typical input categories:**

- Reviewed current thickness or summary thickness.
- Approved minimum allowable or threshold thickness where supplied through approved engineering basis.
- Approved corrosion rate.
- Unit metadata.
- Evidence links for source values.

**Required output categories:**

- Remaining life value.
- Unit.
- Formula ID and version.
- Input snapshot.
- Evidence link references.
- Calculation status.
- Disclaimer: **Engineering review required before final use.**

### 6.3 Formula Category: Status Logic Based on Threshold

**Purpose:** Classify calculation result into an MVP status category based on engineer-approved threshold configuration.

**Allowed source:** Engineer-approved threshold registry, formula registry, workbook logic, or approved test fixture only.

**Indicative MVP status categories:**

| Status | Intended Meaning |
|---|---|
| `acceptable` | Reviewed inputs and approved logic indicate no immediate action under MVP threshold logic. |
| `watch` | Reviewed inputs and approved logic indicate monitoring, follow-up review, or earlier inspection may be required. |
| `action_required` | Reviewed inputs and approved logic indicate engineering action, repair planning, replacement planning, or further assessment may be required. |
| `insufficient_data` | Required reviewed inputs, threshold values, formula version, or evidence linkage are missing. |
| `blocked` | Calculation or decision is blocked due to validation, approval, formula, or evidence issues. |

**Important:** Status logic is a decision-support output only. It is not a final engineering decision until reviewed and approved by authorized engineering personnel.

---

## 7. Engineering Assumptions

1. The MVP is intended to support atmospheric storage tank inspection data management and controlled calculation workflows.
2. The MVP does not replace professional engineering judgment.
3. The MVP does not implement full API 653, API 579, API 580, API 581, or API 650 compliance logic.
4. All final engineering data must be reviewed by an Engineer or Lead Engineer before promotion from staging.
5. All final integrity decisions must be reviewed and approved according to the configured approval authority.
6. Formulas and thresholds are controlled configuration items and must be versioned.
7. Formula outputs are only as reliable as the reviewed data, evidence quality, and approved formula basis.
8. Evidence may be linked at different levels: asset, inspection, measurement, shell course summary, calculation, integrity decision, report, or work order.
9. Where data is incomplete, the system must return `insufficient_data` or `blocked`, not silently calculate.
10. Calculation runs must be repeatable using stored input snapshots and formula versions.
11. Historical calculation results must remain immutable after approval or report issuance.
12. Corrections must create a new revision, not overwrite approved engineering history.

---

## 8. Data Requirements

### 8.1 Asset Data

Minimum required data for calculation eligibility:

| Data Element | Required | Validation |
|---|---:|---|
| Asset ID | Yes | Must exist in AIM. |
| Asset type | Yes | Must be `atmospheric_storage_tank`. |
| Asset tag | Yes | Must be unique within configured tenant/site scope. |
| Facility/site | Yes | Must exist or be provided as controlled text. |
| Service | Optional | Required only if formula or report template requires it. |
| Design data reference | Optional | Must be clearly marked as available, unavailable, or not reviewed. |

### 8.2 Inspection Data

| Data Element | Required | Validation |
|---|---:|---|
| Inspection ID | Yes | Must exist and be linked to asset. |
| Inspection date | Yes | Must be valid date. |
| Inspection type | Yes | Must be selected from controlled list. |
| Inspection provider | Optional | Required if report template requires it. |
| Inspection status | Yes | Draft, staged, reviewed, approved, superseded, or rejected. |
| Evidence linkage | Yes | At least one source evidence file must be linked. |

### 8.3 UT Thickness Measurement Data

| Data Element | Required | Validation |
|---|---:|---|
| Measurement ID | Yes | System-generated. |
| Asset ID | Yes | Must match inspection asset. |
| Inspection ID | Yes | Must be reviewed or in review depending on stage. |
| Measurement location | Yes | Must identify shell course/component/CML/TML/location reference where available. |
| Thickness value | Yes | Numeric and greater than zero unless explicitly marked invalid. |
| Thickness unit | Yes | Controlled unit list, for example `mm`. |
| Measurement date | Optional | Defaults to inspection date if approved by reviewer. |
| Source type | Yes | Manual entry, import, AI extraction, or corrected. |
| Review status | Yes | Staged, approved, rejected, corrected, superseded. |
| Evidence link | Yes | Required before final promotion. |

### 8.4 Shell Course Summary Data

| Data Element | Required | Validation |
|---|---:|---|
| Shell course ID/reference | Yes | Controlled within asset/inspection. |
| Course number/name | Yes | Must be unique within asset/inspection. |
| Thickness summary values | Yes, if used in calculation | Must be reviewed numeric values with units. |
| Unit | Yes | Controlled unit list. |
| Source inspection | Yes | Must link to inspection ID. |
| Evidence link | Yes | Required before final promotion. |
| Review status | Yes | Staged, approved, rejected, corrected, superseded. |

### 8.5 Calculation Input Data

Calculation input must include:

1. Calculation type.
2. Asset ID.
3. Inspection ID.
4. Formula ID.
5. Formula version.
6. Input parameter values.
7. Input units.
8. Input data source references.
9. Evidence link IDs.
10. User requesting calculation.
11. Timestamp.
12. Validation status.

### 8.6 Calculation Output Data

Calculation output must include:

1. Calculation run ID.
2. Formula ID and version.
3. Input snapshot hash or immutable input snapshot reference.
4. Output values.
5. Output units.
6. Calculation status.
7. Validation messages.
8. Evidence link IDs.
9. Reviewer status.
10. Disclaimer: **Engineering review required before final use.**
11. Audit event references.

---

## 9. Evidence Requirements

### 9.1 Evidence Storage Rule

1. Original evidence files must be stored in object storage.
2. AIM PostgreSQL stores only metadata, references, object keys, hashes, review status, and linkage records.
3. Evidence files must not be duplicated inside n8n.
4. n8n may route evidence-related events or reminders but must not become the evidence repository.

### 9.2 Required Evidence Linkage

Evidence linkage is mandatory for:

1. UT thickness measurements used in calculation.
2. Shell course summary used in calculation.
3. AI extraction staging record.
4. Engineer correction.
5. Calculation input snapshot.
6. Calculation output.
7. Integrity decision.
8. Issued report.
9. Internal work order created from an integrity decision.

### 9.3 Minimum Evidence Metadata

| Field | Required | Notes |
|---|---:|---|
| Evidence ID | Yes | AIM-generated unique ID. |
| Object storage key | Yes | Pointer to original evidence file. |
| File name | Yes | Original or controlled filename. |
| File type | Yes | PDF, XLSX, CSV, image, drawing, screenshot, etc. |
| File hash | Yes | Required for immutability/integrity verification. |
| Uploaded by | Yes | User or system actor. |
| Uploaded at | Yes | Timestamp. |
| Asset ID | Yes | Must link to asset. |
| Inspection ID | Optional | Required for inspection evidence. |
| Page/sheet/region reference | Optional | Required where evidence points to a specific source location and available. |
| Review status | Yes | Uploaded, linked, reviewed, rejected, superseded. |

### 9.4 Evidence Quality Flags

Evidence may carry quality flags:

- `clear`
- `partially_clear`
- `illegible`
- `missing_page`
- `conflicting_source`
- `requires_manual_review`
- `superseded`

If evidence quality is insufficient, calculation or report issuance must be blocked unless an authorized reviewer explicitly records a justified exception.

---

## 10. Review and Approval Authority

### 10.1 Authority Principles

1. AI cannot approve engineering data, calculation results, integrity decisions, or reports.
2. Inspector may upload or enter data but cannot approve final engineering use unless also assigned an authorized engineering role.
3. Engineer may review and approve staged NDT/inspection data according to project configuration.
4. Lead Engineer may approve calculations, corrections, integrity decisions, and formula registry changes according to project configuration.
5. Approver may issue final report only after all required gates pass.
6. IT Admin may manage system configuration but must not bypass engineering approval gates.
7. Management may view dashboards, reports, KPIs, and audit summaries but must not alter engineering data unless assigned an authorized role.

### 10.2 Role Authority Matrix

| Action | Inspector | Engineer | Lead Engineer | Approver | Admin | IT Admin | Management |
|---|---:|---:|---:|---:|---:|---:|---:|
| Upload evidence | Yes | Yes | Yes | No | Yes | No | No |
| Create inspection record | Yes | Yes | Yes | No | Yes | No | No |
| Submit AI/import staging data | Yes | Yes | Yes | No | Yes | No | No |
| Approve staged NDT data | No | Yes | Yes | No | No | No | No |
| Correct staged/final data | No | Yes | Yes | No | No | No | No |
| Manage formula registry | No | No | Yes | No | Admin only with governance | Technical support only | No |
| Run calculation | No | Yes | Yes | No | No | No | No |
| Review calculation output | No | Yes | Yes | No | No | No | No |
| Draft integrity decision | No | Yes | Yes | No | No | No | No |
| Approve integrity decision | No | No | Yes | Yes | No | No | No |
| Issue report | No | No | No | Yes | No | No | No |
| Create internal work order | No | Yes | Yes | Yes | No | No | No |
| View dashboard KPI | Limited | Yes | Yes | Yes | Yes | Yes | Yes |
| View audit log | No | Limited | Yes | Yes | Yes | Yes | Read-only summary |

### 10.3 Segregation of Duties

The same user may not approve a final integrity decision or issue a report if project policy requires independent review and the user was the original preparer. The application must support configurable segregation-of-duties rules.

---

## 11. Formula Versioning Rule

### 11.1 Formula Registry Requirement

Every implemented formula must be registered before use.

Minimum formula registry fields:

| Field | Required | Notes |
|---|---:|---|
| Formula ID | Yes | Stable unique identifier. |
| Formula name | Yes | Human-readable name. |
| Formula category | Yes | Corrosion rate, remaining life, status logic, or other approved category. |
| Formula version | Yes | Semantic or controlled version, for example `1.0.0`. |
| Formula source basis | Yes | Provided workbook, approved engineering basis, or approved test fixture. |
| Formula expression reference | Yes | Reference to controlled implementation, not copyrighted standard text. |
| Input schema | Yes | Parameter names, types, units, required/optional flags. |
| Output schema | Yes | Output names, types, units. |
| Validation rules | Yes | Required input constraints. |
| Test fixture reference | Yes | Required before activation. |
| Approval status | Yes | Draft, pending review, active, retired, rejected. |
| Approved by | Yes for active | Lead Engineer or authorized approver. |
| Approved at | Yes for active | Timestamp. |
| Effective from | Yes for active | Timestamp/date. |
| Retired at | Optional | Required when retired. |

### 11.2 Immutability

1. Active formula versions are immutable.
2. Any formula change creates a new version.
3. Historical calculation runs must preserve the formula version used at the time of execution.
4. Retired formula versions remain available for historical traceability but cannot be used for new calculations unless explicitly allowed by governed exception.
5. Formula code, test fixtures, and registry metadata must be version-controlled.

### 11.3 Formula Activation Gate

A formula version can be activated only when:

1. Formula source basis is documented.
2. Formula implementation is deterministic.
3. Input and output schemas are defined.
4. Units are defined.
5. Validation rules are defined.
6. Test fixtures are approved.
7. Required tests pass.
8. Lead Engineer or authorized engineering approver approves activation.
9. Audit event is written.

---

## 12. Exception Handling

### 12.1 Data Exceptions

The system must block calculation or return `insufficient_data` when:

1. Required thickness value is missing.
2. Required date/time basis is missing.
3. Required previous/baseline thickness is missing and no approved alternate basis exists.
4. Required minimum/threshold value is missing.
5. Units are missing or incompatible.
6. Asset type is not covered by MVP.
7. Evidence link is missing.
8. Source data is staged but not approved.
9. Evidence quality is flagged as insufficient without authorized exception.

### 12.2 Formula Exceptions

The system must block calculation when:

1. Formula ID is missing.
2. Formula version is missing.
3. Formula version is not active.
4. Formula registry source basis is not approved.
5. Formula implementation has no approved test fixture.
6. Input schema does not match request payload.
7. Unit conversion is required but no approved conversion rule exists.
8. Calculation produces invalid, undefined, infinite, or non-numeric output.

### 12.3 Review Exceptions

The system must prevent approval when:

1. Reviewer lacks required permission.
2. Segregation-of-duties rule is violated.
3. Required correction reason is missing.
4. Required evidence link is missing.
5. Required audit event cannot be written.
6. Required previous approval gate has not passed.

### 12.4 Report Issue Exceptions

Report issue must be blocked when:

1. Required data is missing.
2. Required calculation output is missing.
3. Calculation output is not reviewed.
4. Integrity decision is not approved.
5. Evidence linkage is missing or insufficient.
6. Approval gate is incomplete.
7. Required audit event cannot be written.

### 12.5 Exception Output Format

API errors and blocked workflow states should include:

```json
{
  "status": "blocked",
  "error_code": "CALCULATION_INPUT_MISSING_EVIDENCE",
  "message": "Calculation is blocked because required evidence linkage is missing.",
  "required_action": "Link reviewed evidence to the measurement or shell course summary before running calculation.",
  "entity_type": "ndt_ut_measurement",
  "entity_id": "example-id",
  "audit_event_required": true
}
```

---

## 13. Calculation Output Disclaimer

Every calculation output, calculation screen, calculation export, integrity decision draft, and report section that references MVP calculation results must display the following disclaimer:

> **Engineering review required before final use.**

This disclaimer must be stored with the calculation output record and rendered in the user interface and report builder where calculation outputs are shown.

---

## 14. Integrity Decision Basis

### 14.1 Decision Inputs

An MVP integrity decision may be drafted only from:

1. Reviewed asset data.
2. Reviewed inspection data.
3. Reviewed UT thickness and shell course summary data.
4. Reviewed calculation output.
5. Linked evidence.
6. Engineer-authored rationale.
7. Approved status logic output where applicable.

### 14.2 Decision Statuses

Indicative MVP decision statuses:

| Status | Description |
|---|---|
| `fit_for_continued_service_mvp` | MVP decision support indicates continued service subject to approved engineering review and limitations. |
| `monitoring_required` | Follow-up monitoring, inspection, or review required. |
| `engineering_action_required` | Repair, replacement, further inspection, FFS, RBI, or other engineering action may be required. |
| `insufficient_data` | Decision cannot be completed because data/evidence/calculation basis is incomplete. |
| `blocked` | Decision is blocked by validation, approval, formula, or evidence issue. |

### 14.3 Decision Limitations

1. MVP integrity decision is not a full API 579 FFS assessment.
2. MVP integrity decision is not a full API 581 RBI assessment.
3. MVP integrity decision must not claim full compliance with any standard unless separately reviewed and approved under licensed engineering procedures.
4. The system must support clear limitation text in report output.

---

## 15. AIM+n8n Boundary for Calculation Workflow

### 15.1 AIM Responsibilities

AIM must handle:

1. Asset records.
2. Evidence metadata and linkage.
3. Staging tables.
4. Engineer review records.
5. Formula registry.
6. Calculation execution.
7. Calculation results.
8. Integrity decisions.
9. Report gates.
10. Internal work orders.
11. Audit logs.
12. Permissions and approval gates.

### 15.2 n8n Responsibilities

n8n may handle:

1. Triggering workflow after upload or status change.
2. Routing review tasks.
3. Sending reminders.
4. Sending approval notifications.
5. Calling AIM APIs according to allowed workflow contracts.
6. Dispatching integration events.
7. Sending audit event requests through approved AIM API endpoints.

### 15.3 n8n Prohibited Actions

n8n must not:

1. Store final engineering data.
2. Write directly to PostgreSQL.
3. Promote AI staging data to final tables without AIM review/approval endpoint.
4. Approve engineering data.
5. Approve calculation outputs.
6. Approve integrity decisions.
7. Issue reports independently.
8. Bypass report issue gates.
9. Become the evidence repository.

---

## 16. Acceptance Criteria

### 16.1 Engineering Basis Acceptance

1. Document defines MVP scope for atmospheric storage tank calculation and integrity decision support.
2. Document references API 653, API 579, API 580/581, and API 650 only at high level.
3. Document explicitly prohibits reproducing copyrighted clauses and inventing formulas.
4. Document limits MVP formulas to corrosion rate, remaining life, and threshold-based status logic.
5. Document requires formulas to come only from formula registry, provided workbook, or approved test fixtures.
6. Document requires evidence linkage for measurements, calculations, decisions, and reports.
7. Document defines review and approval authority.
8. Document requires formula versioning and immutable historical calculation runs.
9. Document defines exception handling for missing data, missing evidence, invalid formula, and incomplete approval gates.
10. Document includes the required disclaimer: **Engineering review required before final use.**
11. Document includes sign-off section.

### 16.2 Implementation Acceptance

1. Calculation endpoint rejects unapproved staging data.
2. Calculation endpoint rejects missing or inactive formula version.
3. Calculation endpoint stores input snapshot and formula version.
4. Calculation endpoint writes audit events for requested, completed, and failed runs.
5. Integrity decision endpoint rejects unreviewed calculation output.
6. Report issue endpoint blocks issuance if data, calculation, review, evidence, or approval gate is incomplete.
7. n8n workflow uses AIM APIs only and does not write directly to PostgreSQL.
8. All approval, rejection, correction, calculation, report issue, and work order actions write audit logs.

---

## 17. Developer Handoff Notes

### 17.1 Implementation Priorities

1. Implement formula registry schema before calculation execution.
2. Implement staging review workflow before final NDT tables are used by calculation.
3. Implement evidence linkage before enabling calculation runs.
4. Implement deterministic calculation service with unit tests and fixture tests.
5. Implement calculation audit logs before report builder integration.
6. Implement report issue gate checks before allowing report output to be marked issued.
7. Implement internal work order fallback before external CMMS integration.

### 17.2 Suggested Run/Test Commands

Adjust commands to the actual repository stack.

```bash
# Install dependencies
npm install

# Run database migrations
npm run db:migrate

# Run unit tests
npm test

# Run calculation engine tests only
npm run test:calculation

# Run API tests
npm run test:api

# Run linting
npm run lint

# Run type checks
npm run typecheck

# Run end-to-end workflow tests
npm run test:e2e
```

### 17.3 Required Test Fixture Files

Recommended fixture structure:

```text
07_Calculation/
  engineering_basis.md
  formula_registry.md
  fixtures/
    corrosion_rate.fixture.json
    remaining_life.fixture.json
    status_logic.fixture.json
  tests/
    corrosion_rate.test.md
    remaining_life.test.md
    status_logic.test.md
```

---

## 18. Sign-Off Section

This engineering basis must be reviewed and approved before production use of AIM calculation and integrity decision features.

| Role | Name | Signature / Approval Reference | Date | Notes |
|---|---|---|---|---|
| Prepared by |  |  |  |  |
| Reviewed by — Engineer |  |  |  |  |
| Reviewed by — Lead Engineer |  |  |  |  |
| Approved by — Engineering Authority |  |  |  |  |
| Approved by — Product Owner |  |  |  |  |
| Approved by — IT / Security |  |  |  |  |

---

## 19. Delivery Notes

### What Changed

Created the engineering basis for the AIM calculation and integrity decision MVP, including scope, data requirements, evidence requirements, standards governance, formula rules, versioning rules, review authority, exception handling, disclaimer, acceptance criteria, and sign-off section.

### AIM / n8n Boundary Confirmation

This document preserves the AIM/n8n boundary:

- AIM remains the system of record.
- PostgreSQL stores final structured engineering data.
- Object storage stores original evidence files.
- n8n remains workflow orchestration only.
- n8n does not store final engineering data and does not write directly to PostgreSQL.
- AI output goes to staging only.
- Engineer review and approval are mandatory before final use.

### Run / Test Commands

See Section 17.2 for suggested implementation commands. Actual commands must be aligned with the repository stack.

### Documentation Updates

Future documentation must reference this engineering basis when implementing formula registry, calculation service, integrity decision workflow, report issue gates, and internal work order fallback.
