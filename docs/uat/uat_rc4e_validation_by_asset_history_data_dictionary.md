# UAT — RC4-E Validation-by-Asset UX, Validation History, and Data Dictionary Expansion

## Objective

Verify that RC4-E exposes validation-by-asset, validation history, and data dictionary visibility without adding engineering formulas, changing approval governance, or weakening evidence linkage.

## Preconditions

- User has a role with `validation.read` for view-only screens.
- User has `validation.run` to run or refresh validation.
- At least one tank asset exists.
- Optional: NDT and evidence records exist for richer validation messages.

## Test Cases

### 1. Validation overview loads

1. Open `/validation`.
2. Confirm the page shows validation status counts: passed, warning, failed, blocked, and not checked.
3. Confirm rule categories are visible.
4. Confirm latest validation runs table is visible or an empty state appears.
5. Confirm links to `/validation/history`, `/data-dictionary`, and asset validation pages are available.

Expected result: Overview loads and clearly states validation is not engineering approval.

### 2. Run asset validation

1. Open `/validation`.
2. Select an asset.
3. Click **Run / refresh validation**.
4. Confirm a completion message is displayed.
5. Confirm the latest validation run list updates.

Expected result: Frontend calls the existing validation run API and stores a validation snapshot. No approval is performed.

### 3. Asset-specific validation page

1. Open `/assets/{assetId}/validation`.
2. Confirm asset context/header is visible.
3. Confirm link back to asset detail exists.
4. Run or refresh validation.
5. Confirm grouped validation checks appear by domain.
6. Confirm pass/warning/fail/block badges are visible.
7. Confirm field-level messages show field name, label, severity, message, suggested fix, and governance note where available.

Expected result: Asset-specific validation is visible and actionable for review without approving engineering data.

### 4. Unit validation readability

1. Use an asset context that creates unit-related validation warnings or errors, or inspect a validation result containing geometry/NDT unit messages.
2. Confirm unit-related messages appear under **Unit validation readability**.
3. Confirm no frontend engineering calculation or threshold is displayed.

Expected result: Unit issues are readable and backend validation remains authoritative.

### 5. Material master completeness visibility

1. Use an asset with incomplete shell-course material or joint-efficiency data.
2. Open `/assets/{assetId}/validation`.
3. Confirm material completeness issues are visible.

Expected result: Material completeness is visible without inventing material properties or standard clauses.

### 6. Validation history page

1. Open `/validation/history`.
2. Confirm a read-only validation run table appears.
3. Filter by asset, entity type, status, severity, and date range where data is available.
4. Open a run detail.
5. Confirm field-level issues are visible.
6. Confirm there is no edit/delete action for historical validation records.

Expected result: History is audit-style visibility only.

### 7. Data dictionary page

1. Open `/data-dictionary`.
2. Search by field name, label, domain, unit, source table/entity, validation rule, and evidence linkage term.
3. Filter by domain.
4. Confirm required/optional, data type, unit, validation summary, source-of-truth entity, frontend/API usage, evidence linkage, and governance note appear.

Expected result: Data dictionary is searchable and grouped by domain. No secrets, object keys, signed URLs, or tokens are displayed.

### 8. Permission-denied state

1. Log in as a role without validation permission or disable demo admin headers.
2. Open validation/data-dictionary pages.

Expected result: Permission-denied state is shown where backend returns 401/403.

## Governance Checks

- Validation does not approve engineering data.
- Validation does not run new engineering calculations.
- No API/ASME/API 579/API 581/FFS/RBI formulas are introduced.
- No FFS/RBI trigger logic is introduced.
- AI/n8n/service actors cannot approve, promote, issue, calculate, or make final engineering decisions.
- Evidence linkage remains mandatory.
- n8n remains orchestration-only.
