# Tenant Frontend UX Runtime Record

## Scope

This record covers the Sprint 4 frontend UX layer for tenant context visibility.

## Runtime changes

- `apps/web/lib/tenant-session.ts` stores tenant selection in session storage.
- `apps/web/lib/api-client.ts` attaches `x-aim-tenant-id` and `x-aim-tenant-slug` when a tenant selection exists.
- `apps/web/app/components/AimShell.tsx` surfaces tenant context in the sidebar and topbar.
- `apps/web/app/tenant-admin/*` provides read/switch tenant UX.

## Enforcement statement

The frontend is not an enforcement boundary. Backend RBAC, tenant membership resolution, route filtering, and object-storage boundary checks remain authoritative. Tenant headers are hints used by the backend only after membership validation.

## Control markers

- MT-S4-001
- MT-S4-002
- MT-S4-005
- Backend remains enforcement layer
- AI/n8n/service actors cannot approve tenant frontend UX changes
