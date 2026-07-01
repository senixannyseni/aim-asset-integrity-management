# AIM Calculation Validation Method

**File:** `07_Calculation/calculation_validation_method.md`  
**Related workbook:** `07_Calculation/validation_workbook.xlsx`  
**Project:** AIM+n8n MVP  
**Domain:** Atmospheric Storage Tank Integrity MVP  
**Status:** Draft for engineering review  
**Mandatory output disclaimer:** **Engineering review required before final use.**

---

## 1. Pre-Implementation Governance Check

### 1.1 Assumptions

1. AIM remains the system of record for final engineering data, calculation results, review status, approval status, evidence linkage, reports, and audit logs.
2. PostgreSQL stores final structured engineering data only after mandatory engineer review and promotion from staging where applicable.
3. Object storage stores original evidence files. The database stores metadata and evidence linkage references, not the binary evidence as final engineering data.
4. n8n is orchestration only: trigger, routing, reminder, approval notification, integration handoff, and audit-event request. n8n must not store final engineering data and must not write directly to PostgreSQL.
5. AI extraction output must enter staging first. It must not write directly to final engineering tables.
6. AI must never approve calculation results, integrity decisions, final engineering data, work orders, or issued reports.
7. Engineer or Lead Engineer review is mandatory before any extracted or calculated result is promoted for final use.
8. The calculation engine must be deterministic, testable, versioned, and auditable.
9. This MVP uses only explicitly supplied MVP formulas in this document/workbook and/or engineer-approved formula registry entries. No proprietary API/ASME standard formula is implemented here.
10. The workbook is a validation fixture and does not replace formal engineering approval.

### 1.2 Impacted Documents

| Document | Impact |
|---|---|
| `01_PRD/AIM_MVP_PRD.md` | Aligns the calculation validation process with MVP scope, acceptance criteria, user roles, audit requirements, and report issuance gates. |
| `07_Calculation/engineering_basis.md` | Provides the engineering basis, formula governance, standard-reference boundaries, and sign-off expectations. |
| `07_Calculation/validation_workbook.xlsx` | Provides manual expected results, input data, engine output capture, difference checking, and reviewer sign-off fields. |
| Future `API_SPEC.md` / OpenAPI document | Must expose deterministic calculation run, validation, review, approval, and evidence-linking endpoints. |
| Future `DATABASE_SCHEMA.md` / migrations | Must include formula registry/versioning, calculation run, result, evidence linkage, review, approval, and audit tables. |
| Future `n8n_workflows.md` | Must show orchestration-only behavior for calculation notifications, review reminders, and approval routing. |

### 1.3 Impacted Tables

The following tables or equivalent entities are expected to be impacted by calculation validation implementation:

| Table / Entity | Purpose |
|---|---|
| `formula_registry` | Stores approved MVP formula identifiers, names, descriptions, parameters, version, status, and approval metadata. |
| `formula_versions` | Stores immutable formula-version records and effective dates. |
| `calculation_runs` | Stores each deterministic calculation execution, formula version, run status, run timestamp, runner identity, and review state. |
| `calculation_inputs` | Stores normalized input snapshot used by the calculation engine. |
| `calculation_results` | Stores output values, statuses, warnings, and final calculation disclaimers. |
| `calculation_validation_cases` | Stores validation fixture metadata and expected outcomes when migrated from workbook to database. |
| `ndt_ut_measurements` | Stores final reviewed UT thickness readings and related shell course references. |
| `evidence_files` | Stores evidence metadata for object storage files. |
| `evidence_links` | Links evidence to NDT measurements, calculation inputs/results, findings, integrity decisions, reports, and work orders. |
| `review_tasks` | Stores engineer and lead engineer review tasks for calculation outputs. |
| `approvals` | Stores approval or rejection decisions for promoted calculation results and issued reports. |
| `audit_logs` | Stores immutable logs for calculation run, correction, review, approval, rejection, report issue, and work order actions. |
| `internal_work_orders` | Stores MVP fallback work orders raised from calculation/integrity decisions before CMMS integration. |

### 1.4 Impacted Endpoints

Recommended implementation endpoints:

