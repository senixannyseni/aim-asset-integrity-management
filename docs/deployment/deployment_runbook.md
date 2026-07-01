# AIM Phase 2.0 Deployment Runbook

**Sprint:** Phase 2.0 — MVP Release Readiness Pack  
**Purpose:** Provide a controlled deployment rehearsal/runbook for the Phase 1 Governance Closure baseline.  
**Audience:** Developer, IT Admin, DevOps/operator, UAT Coordinator.  
**Environment:** Local/UAT first. Production requires separate security approval and environment hardening.

## 1. Purpose and Audience

This runbook helps the delivery team install, configure, migrate, seed, test, and smoke-test the AIM Tank Integrity MVP after Phase 1 Governance Closure.

| Audience | Responsibility |
|---|---|
| Developer | Apply branch, run tests, verify API behavior, fix defects. |
| IT Admin | Configure auth, roles, object storage fixtures, workflow/error monitoring. |
| DevOps/operator | Prepare infrastructure, env vars, database, backup, service start/stop, rollback. |
| UAT Coordinator | Confirm sample dataset, run UAT scripts, gather evidence and sign-off. |

## 2. Non-Negotiable Deployment Rules

- AIM backend is the only application layer allowed to write final engineering data.
- n8n must not have PostgreSQL credentials.
- n8n must call AIM backend APIs only.
- AI extraction output must stay in staging until human review.
- Object storage holds original evidence files; PostgreSQL stores metadata/linkage only.
- Report issue and work order closure gates must remain active.
- Do not deploy with demo/local header auth enabled in production-like environments.
- Do not commit real credentials, client data, or production object storage secrets.

## 3. Prerequisites

| Requirement | Local/UAT Baseline |
|---|---|
| Git | Clean working tree before deployment or migration. |
| Node.js | Use the repository-supported LTS version. Confirm with project `.nvmrc` if later added. |
| pnpm | Use package manager configured by `pnpm-lock.yaml`. |
| Docker/Desktop | Required if using local PostgreSQL via `docker-compose.yml`. |
| PostgreSQL | Reachable database, local default commonly `127.0.0.1:5433`. |
| Object storage | S3-compatible fixture or local/minio-style environment for smoke test. |
| Environment file | `.env` or environment-specific secret injection. |
| Network ports | API port, PostgreSQL port, optional object storage port. |
| Baseline | Phase 1 Governance Closure tag/branch merged before Phase 2.0. |

## 4. Environment Variables

Do not place real secret values in documentation or committed files.

| Variable | Required | Example Fixture | Purpose |
|---|---:|---|---|
| `DATABASE_URL` | Yes | `postgres://aim_app:change-me@127.0.0.1:5433/aim_dev` | PostgreSQL connection. |
| `AUTH_JWT_SECRET` | Yes | `replace-with-local-dev-secret-at-least-32-chars` | Access token signing secret. |
| `REFRESH_TOKEN_SECRET` | Conditional | `replace-with-local-refresh-secret` | Refresh/session token signing secret if used. |
| `NODE_ENV` | Yes | `local`, `test`, `development`, `production` | Runtime mode. |
| `API_PORT` | Yes | `3001` | API service port. |
| `CORS_ORIGIN` | Conditional | `http://localhost:3000` | Allowed frontend origin if frontend is used later. |
| `OBJECT_STORAGE_ENDPOINT` | Conditional | `http://127.0.0.1:9000` | S3-compatible endpoint fixture. |
| `OBJECT_STORAGE_BUCKET` | Conditional | `aim-uat-evidence` | Evidence bucket. |
| `OBJECT_STORAGE_ACCESS_KEY_ID` | Conditional | `replace-with-local-access-key` | Fixture only; never commit real value. |
| `OBJECT_STORAGE_SECRET_ACCESS_KEY` | Conditional | `replace-with-local-secret-key` | Fixture only; never commit real value. |
| `OBJECT_STORAGE_SECRET_KEY` | Deprecated alias | `replace-with-local-secret-key` | Legacy name retained only for backward compatibility notes; prefer `OBJECT_STORAGE_SECRET_ACCESS_KEY`. |
| `SIGNED_URL_EXPIRY_SECONDS` | Conditional | `900` | Signed evidence URL lifetime. |
| `N8N_WEBHOOK_SECRET` | Conditional | `replace-with-local-n8n-secret` | Shared secret for workflow calls if enabled. |
| `AI_PROVIDER_API_KEY` | Conditional | `replace-with-local-provider-key` | AI provider fixture if extraction service is used. |
| `LOG_LEVEL` | Optional | `info` | Runtime logging verbosity. |

