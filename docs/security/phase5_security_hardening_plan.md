# Phase 5 Security Hardening Plan

**Package:** Phase 5 Production Hardening Planning Pack  
**Status:** Security planning document; implementation requires future scoped work

## 1. Security Objectives

- Establish repeatable secret scanning and dependency vulnerability evidence.
- Review RBAC and service actor permissions against least privilege.
- Confirm audit-log redaction and sensitive evidence handling.
- Strengthen browser token/session strategy for production.
- Preserve all AI/n8n/service actor authority boundaries.

## 2. Required Evidence

| Evidence ID | Evidence | Notes |
|---|---|---|
| SEC-P5-001 | Secret scan result | Must not include secrets in repository, logs, or evidence bundles |
| SEC-P5-002 | Dependency vulnerability scan | Must include severity triage and accepted-risk owner |
| SEC-P5-003 | RBAC matrix review | Must show AI/n8n/service actors cannot approve/finalize/sign |
| SEC-P5-004 | Audit-log redaction review | Must cover tokens, signed URLs, raw object keys, credentials |
| SEC-P5-005 | Session/token hardening decision | Must define production browser token/session behavior |
| SEC-P5-006 | Incident response security drill | Must show alert routing, owner, escalation, and closure evidence |

## 3. Non-Negotiable Security Boundaries

- Do not commit `.env`, `.env.local`, production credentials, JWT-like tokens, signed URLs, raw object keys, database dumps, or local deployment artifacts.
- Do not grant AI/n8n/service actors approval, finalization, go-live signoff, accepted-risk approval, or production evidence acceptance rights.
- Do not allow n8n direct PostgreSQL writes.
- Do not expose signed URLs or raw object keys as durable frontend UI state.
- Do not add full API 579/API 581 formulas or copied API/API-ASME formulas.

## 4. Security Exit Criteria

The Phase 5 security workstream exits only when all SEC-P5 evidence is attached, any residual risk has a named human owner and target closure date, and the final decision record references the approved security evidence.

## 5. P5-1 Execution Pack

P5-1 Security and Secrets Hardening expands this plan into concrete evidence records:

```text
docs/security/p5_1_security_and_secrets_hardening_pack.md
docs/security/p5_1_secrets_scanning_evidence_record.md
docs/security/p5_1_rbac_service_actor_review_record.md
docs/security/p5_1_security_accepted_risk_register.md
docs/operations/p5_1_security_evidence_runbook.md
```

P5-1 evidence IDs `P5-SEC-001` through `P5-SEC-012` must be completed or explicitly marked not applicable with human approval before the security workstream can be considered ready for production go-live evidence review.
