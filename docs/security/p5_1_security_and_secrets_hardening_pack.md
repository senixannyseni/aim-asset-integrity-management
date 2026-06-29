# P5-1 Security and Secrets Hardening Pack

**Package:** P5-1 Security and Secrets Hardening  
**Baseline:** After Phase 5 Production Hardening Planning Pack  
**Status:** Documentation/evidence-control package; implementation evidence must be attached by named humans

## 1. Purpose

P5-1 turns the Phase 5 security roadmap into an evidence-driven security hardening package. It defines what must be captured before the AIM MVP release candidate can be treated as security-reviewed for a production pilot.

This package is intentionally documentation/evidence-control only. P5-1 does not add runtime APIs, database migrations, formulas, AI behavior, n8n behavior, object-storage behavior, approval behavior, report issue behavior, work-order behavior, external CMMS integration, full API 579, full API 581, 3D processing, or copied API/API-ASME formulas.

## 2. Required Security Evidence

| Evidence ID | Evidence area | Required artifact | Owner | Exit condition |
|---|---|---|---|---|
| P5-SEC-001 | Repository secret scan | Secret scan command/output or approved scan report | Security Owner / Developer | No committed secrets, tokens, signed URLs, object keys, production credentials, or sensitive evidence |
| P5-SEC-002 | Environment-file hygiene | `.env*` handling review and `.gitignore` verification | Developer / DevOps | Only `.env.example` is committed; no real environment secrets are committed |
| P5-SEC-003 | Dependency vulnerability review | Dependency audit or equivalent vulnerability scan report | Security Owner | Critical/high issues closed or formally risk-accepted by named human owner |
| P5-SEC-004 | RBAC permission review | Permission matrix review and denied-action evidence | Security Owner / Lead Engineer | AI/n8n/service actors cannot approve, promote, finalize, issue, close, sign, accept evidence, or authorize go-live |
| P5-SEC-005 | Service actor boundary review | Service actor list, permissions, and direct DB access review | Security Owner / DevOps | n8n remains orchestration-only and has no direct PostgreSQL write access |
| P5-SEC-006 | Token/session hardening review | Browser token/session decision record | Security Owner / Lead Engineer | Memory-only default or approved production session strategy documented |
| P5-SEC-007 | Audit-log redaction review | Redaction verification for sensitive values | Security Owner | Tokens, credentials, signed URLs, raw object keys, and secret-like values are not logged in clear text |
| P5-SEC-008 | Evidence exposure review | Evidence UI/API handling review | Security Owner / Engineer | Signed URLs and raw object keys are not exposed as durable UI state |
| P5-SEC-009 | CI/security gate proposal | Security gate checklist for future CI/CD | DevOps / Security Owner | Secret/dependency checks become required release evidence |
| P5-SEC-010 | Accepted-risk register | Completed accepted-risk register, if any risk remains | Product Owner / Security Owner | Every residual risk has owner, severity, mitigation, target date, and approval |
| P5-SEC-011 | Incident-response security route | Security incident route, escalation owner, and evidence location | Security Owner / Operations | Security incident handling is connected to monitoring/hypercare evidence |
| P5-SEC-012 | Final security signoff | Human security signoff record | Security Owner | Named human approves or blocks security readiness; AI/n8n/service actors cannot sign |

## 3. Required Human Review

P5-1 evidence must be reviewed by named humans. Automated tools may generate findings, but they cannot approve closure, accept risk, or waive evidence.

Required human roles:

- Security Owner;
- Lead Engineer;
- IT Admin / DevOps;
- Product Owner for accepted-risk approval;
- Operations / Hypercare Owner for incident-response readiness.

## 4. No-Go Conditions

A P5-1 security no-go must be recorded if any of the following remain true:

- a real secret, credential, signed URL, object key, JWT-like token, database dump, or confidential client evidence is committed;
- n8n has direct PostgreSQL write access;
- AI/n8n/service actors can approve, promote, finalize, issue, close, sign, accept evidence, accept risk, or authorize go-live;
- a blocker/critical/high security issue is unclosed and not formally risk-accepted by a named human owner;
- audit logs expose tokens, credentials, signed URLs, or raw object keys;
- production go-live evidence is accepted without human security signoff.

## 5. Security Completion Rule

P5-1 is complete only when `P5-SEC-001` through `P5-SEC-012` are attached, reviewed, and referenced from the release evidence register or explicitly marked not applicable with rationale and named human approval.

## 6. Evidence Handling Safety Notice

Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials, private keys, database dumps, or confidential client evidence into this repository, test fixtures, release notes, screenshots, runbooks, logs, or markdown evidence records. Store sensitive raw evidence only in the approved evidence repository and reference it by approved evidence ID or secure evidence-location reference.
