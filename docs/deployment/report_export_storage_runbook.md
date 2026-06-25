# RC3-B Report Export Object Storage Runbook

## Purpose

RC3-B stores generated report export artifacts in object storage. PostgreSQL stores report export metadata, object keys, hashes, actor IDs, and audit events.

## Endpoints

```text
POST /api/v1/reports/{reportId}/exports
GET  /api/v1/reports/{reportId}/exports
GET  /api/v1/report-exports/{exportId}/download-url
```

## Export flow

1. A human user with `report.export` calls `POST /api/v1/reports/{reportId}/exports`.
2. AIM verifies the report exists and the actor is not AI/n8n/service.
3. Final PDF/DOCX export is blocked unless the report has passed governance gates and is issued.
4. AIM writes the generated artifact to object storage.
5. AIM stores `report_exports` metadata and `content_hash_sha256`.
6. AIM writes `REPORT_EXPORT_CREATED` audit log.
7. Download URLs require RBAC and object-existence verification.

## Security notes

- Do not return large base64 report artifacts as the normal export API response.
- Do not log signed URL query strings.
- Do not allow AI or n8n service identities to issue or export final report artifacts.
