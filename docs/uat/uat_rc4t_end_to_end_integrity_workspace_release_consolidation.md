# UAT — RC4-T End-to-End Integrity Package Workspace + Release Candidate Consolidation

## Objective

Confirm that the RC4-T workspace provides a read-only end-to-end integrity package view from asset through work order without changing authoritative module gates or allowing automated finalization.

## Preconditions

- User is authenticated with a human role that has `asset.read`.
- At least one asset exists.
- Sample data includes inspection/evidence/NDT/finding/calculation/review/decision/report/work-order records where available.

## Test cases

### 1. Open consolidated workspace

1. Navigate to `/integrity-workspace`.
2. Confirm summary cards load.
3. Confirm the table lists assets and coverage counts.
4. Confirm each asset has **Open End-to-End Readiness**.

Expected result: workspace loads as read-only coverage visibility.

### 2. Open asset-level end-to-end readiness

1. Click **Open End-to-End Readiness** for one asset.
2. Confirm `/integrity-workspace/[assetId]` opens.
3. Confirm the chain is visible:
   `Asset → Inspection → Evidence → NDT → Findings → Calculation → Review/Approval → Integrity Decision → FFS/RBI → Report → Work Order`.
4. Confirm readiness gates are visible.
5. Confirm traceability sections are visible for inspection, evidence, NDT, findings, calculation, review/approval, decision, FFS/RBI, report, work order, and audit timeline.

Expected result: the page shows consolidated read-only readiness and links to authoritative module pages.

### 3. Verify no mutation actions are introduced

1. Inspect `/integrity-workspace` and `/integrity-workspace/[assetId]`.
2. Confirm there are no buttons to approve, reject, issue, close, upload, delete, promote, or calculate.

Expected result: no finalization or mutation action exists in RC4-T workspace.

### 4. Verify governance boundaries

1. Confirm governance notes state no formula execution.
2. Confirm no API 579/API 581/FFS/RBI/corrosion-rate/remaining-life formula is executed.
3. Confirm AI/n8n/service actors cannot finalize end-to-end integrity package readiness.

Expected result: RC4-T preserves AIM system-of-record and human-gated authority.

### 5. Permission boundary

1. Try loading the API as a service-style actor if local test setup supports demo headers.
2. Confirm access is blocked for AI/n8n/service/integration/workflow actors.

Expected result: service actors are rejected from broad release candidate consolidation visibility.

## Sign-off

- Engineering reviewer: ____________________
- QA/UAT reviewer: ____________________
- Date: ____________________
