# P5-2 Deployment and Environment Hardening Pack

**Package:** P5-2 Deployment and Environment Hardening  
**Baseline:** After P5-1 Security and Secrets Hardening  
**Status:** Documentation/evidence-control package; implementation evidence must be attached by named humans

## 1. Purpose

P5-2 converts the Phase 5 deployment and environment-hardening roadmap into concrete release evidence. It defines the records required to prove that the AIM MVP release candidate can be deployed, configured, migrated, smoke-tested, and rolled back in a controlled production or production-pilot environment.

This package is intentionally documentation/evidence-control only. P5-2 does not add runtime APIs, database migrations, formulas, AI behavior, n8n behavior, object-storage behavior, approval behavior, report issue behavior, work-order behavior, external CMMS integration, full API 579, full API 581, 3D processing, or copied API/API-ASME formulas.

## 2. Required Deployment and Environment Evidence

| Evidence ID | Evidence area | Required artifact | Owner | Exit condition |
|---|---|---|---|---|
| P5-ENV-001 | Release baseline | Release tag, commit SHA, branch, PR, and clean working tree evidence | Developer / DevOps | Deployed artifact traces to approved tag and commit |
| P5-ENV-002 | Build artifact provenance | Build command, artifact identifier/checksum, and build environment summary | DevOps | Artifact provenance is recorded before deployment |
| P5-ENV-003 | Environment variable inventory | Environment variable inventory with fixtures/redactions only | DevOps / Security Owner | Required configuration exists; no real secrets are pasted |
| P5-ENV-004 | `.env.example` parity | Comparison between `.env.example` and deployed required variables | Developer / DevOps | Missing/stale configuration is resolved or risk-accepted |
| P5-ENV-005 | Production configuration validation | API URL, frontend URL, CORS, TLS/HTTPS, NODE_ENV, log level, and feature flags | DevOps | Production-like runtime configuration is reviewed |
| P5-ENV-006 | PostgreSQL access validation | DB target, app role, migration role, privilege boundary, backup location | DevOps / DBA | Least-privilege DB access is documented |
| P5-ENV-007 | Migration and seed rehearsal | Migration/seed output, rollback plan, and validation query results | DevOps / Lead Engineer | Migration can be applied and verified safely |
| P5-ENV-008 | Object-storage environment validation | Bucket, endpoint, private access, signed URL policy, checksum policy, artifact path | DevOps / Security Owner | Evidence/report storage settings are validated |
| P5-ENV-009 | n8n environment boundary | Workflow endpoint config and no direct PostgreSQL credentials review | DevOps / Security Owner | n8n remains orchestration-only and calls AIM APIs only |
| P5-ENV-010 | Deployment smoke test | Health, auth, protected route, evidence, calculation gate, report gate, work-order gate | Developer / DevOps | Production smoke test evidence passes |
| P5-ENV-011 | Rollback readiness | Rollback command/procedure, owner, rehearsal result, and communication path | DevOps / Operations | Rollback is executable and owned |
| P5-ENV-012 | Human deployment signoff | Named human approval or no-go decision | Product Owner / DevOps / Lead Engineer | Deployment evidence is accepted by humans only |

## 3. Evidence Safety Rule

Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials, database connection strings with passwords, private keys, confidential client evidence, or vulnerability exploit details into P5-2 documents. Use redacted fixtures and attach sensitive evidence only in approved secure evidence storage.

## 4. Required Human Review

P5-2 deployment and environment evidence must be reviewed by named humans. Automated deployment tools, AI, n8n, and service actors may generate logs or evidence, but they cannot approve deployment readiness, accept missing evidence, accept residual risk, authorize rollback readiness, or sign production go-live.

AI/n8n/service actors cannot accept deployment evidence. Deployment evidence acceptance, deployment readiness approval, rollback readiness acceptance, and go-live authorization require named human review.

Required human roles:

- IT Admin / DevOps;
- Lead Engineer;
- Security Owner;
- Product Owner;
- Operations / Hypercare Owner.

## 5. No-Go Conditions

A P5-2 deployment/environment no-go must be recorded if any of the following remain true:

- release tag, commit SHA, artifact identifier, or build provenance is missing;
- production environment variables are incomplete, stale, or contain undocumented values;
- real secrets, object-storage keys, signed URLs, or production credentials are committed or pasted into evidence records;
- `NODE_ENV` or demo/local auth controls are unsafe for production-like deployment;
- CORS or frontend/API origin policy permits unapproved origins;
- PostgreSQL privileges exceed approved application/migration boundaries;
- n8n has direct PostgreSQL write access or direct database credentials;
- migration/seed rehearsal is missing, failed, or cannot be rolled back safely;
- object-storage bucket/privacy/signed-URL/checksum policy is not validated;
- smoke test evidence for health, auth, governed evidence, calculation gate, report gate, or work-order gate is missing or failed;
- rollback owner, command path, or rehearsal evidence is missing;
- AI/n8n/service actors can accept deployment evidence, approve deployment readiness, or authorize go-live.

## 6. Completion Rule

P5-2 is complete only when `P5-ENV-001` through `P5-ENV-012` are attached, reviewed, and referenced from the release evidence register or explicitly marked not applicable with rationale and named human approval.
