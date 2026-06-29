# P5-1 Security Evidence Runbook

**Package:** P5-1 Security and Secrets Hardening  
**Purpose:** Provide a repeatable procedure for collecting and reviewing security evidence.

## 1. Entry Criteria

- RC4-A through RC4-Z and the final evidence bundle are merged and tagged.
- Phase 5 production hardening planning pack is merged and tagged.
- Working tree is clean before evidence collection.
- No ZIP/package artifacts are staged for commit.

## 2. Recommended Evidence Commands

Use the project’s approved tooling where available. At minimum, record:

```powershell
git status
pnpm -r test
pnpm -r lint
node scripts/repo-hygiene.mjs
```

For security evidence, attach the organization-approved outputs for:

```text
secret scan
dependency vulnerability scan
RBAC/service actor review
audit-log redaction review
signed URL/raw object key exposure review
```

Do not paste secrets, credentials, tokens, signed URLs, private keys, object keys, or exploit details into repository documents.

## 3. Review Sequence

1. Run repository hygiene and confirm no package artifacts or secrets are staged.
2. Run secret scan and record P5-SEC-001/P5-SEC-002 evidence.
3. Run dependency vulnerability scan and triage P5-SEC-003 findings.
4. Review RBAC/service actor permissions and denied-action evidence for P5-SEC-004/P5-SEC-005.
5. Review token/session behavior and audit-log redaction for P5-SEC-006/P5-SEC-007.
6. Review signed URL/raw object key exposure for P5-SEC-008.
7. Create accepted-risk records only when a named human owner approves P5-SEC-010.
8. Confirm incident-response security route and monitoring ownership for P5-SEC-011.
9. Complete final human security signoff for P5-SEC-012.

## 4. Evidence Storage

Security evidence should be stored in the approved evidence bundle location and referenced by ID. Evidence must be redacted before archival if it contains sensitive details.

## 5. Exit Criteria

P5-1 exits only when:

- P5-SEC-001 through P5-SEC-012 are complete or formally marked not applicable;
- any accepted risk has a named human owner, mitigation, approval, and target date;
- no governance/security no-go condition remains unresolved;
- final release evidence register references the completed P5-1 security evidence;
- AI/n8n/service actors have not accepted evidence, accepted risk, signed security readiness, or authorized production go-live.
