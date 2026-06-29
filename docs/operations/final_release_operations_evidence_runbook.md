# Final Release Operations Evidence Runbook

**Package:** RC4-Y Final Release Operations Evidence Collection

This runbook tells the release team how to collect evidence for the final release decision. It is an operational checklist only; it does not replace the human go/no-go decision.

## 1. Entry Criteria

Before starting this runbook:

- RC4-X final decision pack is merged to `main`.
- The working tree is clean.
- The release branch/tag/commit candidate is known.
- UAT evidence owners and production operations owners are assigned.
- Evidence will be stored in the approved evidence repository, not pasted into source files.

## 2. Capture Git Baseline Evidence

Capture the output of:

```powershell
git checkout main
git pull origin main
git status
git log -1 --oneline
git tag --points-at HEAD
```

Acceptance criteria:

- branch is `main`;
- working tree is clean;
- release tag or intended tag is recorded;
- evidence is attached as `EV-OPS-001`.

## 3. Capture Test, Lint, and Hygiene Evidence

Capture the output of:

```powershell
pnpm -r test
pnpm -r lint
node scripts/repo-hygiene.mjs
```

Acceptance criteria:

- all test files pass;
- lint/typecheck passes across API, web, config, and shared-types;
- repository hygiene passes;
- no ZIP, local evidence folder, secret, dump, or credential is committed.

Map these to `EV-OPS-002`, `EV-OPS-003`, and `EV-OPS-004`.

## 4. Capture Migration and Environment Evidence

Capture migration/seed evidence from a clean production-like environment. The evidence should show:

- migrations apply in order;
- seed execution is idempotent;
- required environment variables are present;
- no production secret is included in the evidence;
- database connectivity and health checks pass.

Map these to `EV-OPS-005` and `EV-OPS-006`.

## 5. Capture Object Storage Evidence

Capture evidence that object storage supports both original evidence and generated report artifacts:

- upload session created;
- object uploaded;
- checksum/object verification completed;
- controlled signed download/open action works;
- raw object keys and signed URLs are not exposed as durable UI state;
- report export artifact storage proof is attached.

Map this to `EV-OPS-007`.

## 6. Capture Backup, Restore, and DR Evidence

Capture a backup/restore drill or approved rehearsal record showing:

- backup source;
- restore target;
- validation query or smoke check;
- restore result;
- RTO/RPO notes;
- defects or accepted risks.

Map this to `EV-OPS-008`.

## 7. Capture Security and Monitoring Evidence

Capture evidence for:

- dependency/vulnerability review;
- secret scan or repository hygiene review;
- RBAC/service actor denial proof;
- audit-log redaction;
- monitoring dashboard/log review;
- alert routing to a named owner/channel;
- incident response and escalation path.

Map these to `EV-OPS-009`, `EV-OPS-010`, `EV-OPS-011`, and `EV-OPS-013`.

## 8. Capture UAT, Report, Work Order, and Hypercare Evidence

Capture evidence for:

- final UAT summary and signoff register;
- defect log closure;
- report issue gate behavior;
- internal work-order closure behavior;
- hypercare owner, cadence, channel, rollback owner, and escalation path.

Map these to `EV-OPS-012`, `EV-OPS-014`, `EV-OPS-015`, and `EV-OPS-017`.

## 9. Complete Final Decision

After all EV-OPS evidence has been attached and reviewed, complete:

```text
docs/release/final_go_no_go_decision_record.md
```

Map the completed decision to `EV-OPS-016`.

## 10. Redaction and Storage Rules

Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials, private keys, vulnerability exploit details, or confidential client evidence into Git. Use controlled evidence IDs and secure repository references instead.
