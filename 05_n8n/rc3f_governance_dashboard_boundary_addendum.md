# RC3-F n8n Addendum — Governance Dashboard Boundary

RC3-F preserves AIM as the system of record. The governance dashboard summarizes AIM backend state only.

## Allowed n8n behavior

n8n may:

- call AIM APIs to route reminders based on AIM backend state;
- call AIM APIs to create workflow tasks or notifications;
- record orchestration events through AIM APIs;
- link to dashboard pages in human notifications.

## Prohibited n8n behavior

n8n must not write directly to PostgreSQL.
n8n must not compute or store dashboard state as final AIM data.

n8n must not:

- approve/correct/reject AI fields;
- promote staging records;
- issue reports;
- finalize calculations, integrity decisions, or work orders;
- edit audit logs;
- delete audit logs;
- change admin/RBAC/system settings;
- mutate evidence or report artifacts;
- create a separate n8n dashboard data store;
- expose a separate n8n console as the AIM governance dashboard.

## Required AIM API boundary

Dashboard data must be read from AIM RBAC-controlled APIs. n8n may only send reminders or links to humans; it must not become a second dashboard data store or compute governance readiness outside AIM.