| Endpoint | Method | Purpose |
|---|---:|---|
| `/api/formula-registry` | `GET` | List approved formula versions available to the calculation engine. |
| `/api/formula-registry/{formula_version}` | `GET` | Retrieve metadata for a specific formula version. |
| `/api/calculations/validate-input` | `POST` | Validate input completeness, units, evidence links, and review prerequisites before running calculation. |
| `/api/calculations/run` | `POST` | Run deterministic MVP calculation with explicit formula version. |
| `/api/calculations/{calculation_run_id}` | `GET` | Retrieve calculation input snapshot, output, status, warnings, evidence links, and audit references. |
| `/api/calculations/{calculation_run_id}/review` | `POST` | Engineer or Lead Engineer reviews/corrects calculation output. |
| `/api/calculations/{calculation_run_id}/approve` | `POST` | Approver or authorized Lead Engineer approves reviewed calculation output for final use. |
| `/api/calculations/{calculation_run_id}/reject` | `POST` | Authorized reviewer rejects calculation output and records reason. |
| `/api/evidence-links` | `POST` | Link evidence to calculation input/output and related NDT measurements. |
| `/api/audit-events` | `POST` | Write audit event from AIM application service only. n8n may request/trigger this through AIM API, but must not write directly to PostgreSQL. |

### 1.5 Required Permissions

| Permission | Role(s) | Notes |
|---|---|---|
| `formula_registry.read` | Engineer, Lead Engineer, Approver, IT Admin, Admin | Read approved formula metadata. |
| `formula_registry.manage_draft` | Lead Engineer, IT Admin | Draft/update formula metadata before approval. |
| `formula_registry.approve` | Approver, authorized Lead Engineer | Approve formula version for controlled use. |
| `calculation.run` | Engineer, Lead Engineer | Run deterministic calculation after input validation. |
| `calculation.review` | Engineer, Lead Engineer | Review calculation output and warnings. |
| `calculation.approve` | Approver, authorized Lead Engineer | Approve reviewed calculation output for final use. |
| `calculation.reject` | Engineer, Lead Engineer, Approver | Reject invalid calculation output with reason. |
| `calculation.override_warning` | Lead Engineer, Approver | Controlled override only with reason and audit log. |
| `evidence.link` | Inspector, Engineer, Lead Engineer | Link evidence to measurements and calculations. |
| `audit.read` | Lead Engineer, Approver, IT Admin, Admin | Read audit logs according to role policy. |
| `audit.write` | AIM application service | Audit write must occur through AIM service layer, not n8n direct DB access. |

### 1.6 Required Audit Events

The following events must be written to the audit log:

| Event | Trigger |
|---|---|
| `FORMULA_VERSION_CREATED` | New draft formula version metadata is created. |
| `FORMULA_VERSION_APPROVED` | Formula version is approved for controlled use. |
| `FORMULA_VERSION_RETIRED` | Formula version is retired or superseded. |
| `CALCULATION_INPUT_VALIDATED` | Input data passes validation check. |
| `CALCULATION_INPUT_REJECTED` | Input data fails validation check. |
| `CALCULATION_RUN_CREATED` | Calculation run is executed. |
| `CALCULATION_WARNING_RAISED` | Calculation run returns warning or blocked status. |
| `CALCULATION_REVIEWED` | Engineer/Lead Engineer reviews result. |
| `CALCULATION_CORRECTED` | Reviewer corrects input/output metadata before approval. |
| `CALCULATION_APPROVED` | Authorized approver approves reviewed output. |
| `CALCULATION_REJECTED` | Reviewer/approver rejects output. |
| `EVIDENCE_LINK_CREATED` | Evidence is linked to calculation, measurement, decision, report, or work order. |
| `REPORT_ISSUE_BLOCKED` | Report issuance is blocked due to missing data/review/evidence/approval. |
| `REPORT_ISSUED` | Report is issued after all gates pass. |
| `INTERNAL_WORK_ORDER_CREATED` | Internal work order fallback is created from calculation/integrity decision. |
| `N8N_NOTIFICATION_TRIGGERED` | n8n workflow notification/reminder is triggered by AIM event. |

### 1.7 Required Validation Rules

