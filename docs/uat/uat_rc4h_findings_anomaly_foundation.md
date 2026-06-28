# UAT — RC4-H Findings / Anomaly Foundation

## Objective

Confirm that engineers can create, view, update, link, and close findings/anomalies with evidence/NDT/calculation traceability while preserving AIM governance boundaries.

## Prerequisites

- RC4-G baseline is merged and tagged.
- User has a human role with finding permissions, such as engineer, senior engineer, lead engineer, QA/QC, or admin.
- At least one asset exists.
- At least one evidence file, NDT measurement, and calculation run exist for the same asset where linkage testing is required.

## Test Cases

### 1. Findings overview route

1. Open `/findings`.
2. Confirm the findings list loads.
3. Confirm filters are visible for asset, component, severity, status, type, and source.
4. Confirm create finding panel is visible.
5. Confirm governance note states findings do not create FFS/RBI cases or final integrity decisions.

Expected result: page loads with list/create UX and governance note.

### 2. Create a finding

1. Select an asset.
2. Enter title, finding type, severity, source type, component, and description.
3. Optionally select same-asset evidence, NDT measurement, and calculation run.
4. Submit.

Expected result: finding is created, appears in the list, and an audit log reference is returned where available.

### 3. Required field validation

1. Attempt to create finding without `asset_id`, `title`, `finding_type`, or `severity`.

Expected result: frontend validation shows required-field messages; backend remains authoritative.

### 4. Cross-asset linkage control

1. Attempt to create or update a finding with evidence/NDT/calculation from a different asset.

Expected result: backend rejects the request with cross-asset linkage error and writes `finding.cross_asset_link_blocked` audit event.

### 5. Finding detail route

1. Open `/findings/{findingId}`.
2. Confirm metadata, description/disposition, evidence linkage, NDT linkage, calculation linkage, validation history link, and audit-log link appear.

Expected result: finding detail is visible and links route to existing safe application pages.

### 6. Asset-specific findings route

1. Open `/assets/{assetId}/findings`.
2. Confirm findings are filtered to the selected asset.
3. Confirm create form has `asset_id` prefilled.

Expected result: asset-scoped findings are visible and new findings are created for the selected asset.

### 7. Critical missing-evidence warning

1. Create a critical finding without evidence.
2. Open the finding detail page.

Expected result: critical missing-evidence warning is visible.

### 8. Closure controls

1. Attempt to close a finding without closure reason.
2. Attempt to close a critical finding without evidence.
3. Attempt closure as an AI/service/n8n actor where available.

Expected result:

- Missing closure reason is rejected.
- Critical finding closure without evidence is blocked.
- AI/n8n/service actor closure is blocked.
- Human closure with required evidence and closure reason succeeds where authorized.

### 9. No automatic FFS/RBI case creation

1. Create high or critical findings.
2. Search FFS/RBI modules.

Expected result: no FFS/RBI case is automatically created by RC4-H.

## Governance Confirmation

- No engineering formulas are introduced.
- No API/ASME/API 579/API 581/FFS/RBI calculation content is introduced.
- Finding closure does not approve engineering data.
- Finding closure does not issue reports.
- Finding closure does not create final integrity decisions.
- AIM remains system of record.
- n8n remains orchestration-only.
