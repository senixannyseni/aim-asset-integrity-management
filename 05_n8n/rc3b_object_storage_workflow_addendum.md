# RC3-B Object Storage Workflow Addendum

**Scope:** Evidence object-storage upload/download and report export artifact storage.  
**Status:** RC3-B closeout polish baseline.  
**Boundary:** n8n remains workflow orchestration only and must call AIM backend APIs. n8n must not write PostgreSQL tables directly and must not store final engineering data or raw evidence/report binaries.

## 1. Source-of-truth rules

- AIM is the system of record for evidence metadata, report export metadata, workflow events, error logs, and audit logs.
- PostgreSQL stores metadata, object keys, checksums, statuses, linkage, and audit references.
- Object storage stores original evidence binaries and generated report export artifacts.
- n8n may trigger intake notifications, review reminders, escalation notifications, and recovery workflows only through AIM APIs.
- n8n must never issue reports, approve engineering data, promote staging records, or create final engineering artifacts outside AIM approval gates.

## 2. RC3-B workflow coverage

| Workflow | Trigger | n8n Allowed Action | AIM API Boundary | Forbidden Action |
|---|---|---|---|---|
| Evidence upload requested | Human user requests upload URL in AIM | Optional notification/log routing | `POST /api/v1/evidence/upload-url` is called by AIM frontend/backend only | n8n must not generate object keys or evidence codes |
| Evidence upload completed | AIM completes object verification | Notify Engineer/Inspector or route review reminder | AIM records `EVIDENCE_UPLOAD_COMPLETED` and workflow events | n8n must not mark evidence verified directly |
| Evidence access blocked | AIM blocks missing/malware/unverified evidence access | Notify IT Admin/owner role | AIM records `EVIDENCE_ACCESS_BLOCKED` / error event | n8n must not bypass access block or create signed URL |
| Report export created | Human user requests report export in AIM | Notify/report artifact ready message | `POST /api/v1/reports/{reportId}/exports` through AIM with gates | n8n must not generate final report artifact independently |
| Report export download URL | Human user requests artifact access | Optional notification only | `GET /api/v1/report-exports/{exportId}/download-url` through AIM | n8n must not store raw signed URLs |
| Object-storage failure | AIM detects object missing/checksum mismatch/size mismatch | Recovery notification and escalation | AIM owns `/api/v1/error-logs` and `/api/v1/workflow-events` records | n8n must not retry unsafe finalizing actions blindly |

## 3. Required event behavior

- Every RC3-B workflow start/success/failure routed through n8n must post an AIM workflow event.
- Every failed workflow or unrecoverable object-storage failure must create an AIM error log through AIM APIs.
- Retry operations that can create records must use AIM idempotency rules and must query AIM status before retry.
- Signed URL query strings must not be stored in n8n execution data, logs, notifications, or audit metadata.

## 4. Closeout acceptance checks

- Evidence upload sessions use AIM-generated `EVD-{YYYY}-{six_digit_number}` evidence codes.
- Evidence upload URL requests require `checksum_sha256`.
- Evidence becomes gate-eligible only after AIM verifies object existence, size, and checksum controls.
- Report gates count only `upload_status = 'verified'` evidence.
- Legacy metadata-only evidence remains blocked until object verification.
- n8n has no PostgreSQL credentials and no direct object-storage write authority for final AIM evidence/report artifacts.
