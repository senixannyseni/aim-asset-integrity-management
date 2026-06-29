# RC3-G n8n Workflow Console / Orchestration Visibility Patch Manifest

## Scope

Implements RC3-G only: read-only AIM-side n8n/workflow orchestration visibility.

## Changed files

- `apps/api/src/routes/workflow-console.ts`
- `apps/api/src/app.ts`
- `apps/api/src/rbac/roles.ts`
- `apps/api/tests/rc3-g-n8n-workflow-console.test.ts`
- `apps/api/tests/migration-sequence.test.ts`
- `apps/web/app/workflow-console/WorkflowConsoleClient.tsx`
- `apps/web/app/workflow-console/page.tsx`
- `db/migrations/0024_workflow_console_visibility.sql`
- `db/seeds/0001_foundation_seed.sql`
- `04_API/openapi.yaml`
- `README.md`
- `docs/sprint-status.md`
- `docs/uat/uat_rc3_n8n_workflow_console_scripts.md`
- `docs/release/AIM_RC3G_n8n_workflow_console_report.md`
- `05_n8n/rc3g_workflow_console_boundary_addendum.md`

## Boundary confirmation

- No n8n workflow execution is introduced.
- No n8n builder/editor is introduced.
- No credential or webhook secret editor is introduced.
- No direct PostgreSQL write path for n8n is introduced.
- No workflow console snapshot table is introduced.
- No NDT visualization, hypercare dashboard, new AI feature, object-storage expansion, report builder expansion, calculation logic, or external CMMS integration is introduced.