1. `test_case_id` must be unique within the workbook and validation database fixture.
2. `asset_tag`, `component`, `course_no`, and `evidence_code` must be present except in negative test cases intentionally designed to validate missing evidence behavior.
3. Thickness values must be in millimeters for MVP workbook inputs.
4. `years_between_inspections` must be greater than `0` when corrosion rate is calculated.
5. `previous_thickness_mm`, `current_thickness_mm`, and `minimum_required_thickness_mm` must be numeric unless the test case intentionally validates missing input behavior.
6. `current_thickness_mm < minimum_required_thickness_mm` must trigger blocked/review status.
7. `corrosion_rate_mm_y < 0` must trigger data review warning.
8. `corrosion_rate_mm_y = 0` must avoid divide-by-zero and return remaining life as `N/A` for this MVP validation fixture.
9. Missing evidence must block promotion/final use even when numeric calculation is possible.
10. Unit mismatch suspicion must block final use until reviewed/corrected.
11. Calculation output must include the disclaimer: **Engineering review required before final use.**
12. Report issuance must be blocked until required data, calculation, review, evidence linkage, and approval gates are satisfied.

### 1.8 Required Test Cases

The workbook contains at least the following eight representative validation cases:

1. Normal corrosion rate.
2. Thickness below minimum.
3. Zero corrosion rate.
4. Negative corrosion rate.
5. Missing previous thickness.
6. Missing evidence.
7. Remaining life below threshold.
8. Unit mismatch warning.

### 1.9 Migration / Documentation Updates

1. Add migration for formula registry/versioning before enabling calculation runs in production.
2. Add calculation run/result/evidence-link tables before persisting calculation outputs.
3. Add audit event enum values listed in this document.
4. Update API documentation with calculation validation endpoints.
5. Update user guide for Engineer, Lead Engineer, and Approver review flow.
6. Update n8n workflow documentation to confirm orchestration-only role.
7. Include this validation workbook in CI/test fixtures only after engineering approval.

---

## 2. Purpose

This document defines the validation method for the AIM MVP calculation engine and its use in integrity decision support for atmospheric storage tanks.

The validation method verifies that the deterministic calculation engine:

1. Uses only approved MVP formulas.
2. Produces repeatable outputs for the same input and formula version.
3. Handles missing, abnormal, or blocked data safely.
4. Requires evidence linkage before final use.
5. Requires engineering review before promotion, approval, report issue, or work order action.

This document must be used together with `validation_workbook.xlsx`.

---

## 3. Engineering Scope Covered by Validation

### 3.1 Covered MVP Scope

The validation workbook covers the following MVP calculation scope:

| Area | Covered in MVP Validation |
|---|---|
| Asset type | Atmospheric storage tank. |
| Component | Shell course thickness validation fixture. |
| NDT method | UT thickness measurement. |
| Calculation type | Corrosion rate, remaining life, and threshold-based status logic. |
| Evidence linkage | Selected evidence code is required before promotion/final use. |
| Review | Engineer/Lead Engineer review required. |
| Approval | Approver or authorized Lead Engineer approval required before final use. |

### 3.2 Not Covered by MVP Validation

The validation workbook does not cover:

1. Full API 581 quantitative RBI.
2. Full API 579 fitness-for-service extension.
3. Proprietary or copyrighted standard formulas.
4. Full shell, roof, floor, nozzle, settlement, roundness, or full tank structural evaluation.
5. Full SAP/Maximo production integration.
6. Full 3D scan processing.
7. AI-only approval.
8. Automatic final engineering decision without review.

---

## 4. Standard-Reference Boundary

The following standards may be referenced at a high level for engineering governance and future design alignment:

| Standard | Use in MVP |
|---|---|
| API 653 | High-level inspection, repair, alteration, and reconstruction governance reference for storage tanks. |
| API 579 | Future fitness-for-service extension reference only. |
| API 580/581 | Future RBI extension reference only. |
| API 650 | Design data reference when available. |

**Important:** This MVP validation method does not reproduce copyrighted standard clauses and uses a governed boundary instead of proprietary API/ASME standard formulas.

---

## 5. Approved MVP Formula Fixture

The following formulas are the only formulas used in this validation fixture. They are intentionally simple MVP formulas supplied for validation and must be reviewed and approved by a qualified engineer before production use.

### 5.1 Corrosion Rate

