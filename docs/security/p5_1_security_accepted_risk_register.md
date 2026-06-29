# P5-1 Security Accepted-Risk Register

**Package:** P5-1 Security and Secrets Hardening  
**Evidence ID:** P5-SEC-010

## 1. Rule

Security risks may only be accepted by named human owners. AI/n8n/service actors cannot accept risk, waive security evidence, or approve production go-live.

No blocker, critical, or governance/security boundary defect should be accepted for production go-live unless formally escalated and resolved through the final human go/no-go process.

## 2. Accepted-Risk Table

| Risk ID | Source finding | Severity | Description | Mitigation | Owner | Approval role | Target closure | Release impact | Status |
|---|---|---|---|---|---|---|---|---|---|
| `<risk-id>` | `<finding/evidence id>` | `<severity>` | `<description>` | `<mitigation>` | `<owner>` | `<approval>` | `<date>` | `<go/conditional/no-go>` | Pending |

## 3. Mandatory Rejection Criteria

Risk acceptance should be rejected if:

- the risk permits AI/n8n/service actors to approve, finalize, sign, or accept evidence;
- n8n has direct PostgreSQL write access;
- secrets or production credentials remain committed;
- audit logs expose tokens, credentials, signed URLs, or raw object keys;
- report issue, work-order close, calculation approval, evidence linkage, or final signoff gates can be bypassed;
- the owner, mitigation, target closure date, or human approval is missing.

## 4. Review Signoff

| Role | Name | Decision | Date | Comments |
|---|---|---|---|---|
| Security Owner |  | Pending |  |  |
| Product Owner |  | Pending |  |  |
| Lead Engineer |  | Pending |  |  |
