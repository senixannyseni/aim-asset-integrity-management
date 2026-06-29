# RC4-W Incident Response and Alert Routing Runbook

Purpose: define operational response for early production/hypercare incidents.

## Incident escalation route

| Severity | Example | First Responder | Escalation | Target Response |
| --- | --- | --- | --- | --- |
| Sev 1 | API unavailable, database outage, evidence object loss risk | Platform Lead | Engineering Lead + Product Owner | Immediate triage |
| Sev 2 | Authentication/RBAC failure, report issue blocker, object-storage signed URL failure | Engineering Lead | Security Lead / Platform Lead | Same-day triage |
| Sev 3 | Monitoring warning, non-critical UI error, documentation gap | Assigned module owner | Product Owner | Next working day |

## Runbook scenarios

1. Authentication or RBAC failure.
2. Object-storage upload/download failure.
3. Database outage or migration issue.
4. Report issue gate unexpectedly blocked.
5. Evidence integrity concern.
6. Audit log redaction concern.
7. AI/n8n/service actor boundary violation attempt.

All incidents require timestamp, owner, affected module, user impact, mitigation, evidence links, and closure decision.
