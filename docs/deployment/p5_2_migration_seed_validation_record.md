# P5-2 Migration and Seed Validation Record

**Package:** P5-2 Deployment and Environment Hardening  
**Evidence ID:** `P5-ENV-007`

## 1. Purpose

Record controlled migration and seed rehearsal evidence for the selected release baseline. This record proves that database setup, migration sequencing, validation, and rollback planning were reviewed before production or production-pilot deployment.

## 2. Migration and Seed Rehearsal

Migration and seed rehearsal evidence must show the selected release baseline, execution result, validation result, rollback readiness, and named human review.

## 3. Migration Baseline

| Field | Value |
|---|---|
| Release tag | `<tag>` |
| Commit SHA | `<commit-sha>` |
| Target environment | `<environment>` |
| Migration command | `<command reference, no secrets>` |
| Seed command | `<command reference or not applicable>` |
| Migration owner | `<name / role>` |
| Validation owner | `<name / role>` |

## 4. Required Evidence

| Check | Expected evidence | Result | Evidence reference |
|---|---|---|---|
| Clean working tree before migration | `git status` output | Pending |  |
| Migration sequence verified | migration log / test output | Pending |  |
| Seed policy approved | seed output or N/A rationale | Pending |  |
| Post-migration validation queries completed | validation summary | Pending |  |
| Audit/governance tables present | schema/table validation | Pending |  |
| Formula registry state verified | approved formula-version evidence | Pending |  |
| RBAC permission seed verified | permission/role validation | Pending |  |
| Rollback plan documented | rollback command/procedure | Pending |  |
| Backup taken before migration | backup evidence | Pending |  |

## 5. No-Go Conditions

- migration fails;
- seed policy is unclear;
- migration output contains secrets;
- rollback plan is missing;
- backup evidence is missing;
- schema state cannot support evidence, AI staging, calculation governance, report issue gates, work-order gates, audit logging, or final release evidence records;
- AI/n8n/service actors can execute or approve migration signoff.

## 6. Human Review

| Role | Name | Decision | Date | Comment |
|---|---|---|---|---|
| DevOps / DBA |  | Pending |  |  |
| Lead Engineer |  | Pending |  |  |
| Product Owner |  | Pending |  |  |

AI/n8n/service actors cannot approve migration readiness or waive failed migration evidence.