```text
corrosion_rate_mm_y = (previous_thickness_mm - current_thickness_mm) / years_between_inspections
```

Validation requirements:

1. `previous_thickness_mm` must be numeric.
2. `current_thickness_mm` must be numeric.
3. `years_between_inspections` must be numeric and greater than `0`.
4. If the result is negative, the engine must flag data review because current thickness is greater than previous thickness.
5. If required input is missing, the engine must block final calculation status.

### 5.2 Remaining Life

```text
remaining_life_y = (current_thickness_mm - minimum_required_thickness_mm) / corrosion_rate_mm_y
```

Validation requirements:

1. This formula is calculated only when `corrosion_rate_mm_y > 0`.
2. If `corrosion_rate_mm_y = 0`, remaining life is returned as `N/A` in the MVP workbook to avoid divide-by-zero and false precision.
3. If `corrosion_rate_mm_y < 0`, remaining life is returned as `N/A` and a data review warning is required.
4. If current thickness is below minimum required thickness, the result must be flagged as below minimum and must not be treated as final-use ready.

### 5.3 Threshold-Based Status Logic

The validation fixture uses an engineer-reviewable MVP threshold parameter:

```text
mvp_remaining_life_action_threshold_y = 2.0
```

Status logic used by the workbook fixture:

| Condition | Expected Status |
|---|---|
| Missing required numeric input | `INCOMPLETE_INPUT` |
| Missing evidence code | `BLOCKED_MISSING_EVIDENCE` |
| Unit mismatch suspected | `UNIT_REVIEW_REQUIRED` |
| Current thickness below minimum required thickness | `BELOW_MIN_REVIEW` |
| Corrosion rate is negative | `DATA_REVIEW_REQUIRED` |
| Corrosion rate is zero | `OK_ZERO_RATE_REVIEW` |
| Remaining life is below MVP action threshold | `ACTION_REQUIRED` |
| All required inputs valid, evidence present, current thickness above minimum, no warning | `OK` |

The threshold is not a substitute for engineering judgment. It must be stored in the formula registry or equivalent controlled configuration before production use.

---

## 6. Workbook Structure

The validation workbook contains six sheets.

### 6.1 `Test_Case_Register`

Purpose: Stores test case metadata and review status.

Required columns:

1. `test_case_id`
2. `test_case_name`
3. `purpose`
4. `input_condition`
5. `expected_result`
6. `priority`
7. `reviewer`
8. `status`

### 6.2 `Input_Data`

Purpose: Stores normalized calculation inputs and evidence references.

Required columns:

1. `test_case_id`
2. `asset_tag`
3. `component`
4. `course_no`
5. `previous_thickness_mm`
6. `current_thickness_mm`
7. `minimum_required_thickness_mm`
8. `years_between_inspections`
9. `evidence_code`

### 6.3 `Manual_Calculation`

Purpose: Stores engineer-reviewed expected output based on the MVP fixture formulas.

Required columns:

1. `test_case_id`
2. `corrosion_rate_mm_y`
3. `remaining_life_y`
4. `status_expected`
5. `warning_expected`

### 6.4 `Engine_Output`

Purpose: Stores calculation engine actual output for comparison.

Required columns:

1. `test_case_id`
2. `engine_corrosion_rate_mm_y`
3. `engine_remaining_life_y`
4. `engine_status`
5. `engine_warnings`

Implementation note: The initial workbook seeds `Engine_Output` with values matching `Manual_Calculation` so the `Difference_Check` sheet demonstrates expected pass behavior. During actual validation, developer/Codex or automated test export should overwrite `Engine_Output` with actual engine results.

### 6.5 `Difference_Check`

Purpose: Compares manual expected values with engine output.

Required columns:

1. `test_case_id`
2. `corrosion_rate_diff`
3. `remaining_life_diff`
4. `pass_fail`
5. `comment`

Pass/fail rule:

1. Numeric differences must be less than or equal to the defined MVP tolerance.
2. Non-numeric expected values such as `N/A` must match expected status and warning behavior.
3. Status must match exactly.
4. Warning text must match the expected validation warning or an explicitly approved equivalent warning code.

Recommended future improvement: use stable warning codes in addition to human-readable warning text.