## 5. Local Startup Sequence

Run from repository root:

```powershell
cd "D:\Personal Projects\AIM New\aim-tank-integrity-foundation\aim-tank-integrity"
git status
pnpm install
```

Start database/container if using local Docker:

```powershell
docker compose up -d postgres
Test-NetConnection 127.0.0.1 -Port 5433
```

Run migrations and seed:

```powershell
pnpm db:migrate
pnpm db:seed
```

Start API:

```powershell
pnpm --filter @aim/api dev
```

Health check in a second terminal:

```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:3001/health"
```

Login smoke test:

```powershell
$login = Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3001/api/v1/auth/login" `
  -ContentType "application/json" `
  -Body '{"email":"engineer@example.com","password":"password123"}'

$token = $login.data.accessToken
```

`/auth/me` smoke test:

```powershell
Invoke-RestMethod `
  -Method Get `
  -Uri "http://localhost:3001/api/v1/auth/me" `
  -Headers @{ Authorization = "Bearer $token" }
```

Adjust seed credentials to match the actual foundation seed. Do not use production passwords.

## 6. Test Commands

Run before deployment handoff:

```powershell
pnpm --filter @aim/api typecheck
pnpm --filter @aim/api test -- tests/phase2-0-release-readiness.test.ts
pnpm --filter @aim/api test -- tests/phase1-7-governance-closure.test.ts
pnpm --filter @aim/api test -- tests/phase1-4-openapi-contract.test.ts
pnpm --filter @aim/api test -- tests/migration-sequence.test.ts
pnpm --filter @aim/api test
```

If a future UAT sample seed is added:

```powershell
pnpm db:migrate
pnpm db:seed
# Apply UAT sample seed only to local/UAT database if explicitly approved.
```

## 7. Deployment Sequence

1. Confirm release branch/tag.
2. Confirm clean working tree.
3. Confirm `.env` or secret injection values.
4. Confirm no n8n PostgreSQL credentials exist.
5. Back up current database.
6. Stop previous API service if required.
7. Deploy selected commit/container/artifact.
8. Run migrations through AIM/operator process, not n8n.
9. Run seed only if environment policy allows it.
10. Start API service.
11. Run health check.
12. Run login and `/auth/me` smoke tests.
13. Verify object storage connectivity.
14. Verify evidence signed URL behavior.
15. Verify workflow event creation through AIM API.
16. Verify error log creation through AIM API.
17. Verify report issue blocked when gates are missing.
18. Verify work order close blocked without completion note/evidence where required.
19. Record deployment audit/release note.

## 8. Deployment Smoke Test Checklist

| Smoke Test | Command/Action | Expected Result | Pass/Fail |
|---|---|---|---|
| API health | `GET /health` | API responds healthy. |  |
| Login | `POST /api/v1/auth/login` | Access token/session metadata returned. |  |
| Auth me | `GET /api/v1/auth/me` | Current user and permissions returned. |  |
| Protected route | `GET /api/v1/assets` | Authorized user succeeds; anonymous fails. |  |
| Evidence metadata | Create/list evidence metadata | Metadata only; no DB binary storage. |  |
| Signed URL | evidence download URL route | Short-lived URL/fixture returned and audited. |  |
| Workflow event | `POST /api/v1/workflow-events` | Event accepted and visible. |  |
| Error log | `POST /api/v1/error-logs` | Error log accepted and visible. |  |
| Calculation gate | calculation run with missing formula/evidence | Blocked safely. |  |
| Report gate | issue report with missing gate | `REPORT_GATES_NOT_SATISFIED` or equivalent. |  |
| Work order close gate | close without note/evidence | Blocked safely. |  |

## 9. Rollback Procedure

Use rollback when smoke tests, migrations, or UAT-critical flows fail.

1. Stop API service.
2. Disable or pause n8n triggers that call this environment.
3. Restore previous container/image/commit.
4. Restore database backup if migration/data changes are not safely reversible.
5. Start previous API version.
6. Run health/login smoke tests.
7. Verify workflow/error endpoints are stable.
8. Verify no partial report issue or work order close occurred unexpectedly.
9. Record incident/release audit note.
10. Assign defect owner and block go-live until resolved.

## 10. Troubleshooting

### DB Port Not Reachable

Symptoms:
- `Test-NetConnection 127.0.0.1 -Port 5433` fails.
- Migration cannot connect.

Actions:
1. Start Docker Desktop.
2. Run `docker compose ps`.
3. Run `docker compose up -d postgres`.
4. Check `.env` `DATABASE_URL` port and credentials.

### Migration Failed

Actions:
1. Stop further seed/test actions.
2. Capture failing migration name and SQL error.
3. Confirm current DB baseline.
4. Restore backup if migration partially applied.
5. Fix only in a new migration; do not edit applied production migration.

### Seed Failed

Actions:
1. Capture failed statement.
2. Confirm migration applied first.
3. Check duplicate permissions/roles and idempotency.
4. Do not use production data in seed fixes.

### JWT Login Failed

Actions:
1. Confirm user exists and is active.
2. Confirm password hash/seed credential.
3. Confirm `AUTH_JWT_SECRET` is configured.
4. Confirm disabled/locked status is not blocking user.
5. Check audit/error logs for safe reason only.

### Missing Permission

Actions:
1. Confirm permission exists in `permissions` seed.
2. Confirm role has permission.
3. Confirm user role assignment active.
4. Refresh session or relogin after permission changes.

### Object Storage Signed URL Failed

Actions:
1. Confirm object storage endpoint/bucket variables.
2. Confirm evidence metadata has storage key/URI.
3. Confirm user has evidence read/download permission.
4. Confirm signed URL expiry is configured.
5. Confirm audit log is written for denied or successful access.

### Evidence Upload Metadata Rejected

Actions:
1. Confirm extension is supported.
2. Confirm MIME matches extension.
3. Confirm checksum is present and well-formed.
4. Confirm file size limit.
5. Confirm asset and inspection IDs exist.

### Workflow Event Rejected

Actions:
1. Confirm n8n service user/token.
2. Confirm payload includes workflow ID, source system, entity type/id, and status.
3. Confirm permission `workflow_event.create`.
4. Confirm n8n is calling AIM API, not PostgreSQL.

### Report Issue Gate Blocked

Actions:
1. Read returned gate checklist.
2. Resolve missing required data/evidence/calculation/review/decision/report approval/workflow errors/comment.
3. Do not bypass gates.
4. Retry only with authorized human approver and comment.

### Work Order Close Blocked

Actions:
1. Provide completion note.
2. Provide closure evidence link if required.
3. Confirm work order is internal AIM fallback.
4. Confirm external CMMS reference remains optional/null.

### Test Failure Triage

Actions:
1. Run focused test first.
2. Run typecheck.
3. Inspect changed files only.
4. Do not refactor unrelated code.
5. Preserve Phase 1 governance tokens and gates.

## 11. Release Handoff Record

Before marking release rehearsal complete, record:

- branch/tag,
- commit SHA,
- migration output,
- seed output,
- test summary,
- smoke-test results,
- known defects,
- sign-off roles.

## RC2 Runtime and Frontend Validation Notes

Use the current JWT token path:

```powershell
$token = $login.data.accessToken
```

The API secret environment variable is `AUTH_JWT_SECRET`. Use `$login.data.accessToken` for the JWT returned by `POST /api/v1/auth/login`. Use `AUTH_JWT_SECRET` for signing and `AUTH_TOKEN_ISSUER` for the issuer value; do not use obsolete documentation-only names such as `AUTH_JWT_ISSUER`.

For frontend UAT, demo headers are opt-in only:

```text
NEXT_PUBLIC_AIM_DEV_HEADERS_ENABLED=true
```

Do not enable demo headers in UAT/prod-like validation. Verify `/login`, `/integrity-decisions`, `/reports`, and `/work-orders` with real RBAC roles. External CMMS remains out of MVP scope; internal AIM work order fallback remains active. n8n remains orchestration-only and must not write final engineering data directly to PostgreSQL.





## RC3-A / RC3-B alignment note

RC3-A and RC3-B are now implemented in this repository state. Correct health endpoints are `GET /health` and `GET /health/db`. Correct authentication endpoints are `POST /api/v1/auth/login` and `GET /api/v1/auth/me`. RBAC demo endpoints and demo CORS headers are local/development/test only when `AUTH_ALLOW_LOCAL_DEMO=true`; they are unavailable in production-like environments.

RC3-B implements evidence object-storage upload/download and report artifact object-storage export. Original evidence files and generated report artifacts are stored in private S3-compatible object storage; PostgreSQL stores metadata, checksums, object keys, upload sessions, status, and audit linkage. Legacy metadata-only evidence upload is retained only for compatibility and is not gate-eligible until object storage verification is completed through the RC3-B flow.

Final production closure remains human-gated after hypercare completion; AI and n8n cannot approve production closure or final engineering actions.
