# Sprint 0 Foundation Closure Checklist

**Package:** RC4-A — Sprint 0 Foundation Polish  
**Scope:** Documentation and health-test polish only  
**Baseline:** RC3-A through RC3-J are merged, tagged, and closed. RC4-A does not reopen RC3.

## 1. RC4-A Boundary Confirmation

RC4-A adds Sprint 0 foundation polish only. It does not change runtime engineering calculation behavior, does not add formulas, and does not change AI, n8n, approval, report, FFS, RBI, NDT, evidence, or object-storage behavior.

No new API routes, frontend routes, database tables, engineering formulas, or governance bypasses are introduced by this package.

## 2. Sprint 0 Foundation Checklist

| Item | Closure status | Evidence in repository |
|---|---|---|
| Monorepo structure exists. | Confirmed | `apps/`, `packages/`, `db/`, `docs/` |
| Backend app exists. | Confirmed | `apps/api` |
| Frontend app exists. | Confirmed | `apps/web` |
| Shared packages exist. | Confirmed | `packages/shared-types`, `packages/config` |
| Database migration folder exists. | Confirmed | `db/migrations` |
| Seed folder exists. | Confirmed | `db/seeds` |
| Tests folder exists. | Confirmed | `apps/api/tests` and app-level test scripts |
| Docs folder exists. | Confirmed | `docs` |
| Baseline tables were created. | Confirmed | `db/migrations/0001_baseline.sql` |
| RBAC foundation exists. | Confirmed | `users`, `roles`, `permissions`, `user_roles`, `role_permissions`; `apps/api/src/rbac/roles.ts` |
| Initial roles were seeded. | Confirmed | `db/seeds/0001_foundation_seed.sql` |
| Demo users were seeded. | Confirmed | `db/seeds/0001_foundation_seed.sql` |
| Sample tank asset was seeded. | Confirmed | `db/seeds/0001_foundation_seed.sql` |
| Sample shell courses were seeded. | Confirmed | `db/seeds/0001_foundation_seed.sql` |
| Placeholder formula registry record was seeded. | Confirmed | `MVP-CORROSION-RATE-PLACEHOLDER` in `db/seeds/0001_foundation_seed.sql` |
| Health endpoints exist. | Confirmed | `GET /health`, `GET /health/db` in `apps/api/src/routes/health.ts` |
| Database connectivity check exists. | Confirmed | `checkDatabaseConnection()` in `apps/api/src/db/client.ts` |
| CI-ready test commands exist. | Confirmed | `pnpm lint`, `pnpm typecheck`, `pnpm test`, package-level test scripts |
| README explains local setup. | Confirmed | `README.md` Local Setup section |
| README explains current status. | Confirmed | `README.md` sprint and RC status sections |

## 3. Historical Sprint 0 Calculation Criterion

The Sprint 0 acceptance criterion **“No engineering calculation is implemented yet”** was true at Sprint 0.

That criterion is historical. Later sprints intentionally added governed deterministic calculation functionality with review, versioning, evidence linkage, auditability, and formula-governance controls.

This is **not a current defect**. The current repository correctly contains later governed calculation modules while preserving the rule that no API, ASME, API 579, API 581, FFS, RBI, or regulatory formulas may be invented, copied, reconstructed, quoted, or hard-coded.

The remaining valid interpretation is:

- Sprint 0 had no calculation runtime.
- Later calculation modules are intentionally added and governed.
- RC4-A does not change current calculation runtime behavior.
- RC4-A does not add formulas.

## 4. Role Evolution Note

Sprint 0 originally requested these baseline roles:

```text
admin
data_entry
inspector
engineer
senior_engineer
qa_qc
client_viewer
ai_agent
```

The current repository still includes those baseline roles.

Later governance work expanded the persisted role model in the current repository to include:

```text
lead_engineer
approver
management
it_admin
```

The current repository also references service-actor identifiers in route guards, UAT docs, sample-data docs, and governance controls, including where present:

```text
n8n_service
integration_service
workflow_service
system_service
```

These service-actor identifiers are documented because they are present in the repository as governance blockers or UAT/service-role references. RC4-A does **not** add new roles, seed new roles, or grant new permissions.

## 5. Seed Idempotency and Audit Trail Behavior

Seed behavior was reviewed for RC4-A:

- Core role, permission, user, role-permission, asset, shell-course, and placeholder formula seed records use conflict-safe inserts or stable keys where practical.
- `db/seeds/0001_foundation_seed.sql` intentionally writes a `FOUNDATION_SEED_EXECUTED` audit trail entry on each seed execution. This is harmless append-only evidence that the seed was run and is preserved by design.
- `db/seeds/0002_uat_sample_data.sql` uses fixed synthetic UAT identifiers and conflict-safe updates for UAT fixtures and audit examples.
- Repeated seed execution should not destructively reset controlled engineering data.
- RC4-A does not remove audit trail behavior and does not run destructive database commands.

## 6. Health Endpoint Test Closure

RC4-A adds dedicated tests in:

```text
apps/api/tests/health.test.ts
```

The tests cover:

- `GET /health` returns safe API status.
- `GET /health/db` returns safe database connectivity status.
- Health responses do not expose secrets, tokens, credentials, connection strings, stack traces, or internal infrastructure details.
- Database failure output is redacted to a generic safe message.

## 7. Governance Preservation

RC4-A preserves all AIM governance rules:

- AIM remains the system of record.
- PostgreSQL stores final structured engineering data.
- Object storage stores original evidence files and report artifacts.
- n8n remains orchestration only and must not write directly to PostgreSQL.
- AI extraction output remains staging-first.
- AI/n8n/service actors cannot approve, promote, issue, calculate, or make final engineering decisions.
- Human engineering review remains mandatory.
- Evidence linkage remains mandatory.
- Calculation behavior remains deterministic, versioned, testable, and auditable.
- No API/ASME/API 579/API 581/FFS/RBI/regulatory formulas are added.
- No secrets, tokens, local evidence, `.env` files, database dumps, generated artifacts, or build cache files are added.

## 8. RC4-A Closure Status

| Acceptance item | Status |
|---|---|
| `apps/api/tests/health.test.ts` exists. | Complete |
| Health endpoint tests added. | Complete |
| Health database failure response redaction preserved. | Complete |
| Sprint 0 historical calculation note documented. | Complete |
| Role evolution documented. | Complete |
| Seed idempotency behavior documented. | Complete |
| README and sprint status updated. | Complete |
| Source-of-truth alignment checklist updated. | Complete |
| No unrelated feature work introduced. | Complete |
| No formulas introduced. | Complete |
| No governance boundaries weakened. | Complete |
