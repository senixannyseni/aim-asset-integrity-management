# RC4-L Work Order Detail and Closure Readiness UAT

## Objective

Verify that internal AIM work orders can be reviewed, updated, and closed from a governed detail page with visible closure-readiness gates before closure.

## Preconditions

- User has `work_order.read` to view work orders.
- User has `work_order.update` to update assignment/status/action details.
- User has `work_order.close` to close internal work orders.
- At least one internal work order exists from an approved integrity decision or issued report.
- At least one evidence link exists for a work order that requires closure evidence.

## Test cases

### 1. Open detail page

1. Navigate to `/work-orders`.
2. Open a work order detail page.
3. Confirm the page shows status, priority, source traceability, closure readiness gates, linked evidence, and audit timeline.

Expected result: detail page loads without raw JSON-only presentation.

### 2. Read-only closure readiness preview

1. Open `/work-orders/{workOrderId}`.
2. Confirm closure gates are visible from `/api/v1/work-orders/{workOrderId}/closure-readiness`.
3. Confirm gates include completion note, closure evidence, external CMMS boundary, and source traceability.

Expected result: readiness preview does not close or mutate the work order.

### 3. Update work order

1. As a user with `work_order.update`, change priority, status, assignee role, due date, or recommended action.
2. Save changes.

Expected result: update succeeds and writes audit trail. External CMMS reference remains unavailable.

### 4. Close blocked without required evidence

1. Use a work order with `closure_evidence_required = true` and no linked closure evidence.
2. Attempt closure with a completion note.

Expected result: closure is blocked with `WORK_ORDER_CLOSURE_GATES_NOT_SATISFIED` or evidence-required gate failure.

### 5. Close with completion note and valid evidence

1. Link closure evidence to the work order.
2. Enter a completion note.
3. Close the work order.

Expected result: work order status becomes `closed`, closure summary is stored, closure evidence link is retained, and an audit event is written.

### 6. Closed work order is locked

1. Attempt to update or close the same closed work order again.

Expected result: update is blocked with `WORK_ORDER_FINAL_STATE_LOCKED` and close is blocked with `WORK_ORDER_ALREADY_CLOSED`.

### 7. External CMMS boundary

1. Attempt to update or create a work order with `external_cmms_reference`.

Expected result: request is rejected with `EXTERNAL_CMMS_OUT_OF_SCOPE`.

## Acceptance criteria

- Work order detail is readable and not raw JSON-only.
- Closure-readiness preview is read-only.
- Close endpoint enforces the same gate model.
- Completion note is mandatory.
- Closure evidence is enforced when required.
- Closed work orders are not mutable through generic update/close endpoints.
- No external CMMS write occurs.
- AI/n8n/service actors do not gain closure authority.
