# AIM Final Release Operations Evidence Collection

**Package:** RC4-Y Final Release Operations Evidence Collection  
**Baseline:** After RC4-X Final Release Decision Pack Cleanup  
**Purpose:** provide the final operational evidence matrix required before the release owner can complete the go/no-go decision.

## 1. Collection Rule

RC4-Y does not approve production go-live. It only defines the evidence that must be attached, reviewed, and signed off by humans.

Every evidence entry must include:

- evidence ID;
- owner;
- environment;
- date/time captured;
- source command, checklist, system, or review source;
- pass/fail result;
- reviewer;
- evidence attachment or secure repository reference;
- linked defect/risk ID when applicable;
- redaction confirmation.

Do not paste secrets, JWTs, passwords, access keys, signed URLs, production credentials, private object keys, vulnerability exploit details, or confidential client evidence into this document. Store sensitive evidence in the approved evidence repository and reference it by controlled ID only.

## 2. Required Operations Evidence Matrix

| Evidence ID | Area | Required Evidence | Minimum Acceptance Criteria | Owner | Reviewer | Status |
|---|---|---|---|---|---|---|
| EV-OPS-001 | Git baseline | Main branch SHA, tag, clean working tree | `git status` clean; release tag recorded | Developer / DevOps | Product Owner | Pending |
| EV-OPS-002 | Full tests | `pnpm -r test` output | All test files and tests pass | Developer | Lead Engineer | Pending |
| EV-OPS-003 | Lint/typecheck | `pnpm -r lint` output | API, web, config, shared-types pass | Developer | Lead Engineer | Pending |
| EV-OPS-004 | Repository hygiene | `node scripts/repo-hygiene.mjs` output | Repository hygiene check passed | Developer | Security Owner | Pending |
| EV-OPS-005 | Migration and seed | Clean migration/seed run | Migrations apply in order; seed is idempotent | DevOps | Lead Engineer | Pending |
| EV-OPS-006 | Environment validation | Production-like environment validation | Required env vars/config reviewed; no secret committed | DevOps | Security Owner | Pending |
| EV-OPS-007 | Object storage | Evidence/report object-storage smoke proof | Upload, checksum/object verification, signed download/export proof | IT Admin | Lead Engineer | Pending |
| EV-OPS-008 | Backup/restore/DR | Backup/restore drill or rehearsal record | Restore proof and RTO/RPO notes attached | DevOps | Product Owner | Pending |
| EV-OPS-009 | Security review | Dependency/vulnerability/secret/RBAC review | No unresolved blocker/critical/governance defect | Security Owner | Product Owner | Pending |
| EV-OPS-010 | Monitoring and alert routing | Dashboard/log/alert route proof | Alerts route to named owner/channel; escalation path verified | IT Admin | Operations Owner | Pending |
| EV-OPS-011 | Incident response | Incident-response and escalation runbook review | Roles, severity, escalation, rollback owner confirmed | Security Owner / Operations | Product Owner | Pending |
| EV-OPS-012 | UAT final evidence | UAT summary, defect log, signoff register | UAT signoff complete; no open blocker/critical/governance defect | UAT Lead | Product Owner | Pending |
| EV-OPS-013 | Governance denial proof | AI/n8n/service actors denied final actions | AI/n8n/service actors cannot approve, promote, finalize, issue, close, or sign off | Lead Engineer | Security Owner | Pending |
| EV-OPS-014 | Report issue gates | Report issue gate evidence | Report cannot issue unless required gates pass | Approver | Lead Engineer | Pending |
| EV-OPS-015 | Work-order closure | Internal work-order closure evidence | Closure requires note/evidence and authorized actor | Operations Owner | Product Owner | Pending |
| EV-OPS-016 | Final go/no-go | Completed final decision record | Human signoff table complete; decision and conditions recorded | Product Owner | Lead Engineer / Approver | Pending |
| EV-OPS-017 | Hypercare handoff | Hypercare schedule, owner, channel, rollback owner | Owners and cadence confirmed | Operations Owner | Product Owner | Pending |

## 3. Evidence Status Rules

Use these statuses only:

- `Pending` — evidence not yet attached or not yet reviewed.
- `Passed` — evidence attached, reviewed, and accepted.
- `Failed` — evidence shows failure or unresolved defect.
- `Accepted Risk` — non-governance residual risk formally accepted by owner with mitigation and target date.
- `Not Applicable` — formally approved as not applicable with rationale.

## 4. Go / Conditional Go / No-Go Interpretation

- **Go** requires every EV-OPS item to be `Passed` or approved `Not Applicable`.
- **Conditional Go** is allowed only for non-governance, non-security, non-blocker, non-critical residual risks with owner approval.
- **No-Go** is required when any governance, security, migration, backup/restore, monitoring, UAT signoff, report issue gate, work-order closure, evidence linkage, or final human signoff evidence is missing or failed.

## 5. Non-Negotiable Boundaries

- AI/n8n/service actors cannot approve go-live, evidence acceptance, final engineering decisions, issued reports, work-order closure, or production signoff.
- n8n remains orchestration-only and must not write directly to PostgreSQL.
- AI output remains staging-only and must not become final without engineer review.
- No API/API-ASME formulas are invented, copied, embedded, or expanded by RC4-Y.
- RC4-Y does not add runtime APIs, database migrations, formulas, AI behavior, n8n behavior, object-storage behavior, approval behavior, report issue behavior, work-order behavior, or CMMS integration.
