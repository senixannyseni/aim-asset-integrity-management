# RC3-I n8n Boundary Addendum — Hypercare / Go-Live Readiness

RC3-I adds AIM-side, read-only hypercare and go-live readiness visibility. AIM remains the system of record. n8n remains workflow orchestration only.

## n8n may

- Call AIM APIs to route reminders based on AIM backend state.
- Call AIM APIs to create workflow tasks or notifications if existing endpoints permit this.
- Notify humans about readiness blockers using AIM-generated state.
- Link to go-live readiness pages in human notifications.

## n8n must not

- n8n must not write directly to PostgreSQL.
- n8n must not compute or store go-live readiness state as final AIM data.
- Approve/correct/reject AI fields.
- Promote staging records.
- Create, alter, verify, approve, or delete NDT measurements.
- Perform corrosion rate, remaining life, FFS, RBI, or API 579/API 581 calculations.
- Issue reports.
- Finalize integrity decisions or work orders.
- Edit audit logs.
- Delete audit logs.
- Change admin/RBAC/system settings.
- Mutate evidence or report artifacts.
- Override readiness gates.
- Close hypercare blockers directly.
- Create a separate n8n go-live dashboard data store.

## Boundary summary

The RC3-I dashboard is AIM-generated, read-only visibility. n8n can route reminders/escalations through AIM APIs using AIM-generated state, but n8n cannot compute readiness, write dashboard state directly, close blockers, override readiness gates, or perform engineering/final decision actions.
