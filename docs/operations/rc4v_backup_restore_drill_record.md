# RC4-V Backup and Restore Drill Record

Purpose: document production-readiness evidence for PostgreSQL backup, restore, and evidence object preservation.

| Drill Step | Evidence Required | Result |
|---|---|---|
| PostgreSQL backup created | Backup job/log ID and timestamp | Pending |
| Restore rehearsal completed | Restore target/log ID and validation notes | Pending |
| Critical tables sampled | Assets, evidence metadata, calculations, reports, audit logs sampled | Pending |
| Object storage preservation checked | Evidence object references remain valid after restore rehearsal | Pending |
| Rollback path reviewed | Rollback does not delete or rewrite evidence objects | Pending |
| Recovery owner confirmed | Platform/DevOps owner recorded | Pending |

Rollback does not delete or rewrite evidence objects. Any destructive remediation requires separate human approval and audit logging.
