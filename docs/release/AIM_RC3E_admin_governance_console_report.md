# AIM RC3-E Admin Governance Console Report

## Scope implemented

RC3-E adds RBAC-controlled admin governance visibility and safe admin controls for users, roles, permissions, user-role assignments, and system settings.

Implemented:

- Admin governance API endpoints for users, roles, permissions, role-permissions, user-roles, and system settings.
- Controlled user-role assignment/removal with reason and audit logging.
- Controlled allowlisted non-secret system setting update with reason and audit logging.
- `admin_governance.view`, `admin_governance.manage_roles`, and `admin_governance.manage_settings` permissions.
- Service/AI/n8n-style actor blocking for broad admin governance access and management.
- Frontend `/admin-governance` page.
- OpenAPI contract updates.
- UAT script and n8n boundary addendum.

## Governance controls

- AIM remains the system of record.
- No second RBAC or settings system is introduced.
- No direct database editor is introduced.
- Secrets, tokens, passwords, signed URLs, object-storage credentials, private keys, and environment variables are not exposed.
- All admin mutations require permission and a meaningful reason.
- Role and setting mutations are audited through the existing audit log system.
- Self-escalation and last-admin removal are blocked.
- Unknown, secret, sensitive, and environment-derived settings are blocked from update.

## Out of scope confirmed

RC3-E uses a governed boundary instead of dashboard, n8n console, NDT visualization, hypercare dashboard, new AI extraction, new staging promotion, new calculations, external CMMS/SAP/Maximo integration, audit log editing/deletion, secret management UI, or environment variable editing UI.

## Validation

Run:

```powershell
pnpm db:migrate
pnpm db:seed
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter @aim/api test -- rc3-e-admin-governance-console.test.ts
pnpm --filter @aim/api test -- rc3-d-audit-log-governance-visibility.test.ts
pnpm --filter @aim/api test -- rc3-c-ai-staging-promotion-governance.test.ts
pnpm --filter @aim/api test -- rc3-b-object-storage-governance.test.ts
pnpm --filter @aim/api test -- phase1-7-governance-closure.test.ts
pnpm --filter @aim/api test -- phase1-4-openapi-contract.test.ts
pnpm --filter @aim/api test -- report-generation.test.ts
```
