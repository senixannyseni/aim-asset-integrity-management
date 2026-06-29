# Post-Go-Live Incident, Problem, and Defect Record

**Package:** Post-Go-Live Hypercare and Production Stabilization Evidence Pack  
**Evidence focus:** `HYPERCARE-004`, `HYPERCARE-005`, `HYPERCARE-006`, `HYPERCARE-008`, `HYPERCARE-009`, `HYPERCARE-010`

## 1. Incident Intake Register

| Incident ID | Date/time | Severity | Area | Summary | Owner | SLA/target | Status | Evidence link |
|---|---|---|---|---|---|---|---|---|
| HC-INC-001 | TBD | TBD | TBD | TBD | Named human | TBD | Open | TBD |

Severity must be assigned by named humans. AI/n8n/service actors cannot close production incidents.

## 2. Problem and Defect Register

| Defect/Problem ID | Source | Category | Root-cause owner | Workaround | Resolution target | Release/backlog link | Status |
|---|---|---|---|---|---|---|---|
| HC-DEF-001 | TBD | TBD | Named human | TBD | TBD | TBD | Open |

## 3. Governance Incident Categories

The following categories require escalation to the Lead Engineer and Product Owner:

- missing evidence linkage;
- AI extraction promoted without required human review;
- calculation run using unapproved formula version;
- report issued without required gates;
- work order closed without required authorization;
- n8n direct PostgreSQL write attempt;
- audit-log redaction failure;
- signed URL, raw object key, secret, token, or production credential exposure;
- failed rollback/watch condition.

## 4. Closure Rule

An incident, problem, or defect may be closed only when the named owner records root cause, impact, corrective action, evidence link, and closure approval. AI/n8n/service actors cannot close production incidents, close hypercare defects, accept residual operational risk, or waive missing evidence.

AI/n8n/service actors cannot close hypercare defects.

Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials, webhook secrets, CMMS credentials, database connection strings with passwords, private keys, confidential client evidence, raw incident payloads, or vulnerability exploit details into this record.