### 6.6 `Reviewer_Signoff`

Purpose: Records formula version and review/approval metadata.

Required columns:

1. `formula_version`
2. `reviewed_by`
3. `approved_by`
4. `approval_date`
5. `comment`

---

## 7. Validation Procedure

### Step 1 — Confirm Formula Version

1. Confirm the formula version in `Reviewer_Signoff.formula_version`.
2. Confirm the same formula version exists in the AIM formula registry before production implementation.
3. Confirm formula status is approved before production use.

### Step 2 — Validate Input Data

For each test case in `Input_Data`, validate:

1. Required thickness values are present unless the test case intentionally validates missing inputs.
2. Thickness values are expressed in millimeters.
3. Inspection interval is greater than `0`.
4. Evidence code exists unless the test case intentionally validates missing evidence behavior.
5. Asset/component/course fields are populated.

### Step 3 — Run Engine Calculation

Run the deterministic calculation engine using the same formula version recorded in the workbook.

Recommended command pattern for future implementation:

```bash
npm run test:calculation
```

or, if implemented as a backend service test:

```bash
pytest tests/calculation/test_mvp_formula_validation.py
```

The actual command depends on the selected AIM backend stack.

### Step 4 — Export Engine Output

Write actual engine output into the `Engine_Output` sheet using the required columns.

The engine output must include:

1. Corrosion rate.
2. Remaining life or `N/A`.
3. Engine status.
4. Warning message or warning code.
5. Formula version used.
6. Calculation run identifier in the application/database, where available.

### Step 5 — Review Difference Check

Open the `Difference_Check` sheet and confirm:

1. `corrosion_rate_diff` is within tolerance.
2. `remaining_life_diff` is within tolerance or correctly marked `N/A`.
3. `pass_fail` is `PASS` for all approved fixture cases.
4. Comments do not indicate mismatch or blocked validation.

### Step 6 — Engineer Review

Engineer or Lead Engineer reviews:

1. Formula version.
2. Input data.
3. Evidence linkage.
4. Manual expected values.
5. Engine output.
6. Difference check result.
7. Warning behavior.
8. Exception handling.

### Step 7 — Sign-Off

Reviewer_Signoff must be completed before using the workbook as an approved validation fixture.

Minimum sign-off requirements:

1. `formula_version` populated.
2. `reviewed_by` populated by Engineer or Lead Engineer.
3. `approved_by` populated by Approver or authorized Lead Engineer.
4. `approval_date` populated.
5. `comment` includes approval scope and limitations.

---

## 8. Test Case Interpretation

| Test Case | Interpretation |
|---|---|
| `TC-001` | Normal case proving positive corrosion rate, positive remaining life, and OK status. |
| `TC-002` | Current thickness is below minimum required thickness; must block final-use status. |
| `TC-003` | Zero corrosion must not cause divide-by-zero and must show review warning. |
| `TC-004` | Negative corrosion rate indicates potential data, evidence, timing, or unit issue. |
| `TC-005` | Missing previous thickness prevents corrosion-rate calculation. |
| `TC-006` | Missing evidence blocks promotion even when numeric values are calculable. |
| `TC-007` | Remaining life is below the MVP action threshold and should trigger action-required status. |
| `TC-008` | Suspected unit mismatch must block final use until checked by engineer. |

---

## 9. Evidence Requirements

Every calculation test case must link to evidence unless it is intentionally testing missing evidence handling.

Evidence metadata should include:

1. `evidence_code`.
2. Object storage key or URI.
3. Evidence type, such as PDF page, UT report, photograph, drawing, or inspection sheet.
4. Source file name.
5. Page number or coordinate reference where applicable.
6. Uploaded by.
7. Upload timestamp.
8. Hash/checksum where available.
9. Linkage to asset, component, inspection event, NDT measurement, calculation run, integrity decision, and report section where applicable.

A calculation result without evidence linkage must not be promoted to final engineering data and must not be used for issued reports.

---

## 10. Exception Handling Rules

