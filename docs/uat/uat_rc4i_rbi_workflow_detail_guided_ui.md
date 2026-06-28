# UAT Script — RC4-I RBI Workflow Detail, Guided UI, and Duplicate Prevention

## Objective

Verify that the RBI workflow supports guided input, case detail review, calculation-warning trigger duplicate prevention, repeated-anomaly trigger from findings history, RBAC-aware actions, and placeholder risk visualization without implementing quantitative API RP 581 formulas.

## Preconditions

- User can log in as Engineer and Senior Engineer/Lead Engineer/Admin.
- At least one active tank asset exists.
- At least one calculation run exists with RBI trigger warning output, such as `HIGH_CORROSION_RATE`, `LOW_REMAINING_LIFE`, or `RBI_TRIGGER_CANDIDATE`.
- At least two relevant active findings exist for the same asset/component if testing finding-history trigger.
- Evidence files used by calculation/finding sources belong to the same asset.

## Test Cases

### RC4I-UAT-01 — Guided manual RBI case creation

1. Open `/rbi`.
2. Confirm the manual creation form is guided field entry, not JSON-only payload entry.
3. Enter asset ID, component, damage mechanism, risk category, recommended interval, and inspection plan reference.
4. Submit the form.
5. Confirm the new case appears in the RBI case table.
6. Confirm the case has status `open` and trigger source `engineering_review`.

Expected result: RBI case is created through backend API and audit log reference is returned.

### RC4I-UAT-02 — Calculation-warning trigger and duplicate prevention

1. On `/rbi`, enter a calculation run ID with RBI trigger warning output.
2. Submit “Create from calculation”.
3. Confirm an RBI case is created with trigger source `calculation_warning`.
4. Repeat the same submission for the same calculation run.

Expected result: second submission is blocked with `RBI_DUPLICATE_TRIGGER_BLOCKED` or equivalent duplicate warning showing the existing case.

### RC4I-UAT-03 — Repeated finding-history trigger

1. Confirm at least two relevant active findings exist for the same asset/component.
2. On `/rbi`, enter the asset ID or a seed finding ID/code.
3. Submit “Create from findings history”.
4. Open the created case detail.

Expected result: case is created with trigger source `finding_history`, trigger rule `RBI-TRIG-REPEATED-ANOMALY`, and source findings visible on the detail page.

### RC4I-UAT-04 — RBI case detail page

1. Open `/rbi/[caseId]` from the case table.
2. Verify case summary, asset link, calculation link if applicable, risk drivers, risk category, recommended interval, evidence links, source findings, input placeholders, and audit link are visible.
3. Verify the risk matrix is labelled placeholder/semi-quantitative and does not claim quantitative API RP 581 calculation.

Expected result: Detail page shows traceability and governance status without final engineering claims.

### RC4I-UAT-05 — Review and status update

1. Log in as a user with `rbi.interface.update` and `rbi.interface.review`.
2. Update status to `under_review` or `assessment_in_progress`.
3. Record review status as `ready_for_review` with a comment.

Expected result: status/review updates succeed and audit events are written.

### RC4I-UAT-06 — Senior approval, export, and close

1. Log in as Senior Engineer/Lead Engineer/Admin.
2. Open `/rbi/[caseId]`.
3. Confirm approval is blocked while the case lacks recorded human review or is not `ready_for_review`.
4. Record review status as `ready_for_review` with a comment.
5. Approve the case through `/approve`.
6. Export the approved case through `/export`.
7. Close the case with a closure comment through `/close`.

Expected result: final actions succeed only for authorized human senior roles; approval requires recorded review, export requires prior approval/export permission, and close requires prior approval plus comment/reason.
The generic status update endpoint must not be able to mark `ready_for_review`; use `/review` to record human review before approval.

### RC4I-UAT-06A — Finalization bypass prevention

1. Attempt to call `/approve` with `status=exported`.
2. Attempt to call `/approve` with `status=closed`.
3. Attempt to export an unapproved case.
4. Attempt to close an unapproved case.
5. Attempt to close an approved case without a closure comment.

Expected result: each bypass attempt is blocked with validation/gate errors; `approved_at` is populated only by actual approval.

### RC4I-UAT-07 — AI/service actor boundary

1. Attempt approve/export/close using an AI/service role.

Expected result: action is rejected. AI/service actors cannot approve, export, close, or finalize RBI cases.

## Negative Controls

- No quantitative API RP 581 probability/consequence formula is displayed.
- No report is issued by this workflow.
- No final integrity decision is created by this workflow.
- No FFS case is created by this workflow.
- No direct n8n/database write path is introduced.

## Sign-off

| Role | Name | Result | Notes | Date |
|---|---|---|---|---|
| Engineer |  |  |  |  |
| Senior Engineer/Lead Engineer/Admin |  |  |  |  |
| QA/UAT |  |  |  |  |
