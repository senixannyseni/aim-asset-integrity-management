# AIM RC3-D — Audit Log Governance Visibility Report

## Status

RC3-D implements read-only audit log governance visibility for AIM Tank Integrity.

## Implemented scope

- `GET /api/v1/audit-logs` read-only audit log list API.
- `GET /api/v1/audit-logs/{auditLogId}` read-only audit log detail API.
- RBAC permission `audit_logs.view`.
- Service/AI/n8n-style actor block for broad audit UI visibility.
- Metadata redaction for sensitive keys and signed URL values.
- Frontend route `/audit-logs` with filters, pagination, compact list, and detail panel.
- Traceability labels/links for existing AIM routes where safe.
- OpenAPI contract update.
- UAT script for audit governance visibility.
- n8n boundary addendum.

## Governance controls

- Audit logs remain immutable governance records.
- RC3-D exposes audit logs for visibility only.
- No audit log edit, delete, purge, suppress, backdate, overwrite, approve, reject, promote, or issue controls are introduced.
- Sensitive values such as tokens, secrets, passwords, authorization headers, cookies, signed URLs, presigned URLs, credentials, access keys, secret keys, and private keys are redacted before API/UI display.
- AIM remains the system of record.
- n8n remains orchestration-only and must use AIM APIs.

## Existing events visible

The audit visibility API/UI can display prior RC governance events, including:

- `EVIDENCE_UPLOAD_URL_CREATED`
- `EVIDENCE_UPLOAD_COMPLETED`
- `EVIDENCE_DOWNLOAD_URL_CREATED`
- `EVIDENCE_DOWNLOAD_OPENED`
- `EVIDENCE_ACCESS_BLOCKED`
- `REPORT_EXPORT_CREATED`
- `REPORT_EXPORT_DOWNLOAD_URL_CREATED`
- `REPORT_ISSUE_BLOCKED`
- `REPORT_ISSUED`
- `AI_FIELD_APPROVED`
- `AI_FIELD_CORRECTED`
- `AI_FIELD_REJECTED`
- `AI_FIELD_OVERRIDE_RECORDED`
- `AI_STAGING_PROMOTION_REQUESTED`
- `AI_STAGING_PROMOTION_BLOCKED`
- `AI_STAGING_PROMOTED`
- `AI_STAGING_PROMOTION_FAILED`

## Out of scope not implemented

- Admin UI
- Dashboard
- n8n console
- NDT visualization
- Hypercare dashboard
- Report builder expansion
- Object-storage feature expansion
- AI extraction feature expansion
- AI staging promotion feature expansion
- External CMMS / SAP / Maximo integration
- API 579 / API 581 calculation implementation
- Audit mutation/tampering tools
- AI approval or final engineering decision automation

## Validation

Expected validation commands:

```powershell
pnpm db:migrate
pnpm db:seed
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter @aim/api test -- rc3-d-audit-log-governance-visibility.test.ts
pnpm --filter @aim/api test -- rc3-c-ai-staging-promotion-governance.test.ts
pnpm --filter @aim/api test -- rc3-b-object-storage-governance.test.ts
pnpm --filter @aim/api test -- phase1-7-governance-closure.test.ts
pnpm --filter @aim/api test -- phase1-4-openapi-contract.test.ts
pnpm --filter @aim/api test -- report-generation.test.ts
```
