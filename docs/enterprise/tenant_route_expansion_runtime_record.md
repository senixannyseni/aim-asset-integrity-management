# Tenant Route Expansion Runtime Record

## Summary

Sprint 3 introduces `TENANT_ROUTE_REGISTRY` as the canonical inventory for route-level tenant classification. The registry maps every implemented route file to a tenant-scope status, representative API paths, evidence ID, owner, boundary mode, and Sprint 3 disposition.

The route expansion record confirms that assets/evidence/reports Sprint 2 runtime patterns remain enforced, while the broader route inventory is now regression-tested so unclassified routes cannot be added silently.

## Route Expansion Classification

| Classification | Meaning |
|---|---|
| `tenant_scoped` | Route can expose or mutate customer engineering data and therefore needs tenant context plus runtime tenant boundary evidence. |
| `tenant_control_plane` | Route provides tenant context/health metadata and must not expose another tenant's engineering data. |
| `auth_context` | Login/session/me routes where tenant selection occurs after user membership resolution. |
| `global_system` | System governance, security, operation, production validation, or release-control surface with human approval boundary. |
| `public_health` | Public health/readiness route that returns no tenant engineering data. |
| `local_demo_only` | Explicit local/test demo route that must remain unavailable outside demo guardrails. |

## Runtime Route Carry-Forward

- assets/evidence/reports Sprint 2 runtime patterns remain enforced.
- `appendTenantWhereClause`, `tenantIdForInsert`, and object-key tenant boundary helpers remain the required route pattern for tenant-scoped data access.
- New route files must be added to `TENANT_ROUTE_REGISTRY` and covered by `assertTenantRouteRegressionCoverage`.

## Human Controls

AI/n8n/service actors cannot approve full route expansion. AI/n8n/service actors cannot approve route expansion exceptions. AI/n8n/service actors cannot waive tenant route classification evidence. Human engineering/security review is required before any tenant route exception is accepted.


## Evidence Handling Restrictions

Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials, tenant credentials, customer PII, real customer data, tenant data, customer commercial terms, tenant billing details, payment processing data, full API 579, full API 581, or copied API/API-ASME formulas into commits, tests, logs, screenshots, pull requests, or ChatGPT/Codex prompts.
