# RC3-D n8n Addendum — Audit Log Governance Visibility

RC3-D preserves AIM as the system of record and keeps n8n as orchestration only.

## Allowed n8n behavior

n8n may:

- call AIM APIs to record orchestration events;
- call AIM APIs to create workflow tasks or notification logs;
- include AIM audit IDs in workflow logs;
- route and remind users based on AIM API state;
- query AIM API status endpoints when a workflow needs routing context.

## Prohibited n8n behavior

n8n must not write directly to PostgreSQL.
n8n must not edit audit logs, delete audit logs, suppress audit logs, backdate audit logs, or overwrite audit logs.

n8n must not:

- alter engineering review decisions;
- approve/correct/reject AI fields;
- promote staging records;
- issue reports;
- finalize calculations, integrity decisions, or work orders;
- store final engineering data outside AIM;
- expose signed URLs, object-storage credentials, tokens, or secrets in workflow logs.

## Required AIM API boundary

All audit visibility is read-only through AIM RBAC-controlled APIs. n8n may create orchestration records only by calling AIM backend APIs. n8n must not bypass AIM API controls or mutate audit log records directly.
