# P5-6 Integration Failure, Replay, and Risk Record

**Record:** P5-6 Integration Failure, Replay, and Risk Record  
**Evidence IDs:** P5-INT-007, P5-INT-008, P5-INT-009, P5-INT-011, P5-INT-012  
**Status:** Template/evidence-control record; actual evidence must be attached by named humans

## 1. Retry, Replay, and Idempotency Policy

Integration failures must be recoverable without creating duplicate work orders, duplicate evidence records, duplicate report artifacts, duplicate notifications, or conflicting engineering decisions.

Required evidence:

- retry limit and backoff policy;
- replay/manual recovery owner;
- duplicate prevention/idempotency rule;
- dead-letter or manual queue review procedure;
- failed integration escalation owner;
- rollback or compensation procedure for failed handoff.

## 2. Integration Error, Audit, and Correlation Logging

Every governed integration action must be traceable to an initiating user, service actor, workflow, API request, evidence object, report artifact, work order, or incident where applicable.

Required evidence:

- correlation ID rule;
- audit event mapping;
- integration error taxonomy;
- workflow task/error linkage;
- log redaction rule;
- incident route for repeated or critical integration failure.

## 3. Integration Credential and Service-Account Review

Integration service accounts must be least-privilege, human-owned, revocable, and rotated under a named owner. Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials, webhook secrets, CMMS credentials, private keys, or database connection strings with passwords into this record.

Required evidence:

- service account inventory;
- credential owner;
- rotation owner;
- least-privilege review result;
- emergency revocation path;
- denied-action evidence for prohibited actions.

## 4. Integration Accepted-Risk Register

| Risk ID | Integration area | Risk | Severity | Owner | Mitigation | Target date | Approval |
|---|---|---|---|---|---|---|---|
| P5-INT-RISK-001 | TBD | TBD | TBD | TBD | TBD | TBD | Named human only |

AI/n8n/service actors cannot accept residual integration risk. AI/n8n/service actors cannot close integration gaps.

## 5. Human Integration Readiness Signoff

| Signoff item | Required human owner | Result | Evidence link | Date |
|---|---|---|---|---|
| Integration inventory and boundary accepted | Product Owner / Lead Engineer | TBD | TBD | TBD |
| Service account and credential boundary accepted | Security Owner / DevOps | TBD | TBD | TBD |
| Retry/replay/manual recovery accepted | Lead Engineer / Operations | TBD | TBD | TBD |
| External CMMS cutover approved or deferred | Product Owner | TBD | TBD | TBD |
| Final P5-6 integration readiness decision | Product Owner / Lead Engineer / Security Owner | TBD | TBD | TBD |

AI/n8n/service actors cannot approve integration readiness. AI/n8n/service actors cannot authorize production go-live.
