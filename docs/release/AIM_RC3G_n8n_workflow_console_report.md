# AIM RC3-G n8n Workflow Console / Orchestration Visibility Report

## Status

RC3-G package candidate implemented.

## Summary

RC3-G adds a read-only AIM-side workflow console for orchestration visibility. It summarizes existing workflow tasks, notification logs, workflow events, error logs, and n8n-related audit/event metadata while preserving the AIM source-of-truth boundary.

## Implemented scope

- `GET /api/v1/workflow-console/overview` protected by `workflow_console.view`.
- Frontend route `/workflow-console`.
- Read-only sections for workflow task summary, pending human follow-ups, notification delivery status, workflow failure/error summary, recent workflow events, and n8n boundary reminders.
- Explicit service/AI/n8n/integration/workflow actor blocking for broad workflow console visibility.
- Metadata redaction for token, secret, password, credential, api_key, authorization, bearer, signed URL, presigned URL, webhook secret, private key, object key, raw file content, and raw report content patterns.
- `workflow_console.view` permission synchronization through migration and seed updates.
- OpenAPI, UAT, and n8n boundary documentation.

## Migration summary

Adds `db/migrations/0024_workflow_console_visibility.sql` to synchronize the read-only `workflow_console.view` permission and grant it to human/admin viewing roles only (`admin`, `it_admin`, and `management`). No workflow console data table is created.

## Out of scope confirmation

RC3-G uses a governed boundary instead of n8n workflow execution, retry, builder/editor, credential management, webhook secret editing, direct PostgreSQL writes, NDT visualization, hypercare dashboard, new AI features, new object-storage features, new report builder features, new calculation logic, API 579/API 581 calculations, external CMMS integration, direct database editing, audit mutation, admin setting/RBAC changes beyond permission synchronization, or AI/n8n/service approval/final engineering decision automation.

## Validation target

Run:

```powershell
pnpm db:migrate
pnpm db:seed
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter @aim/api test -- rc3-g-n8n-workflow-console.test.ts
pnpm --filter @aim/api test -- rc3-f-governance-dashboard-readiness.test.ts
pnpm --filter @aim/api test -- rc3-e-admin-governance-console.test.ts
pnpm --filter @aim/api test -- rc3-d-audit-log-governance-visibility.test.ts
pnpm --filter @aim/api test -- rc3-c-ai-staging-promotion-governance.test.ts
pnpm --filter @aim/api test -- rc3-b-object-storage-governance.test.ts
pnpm --filter @aim/api test -- phase1-7-governance-closure.test.ts
pnpm --filter @aim/api test -- phase1-4-openapi-contract.test.ts
pnpm --filter @aim/api test -- report-generation.test.ts
```

## Known limitation

The console links to existing AIM pages; those destination pages remain protected by their own RBAC controls. Future polish may hide individual links based on the viewer's downstream page permissions.
