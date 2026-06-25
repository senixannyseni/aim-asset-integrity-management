# RC3-B Object Storage Evidence Runbook

## Purpose

RC3-B implements the source-of-truth evidence boundary: AIM stores evidence metadata, hashes, object keys, links, and audit logs in PostgreSQL, while original evidence files are stored in private S3-compatible object storage such as MinIO.

## Required environment variables

```text
OBJECT_STORAGE_ENDPOINT
OBJECT_STORAGE_REGION
OBJECT_STORAGE_BUCKET
OBJECT_STORAGE_ACCESS_KEY_ID
OBJECT_STORAGE_SECRET_ACCESS_KEY
OBJECT_STORAGE_FORCE_PATH_STYLE
OBJECT_STORAGE_SIGNED_URL_TTL_SECONDS
EVIDENCE_MAX_FILE_SIZE_BYTES
EVIDENCE_ALLOWED_MIME_TYPES
EVIDENCE_ALLOWED_EXTENSIONS
```

## Evidence upload flow

1. A human user calls `POST /api/v1/evidence/upload-url`.
2. AIM validates asset, filename, MIME type, size, extension, and RBAC.
3. AIM generates the object key. The client does not provide arbitrary object keys.
4. AIM creates `evidence_upload_sessions` with `upload_status=pending`.
5. AIM returns a short-lived signed PUT URL.
6. Client uploads file directly to object storage.
7. A human user calls `POST /api/v1/evidence/complete-upload`.
8. AIM calls `headObject` and verifies object existence and size before finalizing `evidence_files` metadata.
9. AIM writes `EVIDENCE_UPLOAD_COMPLETED` audit log.

Evidence metadata is not finalized if object storage verification fails.

## Evidence download flow

1. A user calls `GET /api/v1/evidence/{evidenceId}/download-url` or `/download`.
2. AIM checks RBAC, evidence existence, object key existence, object storage existence, and malware status.
3. AIM writes an audit log.
4. AIM returns or redirects to a signed object-storage URL.

Signed URL query strings must never be stored unredacted in audit logs.

## Governance notes

- AI/service users cannot create or complete final evidence upload artifacts.
- n8n must not write evidence files or final evidence metadata directly.
- Evidence linked to calculations, reports, integrity decisions, or work orders remains delete-protected.