| Exception | Required Behavior |
|---|---|
| Missing previous thickness | Return blocked/incomplete status and warning. |
| Missing current thickness | Return blocked/incomplete status and warning. |
| Missing minimum required thickness | Return blocked/incomplete status and warning. |
| Missing years between inspections | Return blocked/incomplete status and warning. |
| Years between inspections <= 0 | Return blocked/incomplete status and warning. |
| Current thickness below minimum required thickness | Return below-minimum review status and warning. |
| Corrosion rate = 0 | Return remaining life as `N/A`; show zero-rate review warning. |
| Corrosion rate < 0 | Return data review status and warning. |
| Missing evidence | Return blocked evidence status and warning. |
| Suspected unit mismatch | Return unit review status and warning. |
| Formula version not approved | Block calculation from final use. |
| User lacks permission | Reject action and write audit event. |

---

## 11. Production Implementation Expectations

The workbook is a validation artifact. Production implementation must enforce the same behavior in the AIM application layer.

### 11.1 Deterministic Calculation Engine

The calculation engine must:

1. Accept a controlled input payload.
2. Require explicit formula version.
3. Produce deterministic output.
4. Return warnings and status codes.
5. Attach the output disclaimer: **Engineering review required before final use.**
6. Persist results only through the AIM backend service layer.
7. Write required audit events.

### 11.2 Formula Registry

The formula registry must:

1. Store formula identifier.
2. Store formula version.
3. Store approval status.
4. Store reviewer and approver metadata.
5. Preserve immutable approved versions.
6. Retire but not overwrite prior approved versions.
7. Expose approved versions to the calculation engine.

### 11.3 Auditability

For every calculation run, the system must record:

1. Input snapshot.
2. Formula version.
3. Output snapshot.
4. Status and warnings.
5. Evidence links.
6. User who initiated the run.
7. Review and approval metadata.
8. Audit events.

---

## 12. AIM / n8n Boundary Confirmation

n8n may orchestrate:

1. Notifications when calculation input is ready for review.
2. Reminders for pending engineer review.
3. Approval-routing notifications.
4. Integration handoff after AIM emits an approved event.
5. Audit-event requests through AIM API only.

n8n must not:

1. Store final engineering data.
2. Write directly to PostgreSQL.
3. Run or approve final calculation logic as the authority.
4. Promote staging data to final tables.
5. Approve reports, calculations, integrity decisions, or work orders.

---

## 13. Acceptance Criteria

The validation method is accepted when:

1. Workbook contains all six required sheets.
2. Workbook contains the requested columns in each sheet.
3. Workbook contains at least eight representative test cases.
4. Manual expected values are populated for each test case.
5. Engine output sheet can receive actual engine output.
6. Difference check produces `PASS`/`FAIL` results.
7. Missing evidence, missing input, negative corrosion, zero corrosion, below-minimum thickness, low remaining life, and unit mismatch behaviors are represented.
8. No proprietary API/ASME formulas are implemented.
9. Engineering sign-off section is present.
10. Disclaimer is present: **Engineering review required before final use.**

---

## 14. Delivery Notes

### 14.1 What Changed

1. Added `07_Calculation/validation_workbook.xlsx` with six validation sheets and eight representative test cases.
2. Added `07_Calculation/calculation_validation_method.md` to define the validation process, formula boundary, test interpretation, evidence requirements, review gates, audit events, and AIM/n8n boundaries.

### 14.2 Run / Test Commands

Suggested commands after implementation exists:

```bash
npm run test:calculation
npm run test:api
npm run lint
```

Alternative backend command if Python is used:

```bash
pytest tests/calculation/test_mvp_formula_validation.py
pytest tests/api/test_calculation_workflow.py
```

### 14.3 Documentation Updates

Update or cross-link:

1. `01_PRD/AIM_MVP_PRD.md`
2. `07_Calculation/engineering_basis.md`
3. API specification
4. Database schema/migration documentation
5. n8n workflow documentation
6. User guide for Engineer, Lead Engineer, and Approver

---

## 15. Sign-Off

| Role | Name | Signature / Approval Reference | Date | Comment |
|---|---|---|---|---|
| Prepared by |  |  |  |  |
| Reviewed by Engineer |  |  |  |  |
| Reviewed by Lead Engineer |  |  |  |  |
| Approved by Approver |  |  |  |  |
| IT/Admin Acknowledgement |  |  |  |  |

**Final disclaimer:** Engineering review required before final use.
