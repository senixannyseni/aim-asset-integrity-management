# AIM Final Release Evidence Register

**Package:** RC4-X Final Release Decision Pack Cleanup  
**Purpose:** Provide a single register for evidence that must be attached or referenced before Go / Conditional Go / No-Go decision.

## 1. Evidence Registration Rule

Each evidence item should record:

- evidence ID;
- owner;
- source path or system link;
- date captured;
- environment;
- reviewer;
- pass/fail result;
- related defect or risk ID;
- whether secrets, signed URLs, production credentials, or real client confidential evidence were excluded/redacted.

Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials, vulnerability exploit details, or confidential client evidence into this register.

## 2. Required Evidence Register

| Evidence ID | Area | Required Artifact | Suggested Source | Owner | Status |
|---|---|---|---|---|---|
| EV-FINAL-001 | Git baseline | Commit SHA, branch, tag, clean working tree | `git status`, GitHub tag/PR | Developer / DevOps | Pending |
| EV-FINAL-002 | Test evidence | Full test output | `pnpm -r test` | Developer | Pending |
| EV-FINAL-003 | Lint/typecheck | Full lint/typecheck output | `pnpm -r lint` | Developer | Pending |
| EV-FINAL-004 | Repo hygiene | Repo hygiene output | `node scripts/repo-hygiene.mjs` | Developer | Pending |
| EV-FINAL-005 | Migration | Clean DB migration and seed proof | Migration log / DB screenshot | DevOps | Pending |
| EV-FINAL-006 | UAT | Final UAT execution summary and defect log | `docs/uat` package / evidence folder | UAT Lead | Pending |
| EV-FINAL-007 | Evidence storage | Upload, checksum, object verification, signed download | Evidence repository smoke test | IT Admin / Engineer | Pending |
| EV-FINAL-008 | Report issue gates | Report blocked/issued only when gates pass | UAT/report smoke evidence | Approver | Pending |
| EV-FINAL-009 | AI staging boundary | AI cannot approve/promote/finalize | UAT denial evidence | Lead Engineer | Pending |
| EV-FINAL-010 | n8n boundary | n8n has no direct DB write and cannot finalize | Workflow config review | IT Admin | Pending |
| EV-FINAL-011 | Security scan | Dependency/vulnerability/secret review | Scan output or reviewed exception log | Security Owner | Pending |
| EV-FINAL-012 | RBAC/service actor | Denied actions for unauthorized/service actors | API/UI smoke evidence | Security Owner / IT Admin | Pending |
| EV-FINAL-013 | Backup/restore | Backup and restore drill/review | Drill record | DevOps | Pending |
| EV-FINAL-014 | Monitoring | Dashboard/log/alert routing proof | Monitoring screenshot/log | IT Admin | Pending |
| EV-FINAL-015 | Incident response | Escalation route and runbook review | Runbook/signoff | Security Owner / Operations | Pending |
| EV-FINAL-016 | Hypercare | Hypercare owner, schedule, channel, rollback owner | Hypercare plan | Product Owner / Operations | Pending |
| EV-FINAL-017 | Final decision | Completed go/no-go decision record | `docs/release/final_go_no_go_decision_record.md` | Product Owner | Pending |

## 3. Acceptance Criteria

A release may be marked **Go** only when every required evidence item is complete or explicitly marked not applicable with rationale, owner, and approval.

A **Conditional Go** may be used only when the incomplete item is non-governance, non-security, non-blocker, non-critical, and has formal risk acceptance.

A **No-Go** must be used if any governance, security, evidence, migration, backup/restore, monitoring, or final signoff item remains unresolved.

## 4. RC4-Y Operations Evidence Collection Mapping

The final operations evidence collection pack is maintained in:

```text
docs/release/final_release_operations_evidence_collection.md
docs/operations/final_release_operations_evidence_runbook.md
docs/operations/final_release_cutover_rollback_evidence_record.md
```

The EV-FINAL register remains the high-level release evidence register. RC4-Y adds detailed `EV-OPS-001` through `EV-OPS-017` operational evidence items covering Git baseline, tests, lint/typecheck, repository hygiene, migration/seed, environment validation, object storage, backup/restore, security, monitoring, incident response, UAT signoff, governance denial proof, report issue gates, work-order closure, final go/no-go, and hypercare handoff.

AI/n8n/service actors cannot accept evidence, approve go-live, sign final records, or replace human signoff.
