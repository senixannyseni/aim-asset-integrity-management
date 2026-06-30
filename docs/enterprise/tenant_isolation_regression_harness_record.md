# Tenant Isolation Regression Harness Record

## Purpose

The Sprint 3 tenant isolation regression harness prevents route drift. It compares the actual `apps/api/src/routes/*.ts` inventory against `TENANT_ROUTE_REGISTRY`, detects duplicate route registry entries, and fails closed when a tenant-scoped route lacks a recognized runtime boundary mode.

## Harness Functions

- `buildTenantRouteRegressionSummary` summarizes route inventory, scoped routes, control-plane/public routes, missing routes, duplicates, and unbounded tenant-scoped routes.
- `assertTenantRouteRegressionCoverage` throws a tenant context error when route coverage fails.
- `buildTenantRouteEvidenceMatrix` maps evidence IDs to route files.
- `assertTenantScopedRouteHasRuntimeBoundary` fails closed for unregistered routes and tenant-scoped routes without runtime boundary classification.

## Governance

AI/n8n/service actors cannot approve tenant isolation regression results. AI/n8n/service actors cannot waive tenant isolation regression failures. Human review is required for accepting exceptions, updating registry scope classifications, or certifying route coverage.

The harness is not a substitute for database tests, production penetration testing, or customer tenant isolation certification. It is a regression gate that prevents untracked routes from entering the API surface.


## Evidence Handling Restrictions

Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials, tenant credentials, customer PII, real customer data, tenant data, customer commercial terms, tenant billing details, payment processing data, full API 579, full API 581, or copied API/API-ASME formulas into commits, tests, logs, screenshots, pull requests, or ChatGPT/Codex prompts.
