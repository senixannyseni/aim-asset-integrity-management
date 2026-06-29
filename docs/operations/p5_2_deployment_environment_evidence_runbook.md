# P5-2 Deployment and Environment Evidence Runbook

**Package:** P5-2 Deployment and Environment Hardening  
**Purpose:** Provide repeatable evidence-capture steps for deployment and environment hardening.

## 1. Evidence Safety

Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials, database URLs with passwords, private keys, vulnerability exploit details, or confidential client evidence into committed files. Store sensitive evidence only in the approved secure evidence location and reference it by ID.

## 2. Pre-Deployment Evidence Commands

Run from repository root and capture redacted output:

```powershell
git status
git rev-parse HEAD
git tag --points-at HEAD
pnpm -r test
pnpm -r lint
node scripts/repo-hygiene.mjs
```

## 3. Environment Configuration Evidence

Complete:

```text
docs/deployment/p5_2_environment_configuration_evidence_record.md
```

Required reviews:

- `.env.example` parity;
- secret manager or secure environment injection;
- CORS and frontend/API origin policy;
- `NODE_ENV` and demo/local controls;
- PostgreSQL application/migration privileges;
- object-storage privacy, signed URL TTL, checksum policy;
- n8n remains orchestration-only and has no direct PostgreSQL write access.

## 4. Migration and Seed Evidence

Complete:

```text
docs/deployment/p5_2_migration_seed_validation_record.md
```

Capture migration/seed evidence with sensitive values redacted. Migration evidence must show whether rollback and backup evidence exist before deployment is approved.

## 5. Smoke and Rollback Evidence

Complete:

```text
docs/deployment/p5_2_deployment_smoke_rollback_record.md
```

Smoke coverage must include health, auth, protected route denial, evidence metadata, signed URL behavior, calculation gate, report issue gate, work-order closure gate, audit logging, and n8n API-only workflow boundary.

## 6. Human Review Rule

Deployment and environment evidence requires named human review. AI/n8n/service actors cannot approve environment readiness, accept missing evidence, accept rollback readiness, sign deployment readiness, or authorize production go-live.

## 7. Completion Checklist

- [ ] `P5-ENV-001` through `P5-ENV-012` completed or marked N/A with rationale.
- [ ] No real secrets are committed or pasted into documentation.
- [ ] Migration/seed validation evidence attached.
- [ ] Smoke and rollback evidence attached.
- [ ] Final release evidence register references the P5-2 evidence set.
- [ ] Human deployment signoff completed.
