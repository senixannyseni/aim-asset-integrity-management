# RC3-G n8n Workflow Console Boundary Addendum

RC3-G introduces AIM-side read-only workflow console visibility. It does not create an n8n workflow executor, n8n workflow editor, credential store, webhook secret editor, or n8n dashboard data store.

## n8n may

- call AIM APIs to route reminders based on AIM backend state;
- call AIM APIs to create workflow tasks or notifications if existing endpoints permit this;
- record orchestration events through AIM APIs if existing endpoints permit this;
- link to workflow console pages in human notifications.

## n8n must not

- n8n must not write directly to PostgreSQL;
- n8n must not compute or store workflow console state as final AIM data;
- approve/correct/reject AI fields;
- promote staging records;
- issue reports;
- finalize calculations, integrity decisions, or work orders;
- edit audit logs;
- delete audit logs;
- change admin/RBAC/system settings;
- mutate evidence or report artifacts;
- store n8n credentials or webhook secrets inside AIM;
- execute or edit n8n workflows from the AIM UI;
- create a separate n8n dashboard data store.

## RC3-G console boundary

The `/workflow-console` page and `GET /api/v1/workflow-console/overview` API summarize existing AIM workflow tasks, notification logs, error logs, workflow events, and audit metadata only. Returned metadata must redact tokens, secrets, signed URLs, credentials, webhook secrets, private keys, object keys, raw evidence contents, and raw report contents.
