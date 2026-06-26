# RC3-E n8n Boundary Addendum — Admin Governance Console

RC3-E keeps AIM as the system of record for admin governance, RBAC, system settings, and audit logs. n8n remains orchestration only and may use AIM APIs for reminders and workflow routing, but it must not directly administer the AIM platform.

## Allowed n8n behavior

n8n may:

- notify administrators of pending admin governance tasks through AIM APIs;
- create workflow reminders through AIM APIs;
- record orchestration events through AIM APIs;
- route approval reminders for human admin actions;
- include AIM audit IDs in workflow traces.

## Prohibited n8n behavior

n8n must not write directly to PostgreSQL.

n8n must not:

- assign roles;
- remove roles;
- change permissions;
- update system settings;
- edit audit logs;
- delete audit logs;
- suppress audit logs;
- approve/correct/reject AI fields;
- promote staging records;
- issue reports;
- finalize calculations, integrity decisions, or work orders.

## Required AIM API boundary

All RBAC and system-setting changes must be performed by authorized human admin users through AIM RBAC-controlled APIs. Service, AI, and n8n-style actors are blocked from broad admin governance management.
