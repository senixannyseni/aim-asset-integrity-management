# RC3-D UAT — Audit Log Governance Visibility

## Purpose
Validate that RC3-D exposes AIM audit logs through read-only, RBAC-controlled API/UI visibility with sensitive metadata redaction.

## Preconditions

- RC3-C final tag has been merged into `main`.
- Database migrations and seeds have been applied.
- A human user with `audit_logs.view` permission is available, for example admin, senior engineer, lead engineer, QA/QC, approver, or IT admin.
- At least one audit event exists from RC3-B or RC3-C, such as `EVIDENCE_UPLOAD_COMPLETED`, `REPORT_EXPORT_CREATED`, `AI_FIELD_APPROVED`, or `AI_STAGING_PROMOTED`.

## Script

### 1. Authorized list view

1. Login as a human user with `audit_logs.view`.
2. Open `/audit-logs`.
3. Confirm the audit log list loads through `GET /api/v1/audit-logs`.
4. Confirm the page displays event type, entity type, entity ID, actor, timestamp, request ID, and traceability context.

Expected result: list is visible and the page clearly states read-only governance visibility.

### 2. Filter by event type

1. Filter by `event_type=AI_STAGING_PROMOTED` or another known event.
2. Confirm the list only shows matching events.

Expected result: the API returns matching events with pagination metadata.

### 3. Filter by entity type and entity ID

1. Filter by an existing `entity_type`, for example `extraction_job`, `evidence_file`, or `report_export`.
2. If available, add an `entity_id` UUID.
3. Confirm the result set matches the requested entity.

Expected result: filtering is exact for entity fields.

### 4. Open detail view

1. Open an audit event detail from the list.
2. Confirm `GET /api/v1/audit-logs/{auditLogId}` returns metadata, before/after snapshots, actor context, traceability, and created timestamp.

Expected result: detail view opens and remains read-only.

### 5. Redaction check

1. Locate or insert a test audit metadata record through AIM API/test fixture containing keys such as `token`, `signed_url`, `presigned_url`, `secret`, `authorization`, `access_key`, or `private_key`.
2. Open the audit list/detail.
3. Confirm sensitive values display as `[REDACTED]` or are omitted.

Expected result: signed URLs, secrets, object-storage credentials, tokens, cookies, and passwords are never displayed.

### 6. Unauthorized user blocked

1. Login as a user without `audit_logs.view`, such as a basic inspector or client viewer.
2. Attempt to open `/audit-logs` or call `GET /api/v1/audit-logs`.

Expected result: API returns `403 FORBIDDEN`.

### 7. Service / AI / n8n actor blocked

1. Attempt to access `GET /api/v1/audit-logs` with an AI/service/n8n-style actor or the `ai_agent` role.
2. Confirm broad audit UI visibility is blocked.

Expected result: API returns `AUDIT_LOG_SERVICE_ACTOR_BLOCKED` or no broad audit permission is granted.

### 8. Immutability and read-only UI check

1. Inspect the audit log UI.
2. Confirm there are no edit, delete, purge, suppress, approve, reject, promote, or issue controls.
3. Confirm only GET endpoints are documented for audit visibility.

Expected result: RC3-D provides visibility only and does not mutate audit logs.

### 9. n8n boundary check

1. Confirm n8n workflow documentation states n8n may call AIM APIs to record orchestration events.
2. Confirm n8n must not write directly to PostgreSQL, edit audit logs, delete audit logs, suppress audit logs, approve/correct/reject fields, promote staging records, issue reports, or finalize engineering decisions.

Expected result: n8n remains API-only orchestration.

## Evidence to Capture

- Screenshot of `/audit-logs` list.
- Screenshot of audit detail with redacted metadata.
- API response for unauthorized user blocked.
- API response for service actor blocked.
- Confirmation that no mutation controls are present.
