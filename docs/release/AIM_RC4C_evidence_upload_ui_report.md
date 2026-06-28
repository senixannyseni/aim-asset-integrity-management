# AIM RC4-C Evidence Upload UI and Evidence Detail Page Report

## Package

`RC4-C — Evidence Upload UI and Evidence Detail Page`

## Status

Implemented as a frontend-focused completion package.

## Scope Implemented

RC4-C completes the Evidence Repository upload/detail frontend using existing AIM backend APIs and the RC3-B object-storage upload/download flow.

Implemented frontend routes:

- `/evidence`
- `/evidence/[evidenceId]`

Implemented files:

- `apps/web/app/evidence/page.tsx`
- `apps/web/app/evidence/[evidenceId]/page.tsx`
- `apps/web/app/globals.css`

Documentation updates:

- `README.md`
- `docs/sprint-status.md`
- `docs/operations/source_of_truth_alignment_checklist.md`
- `docs/release/AIM_RC4C_evidence_upload_ui_report.md`
- `docs/uat/uat_rc4c_evidence_upload_ui.md`

## User-Facing Capabilities

The `/evidence` page now provides evidence list/table, object-storage upload panel, metadata summary, asset filter, inspection/event filter over visible rows, method/component/location/page reference display, upload status, malware scan status, checksum, storage provider/bucket summary without raw object keys, detail links, audited open/download action, loading state, empty state, error state, and permission-denied state.

The upload panel follows the existing object-storage flow: file picker, client-side file validation, browser SHA-256 checksum calculation, `POST /api/v1/evidence/upload-url`, browser upload to the returned signed PUT URL or controlled upload instruction, and `POST /api/v1/evidence/complete-upload`.

The `/evidence/[evidenceId]` page shows evidence metadata, object-storage status, upload status, malware status, checksum, file size, MIME type, asset link, inspection/event reference, component/location/method, page/sheet reference, evidence linkage, audit link, supersession/replacement status where returned, audited open/download action, and safe preview for PDF/image/CSV where feasible.

## Safety and Governance Controls

- AIM remains the system of record.
- PostgreSQL stores metadata/final structured engineering data.
- Object storage stores original evidence binaries.
- n8n remains orchestration-only and is not called directly by the frontend.
- AI extraction remains staging-first and is not changed by RC4-C.
- Evidence linkage remains mandatory.
- Frontend validation is UX-only; backend validation remains authoritative.
- No new calculations or API/ASME formulas are introduced.
- No backend schema or migration is introduced.

## Preview Safety

Preview/open/download is blocked in the frontend for evidence with infected, blocked, quarantined, scan-failed, deleted, or delete-requested status. Backend access controls remain authoritative.

The UI does not display raw object keys, signed URLs, tokens, secrets, or object-storage credentials.

## Backend/API Impact

No new backend API route is introduced. Existing endpoints used:

- `GET /api/v1/evidence`
- `GET /api/v1/evidence/{evidenceId}`
- `POST /api/v1/evidence/upload-url`
- `POST /api/v1/evidence/complete-upload`
- `GET /api/v1/evidence/{evidenceId}/download-url`
- legacy fallback only: `POST /api/v1/evidence/upload`

## Known Limitations

- Frontend validation is not authoritative.
- Browser upload/preview behavior depends on object-storage CORS policy.
- Metadata persistence remains limited to fields accepted by the existing backend object-storage flow; no backend schema or endpoint behavior is changed by RC4-C.
- Legacy/manual evidence registration remains visible only as a labelled fallback and does not upload a new object-storage file.
