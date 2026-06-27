# Security and Governance Closure Checklist

## Purpose

Confirm that RC3 release-candidate security and governance controls are operationally verified before go-live.

## Identity, RBAC, and SoD

- [ ] RBAC verified for each standard human role.
- [ ] Role-permission assignments reviewed.
- [ ] SoD verified for controlled approval/report issue workflows.
- [ ] AI/n8n/service actor restrictions verified.
- [ ] Service actors cannot approve, reject, correct, promote, calculate, issue, close, or finalize engineering records.

## Audit and Redaction

- [ ] Audit log immutability verified.
- [ ] Audit log visibility verified as read-only.
- [ ] Secret redaction verified in audit/dashboard/admin/workflow/NDT/go-live readiness views.
- [ ] Signed URL and object key exposure controls verified.
- [ ] Error responses do not expose stack traces, database internals, credentials, or raw object paths.

## Evidence and Object Storage

- [ ] Object storage policy verified.
- [ ] Evidence linkage verified for findings, NDT measurements, calculations, integrity decisions, reports, and manual overrides where applicable.
- [ ] Evidence/report artifact checksums verified for sample items.
- [ ] Evidence deletion restrictions verified.

## Engineering Governance

- [ ] Report issue gates verified.
- [ ] Calculation/review gates verified.
- [ ] AI staging-first rule verified.
- [ ] Engineer/human review mandatory rule verified.
- [ ] No API 579/API 581/FFS/RBI formula implementation is introduced outside approved formula registry/test fixtures.

## Workflow / n8n Governance

- [ ] n8n direct DB write prohibition verified.
- [ ] n8n must not write directly to PostgreSQL.
- [ ] n8n workflow events and error logs route through AIM APIs only.
- [ ] n8n cannot approve/correct/reject/promote/issue/calculate/finalize.

## Operations

- [ ] Backup/restore verified.
- [ ] Production smoke tests completed.
- [ ] Hypercare owner assigned.
- [ ] Go/no-go decision recorded.

## RC3-J security/governance validation anchors

- RBAC verified
- SoD verified
- AI/n8n/service actor restrictions verified
- audit log immutability verified
- secret redaction verified
- object storage policy verified
- report issue gates verified
- evidence linkage verified
- backup/restore verified
- n8n direct DB write prohibition verified
