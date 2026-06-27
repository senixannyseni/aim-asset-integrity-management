# RC3-H n8n Boundary Addendum — NDT Data Room / Visualization Governance

## Purpose

This addendum defines the n8n boundary for RC3-H. The NDT data room is AIM-side, read-only visibility over existing NDT measurement and evidence-linkage state. It is not an n8n dashboard, not an engineering calculation engine, and not an approval or mutation surface.

## n8n may

- call AIM APIs to route reminders based on AIM backend state.
- call AIM APIs to create workflow tasks or notifications if existing endpoints permit this.
- link to NDT data room pages in human notifications.

## n8n must not

- n8n must not write directly to PostgreSQL.
- n8n must not compute or store NDT data room state as final AIM data.
- approve/correct/reject AI fields.
- promote staging records.
- create, alter, verify, approve, or delete NDT measurements.
- perform corrosion rate, remaining life, FFS, RBI, or API 579/API 581 calculations.
- issue reports.
- finalize integrity decisions or work orders.
- edit audit logs.
- delete audit logs.
- change admin/RBAC/system settings.
- mutate evidence or report artifacts.
- create a separate n8n NDT dashboard data store.

## RC3-H control statement

The NDT data room may show NDT method summary, component coverage, CML/TML/Grid coverage, evidence linkage status, measurement readiness, latest measurements, and governance warnings. It must remain read-only and must not include approve/reject/correct/promote/calculate/report issue/delete/admin/n8n mutation controls.
