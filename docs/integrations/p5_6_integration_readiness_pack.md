# P5-6 Integration Readiness Pack

**Package:** P5-6 Integration Readiness  
**Baseline:** After P5-5 Performance, Scale, and Data Lifecycle  
**Status:** Documentation/evidence-control package; implementation evidence must be attached by named humans

## 1. Purpose

P5-6 converts the Phase 5 external and internal integration-readiness roadmap into concrete release evidence. It defines the records required to prove that AIM API integrations, n8n orchestration, object-storage handoffs, notification/webhook flows, and future external CMMS cutover paths are controlled, auditable, reversible, and owned before broader production use.

This package is intentionally documentation/evidence-control only. P5-6 does not add runtime APIs, database migrations, formulas, AI behavior, n8n behavior, object-storage behavior, approval behavior, report issue behavior, work-order behavior, external CMMS integration, full API 579, full API 581, 3D processing, or copied API/API-ASME formulas.

## 2. Required Integration Readiness Evidence

| Evidence ID | Evidence area | Required artifact | Owner | Exit condition |
|---|---|---|---|---|
| P5-INT-001 | Integration ownership and inventory | Named integration owners, integration list, data direction, environment, credential owner, and evidence location | Product Owner / Lead Engineer | Every current or planned integration has owner and boundary status |
| P5-INT-002 | AIM API contract boundary review | API contract review, allowed endpoint list, permission boundary, and payload ownership | Lead Engineer / Security Owner | AIM remains system of record and all integrations call approved AIM APIs |
| P5-INT-003 | n8n workflow boundary review | Workflow list, trigger/source, AIM API endpoint target, credential boundary, and no direct database access review | DevOps / Security Owner | n8n remains orchestration-only and calls AIM APIs only |
| P5-INT-004 | Object-storage handoff boundary | Evidence/report artifact handoff path, signed URL rule, checksum rule, retention class, and audit linkage | DevOps / Security Owner | Object-storage integration does not expose durable signed URLs or raw object keys |
| P5-INT-005 | External CMMS readiness and fallback | CMMS readiness decision, internal work-order fallback status, mapping owner, cutover/no-cutover rationale | Product Owner / Lead Engineer | Internal work-order fallback remains active until approved external CMMS cutover |
| P5-INT-006 | Notification and webhook routing readiness | Notification channel list, webhook endpoint inventory, retry owner, escalation owner, and redaction rule | Operations / DevOps | Notifications route to named humans without leaking secrets or evidence links |
| P5-INT-007 | Retry, replay, and idempotency policy | Retry/replay policy, idempotency key approach, duplicate prevention, dead-letter/manual recovery path | Lead Engineer / Operations | Integration failures are recoverable and auditable |
| P5-INT-008 | Integration error, audit, and correlation logging | Correlation ID rule, audit event mapping, error taxonomy, log redaction, and incident route | Lead Engineer / Security Owner | Integration actions are traceable without exposing secrets |
| P5-INT-009 | Integration credential and service-account review | Credential owner, rotation owner, least-privilege review, storage location, and emergency revocation path | Security Owner / DevOps | Service accounts are least-privilege and human-owned |
| P5-INT-010 | Sandbox and test-data validation | Sandbox endpoint list, test-data approval, redaction check, and smoke result summary | Lead Engineer / Product Owner | Integration smoke evidence uses approved non-sensitive data |
| P5-INT-011 | Integration accepted-risk register | Residual integration risks, owner, severity, mitigation, target date, and approval | Product Owner / Security Owner | Integration gaps are closed or risk-accepted by named humans only |
| P5-INT-012 | Human integration readiness signoff | Named human approval or no-go decision | Product Owner / Lead Engineer / Security Owner | Integration readiness evidence is accepted by humans only |

## 3. Evidence Safety Rule

Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials, database connection strings with passwords, private keys, confidential client evidence, raw database dumps, webhook secrets, CMMS credentials, notification tokens, or vulnerability exploit details into P5-6 documents. Use redacted placeholders and attach sensitive evidence only in approved secure evidence storage.

## 4. Required Human Review

P5-6 integration readiness evidence must be reviewed by named humans. Automated tools, AI, n8n, and service actors may generate logs or routing evidence, but they cannot approve integration readiness, accept integration evidence, accept residual risk, approve external CMMS cutover, close integration gaps, or sign production go-live.

Required human roles:

- Product Owner;
- Lead Engineer;
- Security Owner;
- IT Admin / DevOps;
- Operations / Hypercare Owner;
- External integration owner, if an external CMMS or third-party endpoint is in scope.

## 5. No-Go Conditions

A P5-6 integration no-go must be recorded if any of the following remain true:

- integration inventory, ownership, environment, data direction, or credential owner is missing;
- AIM API contract boundary evidence is missing or integrations bypass AIM as the system of record;
- n8n has direct PostgreSQL write access or direct database credentials;
- n8n is used to store final engineering data, approve engineering data, or own final system-of-record decisions;
- object-storage handoffs expose durable signed URLs, raw object keys, or unmanaged report/evidence artifacts;
- external CMMS cutover is attempted before internal work-order fallback readiness and human cutover approval are documented;
- notification/webhook routing leaks secrets, signed URLs, raw object keys, or confidential evidence;
- retry/replay/idempotency/manual recovery behavior is undocumented;
- integration error/audit/correlation logs are missing or unredacted;
- integration service accounts are overprivileged, ownerless, or cannot be revoked;
- real secrets, webhook secrets, CMMS credentials, production credentials, database dumps, or confidential client evidence are committed or pasted into evidence records;
- AI/n8n/service actors can accept integration evidence, approve integration readiness, approve external CMMS cutover, close integration gaps, accept residual integration risk, or authorize go-live;
- the package attempts to introduce full API 579, full API 581, or copied API/API-ASME formulas.

## 6. Completion Rule

P5-6 is complete only when `P5-INT-001` through `P5-INT-012` are attached, reviewed, and referenced from the release evidence register or explicitly marked not applicable with rationale and named human approval.

AI/n8n/service actors cannot accept integration evidence. AI/n8n/service actors cannot approve integration readiness. AI/n8n/service actors cannot close integration gaps. AI/n8n/service actors cannot approve external CMMS cutover.
