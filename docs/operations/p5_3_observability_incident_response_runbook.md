# P5-3 Observability and Incident Response Runbook

**Package:** P5-3 Observability and Incident Response  
**Purpose:** Provide repeatable evidence-capture steps for monitoring, alerting, incident response, and hypercare handoff.

## 1. Evidence Safety

Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials, database URLs with passwords, private keys, vulnerability exploit details, confidential client evidence, or raw incident artifacts containing sensitive data into committed files. Store sensitive evidence only in the approved secure evidence location and reference it by ID.

## 2. Baseline Verification Commands

Run from repository root and capture redacted output as supporting operational evidence:

```powershell
git status
git rev-parse HEAD
git tag --points-at HEAD
pnpm -r test
pnpm -r lint
node scripts/repo-hygiene.mjs
```

## 3. Monitoring and Alerting Evidence

Complete:

```text
docs/operations/p5_3_monitoring_alerting_evidence_record.md
```

Required reviews:

- dashboard baseline for backend, frontend, PostgreSQL, object storage, n8n, AI/staging jobs, report exports, and work-order workflow visibility;
- alert routing verification to named human owners;
- audit, error, workflow, and correlation log review;
- log retention and redaction check;
- n8n remains orchestration-only and calls AIM APIs only.

## 4. Incident Response and Escalation Evidence

Complete:

```text
docs/operations/p5_3_incident_response_escalation_record.md
```

Required reviews:

- severity triage matrix;
- escalation owner and backup owner;
- incident response tabletop;
- governance incident route;
- incident closure criteria and retest evidence.

## 5. Hypercare Handoff Evidence

Complete:

```text
docs/operations/p5_3_hypercare_observability_handoff_record.md
```

Required reviews:

- hypercare cadence;
- daily monitoring review checklist;
- support and escalation channels;
- rollback owner;
- open-incident handling and evidence archive location.

## 6. Human Review Rule

Observability and incident-response evidence requires named human review. AI/n8n/service actors cannot approve monitoring readiness, accept observability evidence, close incidents, accept residual operational risk, approve hypercare handoff, or authorize production go-live.

## 7. Completion Checklist

- [ ] `P5-OBS-001` through `P5-OBS-012` completed or marked N/A with rationale.
- [ ] Monitoring dashboard baseline evidence attached or referenced.
- [ ] Alert routing verification evidence attached or referenced.
- [ ] Audit/error/workflow/correlation log review completed.
- [ ] Incident response tabletop completed.
- [ ] Hypercare cadence and support channel confirmed.
- [ ] Final release evidence register references the P5-3 evidence set.
- [ ] Human observability signoff completed.
