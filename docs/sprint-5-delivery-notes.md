# Sprint 5 Delivery Notes — Formula Registry Module

## Scope Delivered

- Formula Registry metadata/versioning table hardening through migration `0006_formula_registry_module.sql`.
- Formula Registry CRUD API for controlled formula metadata.
- Approval, deprecation, version comparison, and fixture test-run endpoints.
- Frontend Formula Registry list/detail/version/compare UI.
- RBAC guard: write/approve/deprecate/test actions are restricted to `admin` and `senior_engineer`.
- Audit events for formula create, update, new version, approval, deprecation, and fixture test runs.

## Engineering Boundary

No engineering calculation was implemented. No API/API-ASME formula expression was invented or hard-coded. API-controlled formulas use a controlled fixture until an authorized engineer enters an expression/source from licensed standards or approved fixtures.

## Production Use Rule

Future calculation services may query approved formula metadata through:

```text
GET /api/v1/formulas/approved/{formulaId}?version={version}
```

Draft, under-review, and deprecated formula versions must not be used for production calculations.

## Validation and Testing

Tests cover formula metadata completeness, API-controlled expression fixture guard, production usability status, version increment behavior, and AI-agent approval denial.
