# AIM Release Candidate Go / No-Go Decision Template

**Status:** Superseded for final RC4 decisioning by `docs/release/final_go_no_go_decision_record.md`, but retained as a historical release-candidate template.  
**Current baseline:** RC4-A through RC4-W implemented and post-review closed; RC4-X final decision-pack cleanup added.  
**Decision rule:** Production go-live remains conditional on human signoff and attached evidence. Static tests, AI, n8n, service accounts, and automation cannot approve go-live.

## 1. Release Candidate Identification

| Field | Value |
|---|---|
| Release candidate identifier | `<RC-ID or tag>` |
| Source branch / tag / commit | `main` / `<tag>` / `<commit SHA>` |
| Decision date | `<date>` |
| Decision owner | `<name / role>` |
| UAT cycle | `<cycle>` |
| Evidence package location | `<path/reference>` |

## 2. Technical Readiness Summary

| Check | Status | Evidence reference |
|---|---|---|
| Full tests passed | Pending |  |
| Full lint/typecheck passed | Pending |  |
| Repository hygiene passed | Pending |  |
| Clean DB migration and seed passed | Pending |  |
| Production smoke test passed | Pending |  |

## 3. UAT Readiness Summary

| Check | Status | Evidence reference |
|---|---|---|
| UAT execution summary completed | Pending |  |
| UAT evidence package assembled | Pending |  |
| Defect log reviewed | Pending |  |
| Blocker/critical/governance defects closed | Pending |  |
| Signoff register completed | Pending |  |

## 4. Migration Readiness Summary

| Check | Status | Evidence reference |
|---|---|---|
| Clean DB migration completed | Pending |  |
| Seed execution completed where applicable | Pending |  |
| Migration validation checks completed | Pending |  |
| Migration rollback path reviewed | Pending |  |

## 5. Rollback Readiness Summary

| Check | Status | Evidence reference |
|---|---|---|
| Rollback owner confirmed | Pending |  |
| Rollback trigger criteria confirmed | Pending |  |
| Backup/restore/DR evidence completed | Pending |  |
| Recovery proof attached | Pending |  |

## 6. Security Readiness Summary

| Check | Status | Evidence reference |
|---|---|---|
| Security scan/review completed | Pending |  |
| RBAC/service actor review completed | Pending |  |
| Secrets scan completed | Pending |  |
| Monitoring and alert routing verified | Pending |  |
| Incident response and hypercare ownership confirmed | Pending |  |

## 7. Governance Readiness Summary

| Check | Status | Evidence reference |
|---|---|---|
| AI output remains staging-only | Pending |  |
| Engineer review gate verified | Pending |  |
| Evidence linkage gates verified | Pending |  |
| Calculation approved formula version verified | Pending |  |
| Report issue gates verified | Pending |  |
| Internal work order fallback verified | Pending |  |
| Audit log coverage verified | Pending |  |
| n8n direct PostgreSQL write access absent | Pending |  |
| AI/n8n/service actors blocked from finalization/signoff | Pending |  |

## 8. Known Limitations

Known limitations must be accepted before a Go or Conditional Go decision:

- No full API 579 implementation.
- No full API 581 implementation.
- No SAP/Maximo/CMMS integration.
- No 3D processing.
- No invented, copied, or embedded API/API-ASME formulas.
- UAT uses synthetic data and fixture evidence metadata unless a non-confidential test evidence pack is supplied.

Frontend UI is no longer a blanket exclusion. governed RC4 frontend screens were added through RC4-B through RC4-W and remain subject to backend RBAC and governance gates.

## 9. Open Defects

| Defect ID | Severity | Category | Owner | Status | Release impact |
|---|---|---|---|---|---|
| `<ID>` | `<severity>` | `<category>` | `<owner>` | `<status>` | `<impact>` |

## 10. Accepted Risks

| Risk / defect ID | Description | Owner | Acceptance approval | Target closure |
|---|---|---|---|---|
| `<ID>` | `<description>` | `<owner>` | `<approval>` | `<date>` |

## 11. No-Go Conditions

Any of these conditions should trigger No-Go unless formally resolved and retested:

- Tests, lint/typecheck, migration, seed, smoke, repo hygiene, backup/restore, monitoring, or security evidence fails.
- Report can be issued without gates.
- AI/n8n/service actors can approve or finalize engineering data, production validation, or go-live signoff.
- AI/n8n can approve or finalize engineering data.
- Staging can promote without engineer review.
- Calculation can run/approve for final use without explicit approved formula version.
- Calculation can run/approve without explicit approved formula version.
- Evidence linkage can be bypassed.
- Audit log is missing for a controlled action.
- Audit log missing for controlled action.
- n8n has direct PostgreSQL write access.
- Work order can close without required note/evidence.
- Secrets or production credentials are committed.
- Secrets or production credentials committed.
- Full API 579/API 581/external CMMS/3D/invented formula implementation appears unexpectedly.
- Full API 579/API 581/external CMMS/3D/frontend UI/invented formula implementation claim appears unexpectedly.
- Required human signoff is missing.

## 12. Decision Options

| Decision | Use When | Selected |
|---|---|---:|
| Go | All release criteria pass and no blocker, critical, or governance defect remains open. | No |
| Conditional Go | Only non-governance residual risks remain with owner approval, mitigation, and target date. | No |
| No-Go | Required evidence/signoff is missing or unresolved blocker/critical/governance risk remains. | No |

### Go Decision

Use only when all release criteria pass and required human approvals are complete.

### Conditional Go Decision

Use only when non-governance residual risks have named owners, mitigation, approval, and target closure dates.

### No-Go Decision

Use when any blocker, critical, governance, evidence, security, migration, rollback, monitoring, or signoff condition remains unresolved.

## 13. Final Sign-Off Table

| Role | Name | Decision | Date | Comments |
|---|---|---|---|---|
| Product Owner |  | Pending |  |  |
| Lead Engineer |  | Pending |  |  |
| Approver |  | Pending |  |  |
| IT Admin / DevOps |  | Pending |  |  |
| UAT Lead |  | Pending |  |  |
| Security Owner |  | Pending |  |  |
| Operations / Hypercare Owner |  | Pending |  |  |
