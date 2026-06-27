# Source-of-Truth Alignment Checklist

## Purpose

Confirm that the RC3 release candidate remains aligned with the AIM source-of-truth package before final go/no-go.

## RC3-J Source-of-Truth Alignment

- [ ] README status confirms RC3-A through RC3-J are implemented as scoped hardening packages.
- [ ] Sprint status confirms RC3-J Final UAT / Release Candidate Closure & Production Operations Readiness.
- [ ] UAT master index references RC3-B through RC3-I and the final end-to-end UAT scenario.
- [ ] Release candidate closure report summarizes RC3-A through RC3-I completion.
- [ ] Production deployment checklist references PostgreSQL, object storage, RBAC, audit logging, backup, smoke tests, and rollback.
- [ ] Environment validation checklist confirms API base URL, frontend base URL, PostgreSQL connection, object storage policy, JWT secret presence, CORS policy, file size/MIME policy, audit logging, and n8n API-only boundary.
- [ ] Backup/restore runbook confirms PostgreSQL backup, PostgreSQL restore validation, object storage backup/export verification, checksum verification, and evidence/report artifact restore considerations.
- [ ] Smoke test checklist confirms login, RBAC menu visibility, evidence flow, AI staging review, report gate behavior, audit log view, admin governance, governance dashboard, workflow console, NDT data room, and go-live readiness.
- [ ] Security/governance checklist confirms RBAC, SoD, AI/n8n/service actor restrictions, audit immutability, secret redaction, object storage policy, report issue gates, evidence linkage, backup/restore, and n8n direct DB write prohibition.
- [ ] No new API route is introduced by RC3-J.
- [ ] No new frontend page is introduced by RC3-J.
- [ ] No new database migration is introduced by RC3-J.
- [ ] No new database table is introduced by RC3-J.
- [ ] No new runtime behavior is introduced by RC3-J.
- [ ] No API 579/API 581/FFS/RBI formula implementation is introduced by RC3-J.
- [ ] AI extraction remains staging-only.
- [ ] Engineer/human review remains mandatory.
- [ ] Evidence linkage remains mandatory.
- [ ] n8n remains orchestration-only and must not write directly to PostgreSQL.
- [ ] AIM remains the system of record.
