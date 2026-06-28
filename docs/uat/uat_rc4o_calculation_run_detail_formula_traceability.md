# RC4-O Calculation Run Detail and Formula Traceability UAT

## Objective

Confirm that users can review calculation-run formula traceability and final-use readiness before relying on the calculation for integrity decisions, reports, or internal work orders.

## Preconditions

- User has `calculation.read` permission.
- At least one calculation run exists.
- Optional: calculation run has linked evidence, engineering review, approval record, integrity decision, report, or internal work order.

## Test cases

### 1. Calculation detail page loads

1. Open `/calculations`.
2. Select **Formula readiness** for an existing calculation run.
3. Confirm `/calculations/[runId]` opens.
4. Confirm the page shows formula traceability readiness, snapshot hashes, calculation metadata, formula version snapshot, inputs, outputs, warnings, evidence, reviews, approvals, downstream traceability, and audit timeline.

Expected result: calculation detail is readable without raw JSON being the only operational view.

### 2. Readiness endpoint is read-only

1. Call `GET /api/v1/engineering/calculations/{runId}/readiness`.
2. Confirm response includes `ready_for_final_use`, `ready_for_downstream_decision`, `gate_summary`, `readiness_gates`, `formula_traceability`, `input_output_traceability`, `linked_evidence`, `linked_context`, and `governance_notes`.
3. Confirm no calculation status changes after the call.

Expected result: readiness preview does not approve, reject, lock, recalculate, or mutate calculation records.

### 3. Readiness gates show blockers

1. Use a calculation run without review, approval, or evidence linkage.
2. Open the detail page.
3. Confirm failed gates are visible for missing review, approval, or evidence.

Expected result: blockers are shown before downstream engineering use.

### 4. Human governance boundary remains clear

1. Review the detail page governance text.
2. Confirm the page states that AI/n8n/service actors cannot approve calculation final use.
3. Confirm approval remains handled by existing engineering review and approval workflows.

Expected result: RC4-O does not introduce a new approval bypass.

## Out of scope

- Formula changes.
- New calculations.
- AI extraction changes.
- Report issue.
- Integrity decision approval.
- Work-order closure.
- Object-storage changes.
- External CMMS integration.
