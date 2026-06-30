# Tenant Admin Console Governance Record

## Console purpose

The Tenant Admin Console is a governed frontend workspace for tenant visibility, tenant switching, and tenant isolation health review.

## Explicit non-authorities

The console does not:

- create tenants;
- create or approve tenant memberships;
- bypass RBAC;
- certify tenant isolation readiness;
- write customer onboarding data;
- approve tenant route exceptions;
- issue reports or promote engineering data.

## Required backend controls

- `tenant.context.read` remains required for tenant context and isolation health endpoints.
- `resolveRequestTenantContext` remains the backend selector.
- Tenant-scoped routes remain responsible for tenant filtering and boundary checks.
- AI/n8n/service actors cannot approve tenant admin changes.

## Evidence mapping

- MT-S4-003 — Tenant Admin Console added as read/switch UX.
- MT-S4-004 — Isolation health surfaced.
- MT-S4-006 — No tenant creation or approval authority.
- MT-S4-008 — AI/n8n/service actor approval boundary.
