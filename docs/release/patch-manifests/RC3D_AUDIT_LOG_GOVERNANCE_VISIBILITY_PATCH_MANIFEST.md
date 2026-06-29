# RC3-D Audit Log Governance Visibility Patch Manifest

Package: `RC3-D — Audit Log UI / Governance Visibility`

## Scope

This patch adds read-only audit log governance visibility only.

## Added files

- `apps/api/src/modules/audit-log/redaction.ts`
- `apps/api/src/routes/audit-logs.ts`
- `apps/api/tests/rc3-d-audit-log-governance-visibility.test.ts`
- `apps/web/app/audit-logs/page.tsx`
- `apps/web/app/audit-logs/AuditLogsClient.tsx`
- `db/migrations/0022_audit_log_governance_visibility.sql`
- `docs/uat/uat_rc3_audit_log_governance_visibility_scripts.md`
- `05_n8n/rc3d_audit_log_governance_visibility_addendum.md`
- `docs/release/AIM_RC3D_audit_log_governance_visibility_report.md`

## Modified files

- `README.md`
- `04_API/openapi.yaml`
- `apps/api/src/app.ts`
- `apps/api/src/rbac/roles.ts`
- `apps/api/tests/migration-sequence.test.ts`
- `apps/web/app/page.tsx`
- `apps/web/app/globals.css`
- `db/seeds/0001_foundation_seed.sql`
- `docs/sprint-status.md`

## Out of scope explicitly not implemented

- Admin UI
- Dashboard
- n8n console
- NDT visualization
- Hypercare dashboard
- New report builder features
- New object-storage features
- New AI extraction features
- New AI staging promotion features
- External CMMS / SAP / Maximo integration
- API 579 / API 581 calculation implementation
- Audit log mutation, deletion, purge, suppress, backdating, or tampering tools
- AI approval or final engineering decision automation
