# UAT — RC4-C Evidence Upload UI and Evidence Detail Page

## Objective

Validate that RC4-C completes the Evidence Repository upload/detail frontend while preserving AIM governance boundaries, object-storage evidence control, malware/access restrictions, and audited access behavior.

## Preconditions

- Backend API is running.
- Frontend is running.
- PostgreSQL migrations and seed data are applied.
- Object storage or configured local S3-compatible storage is available.
- Test user has evidence read/upload/open/download permissions.
- At least one tank asset exists.

## Test Cases

### RC4C-UAT-001 — Evidence Repository route loads

Open `/evidence`. Confirm evidence list/table, upload panel, loading/empty/error/permission states, and no raw object key, signed URL, token, or secret is displayed.

### RC4C-UAT-002 — Evidence list displays metadata

Confirm visible rows show evidence ID/code, file name, file type/MIME, asset ID, inspection/event ID where available, method, component, location, page/sheet reference, upload status, malware scan status, checksum, storage provider/bucket summary, detail link, and audited open/download action.

### RC4C-UAT-003 — Filters and search

Use asset filter, inspection/event filter, and text search. Confirm rows are filtered safely and empty state appears when no rows match.

### RC4C-UAT-004 — File picker and validation

Select supported and unsupported files. Confirm file name, size, MIME type, extension, SHA-256 checksum, and validation messages for extension/MIME/size issues.

### RC4C-UAT-005 — Object-storage upload flow

Select a supported file, fill required metadata, and submit. Confirm upload-url request, browser upload progress, complete-upload request, completion message, and evidence list refresh. Confirm signed URLs and raw object keys are not displayed.

### RC4C-UAT-006 — Upload failure handling

Simulate upload-url, signed PUT, or complete-upload failure. Confirm clear error message and no completed evidence state unless backend confirms completion.

### RC4C-UAT-007 — Evidence detail page

Open `/evidence/[evidenceId]`. Confirm metadata, object-storage status, upload status, malware status, checksum, file size, MIME type, asset/inspection context, linkage panel, and audit link.

### RC4C-UAT-008 — Safe preview

For PDF/image/CSV evidence, click Safe Preview. Confirm audited signed URL issuance and preview where browser/object-storage CORS allow it. Confirm signed URL is not displayed as text.

### RC4C-UAT-009 — Blocked/infected evidence

Open or simulate infected, blocked, quarantined, scan-failed, deleted, or delete-requested evidence. Confirm preview/open/download actions are disabled or blocked with clear warning.

### RC4C-UAT-010 — Governance boundary regression

Confirm no direct n8n call, no calculation/formula endpoint call from upload/detail actions, no raw object key display, and no AI/n8n/service actor final engineering action is introduced.

## Acceptance Criteria

RC4-C UAT passes when `/evidence` and `/evidence/[evidenceId]` work, object-storage upload-url and complete-upload flow is visible, upload status/errors are shown, evidence metadata/detail/linkage/preview are safe, blocked evidence cannot be previewed/opened, docs mention RC4-C, and full lint/typecheck/test commands pass.
