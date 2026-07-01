# P5-4 Backup, Restore, and DR Runbook

**Runbook:** P5-4 Backup, Restore, and DR Runbook  
**Package:** P5-4 Backup, Restore, and DR  
**Status:** Operator checklist; attach outputs to approved evidence storage

## 1. Pre-Run Safety Checks

- Confirm the working tree is clean before collecting release evidence.
- Confirm `.env.example` contains only safe fixtures.
- Confirm no production secrets, JWTs, passwords, object-storage keys, signed URLs, database dumps, private keys, or confidential client evidence will be pasted into committed files.
- Confirm backup/restore evidence will be stored in approved secure evidence storage, with only redacted references committed.

## 2. Baseline Verification Commands

Run from repository root before attaching P5-4 evidence:

```powershell
pnpm --filter @aim/api test -- p5-4-backup-restore-dr.test.ts
pnpm -r test
pnpm -r lint
node scripts/repo-hygiene.mjs
```

## 3. Backup Evidence Collection

Collect redacted references for:

- PostgreSQL backup identifier, timestamp, retention policy, and owner;
- PostgreSQL restore rehearsal output and validation query reference;
- object-storage evidence/report backup or replication proof;
- sample restored object metadata and checksum validation;
- configuration and secret recreation/escrow owner;
- RPO/RTO target and actual measured values;
- DR scenario rehearsal gaps and corrective actions;
- final human DR signoff.

Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials, database connection strings with passwords, private keys, database dumps, or confidential client evidence.

## 4. Minimum Restore Validation

The restore rehearsal must validate at least these governed objects where applicable:

- asset and inspection records;
- evidence metadata and evidence-code links;
- NDT measurements and finding references;
- calculation input/output snapshots and formula version references;
- integrity decisions and review gates;
- report versions and report artifacts;
- internal work orders and closure evidence;
- audit logs and correlation references.

## 5. DR No-Go Handling

Declare a no-go if backup evidence is missing, restore proof fails, object-storage artifacts cannot be recovered, RPO/RTO targets are missing or exceeded without accepted risk, governance records cannot be validated after restore, or recovery ownership/escalation is incomplete.

AI/n8n/service actors cannot approve restore readiness, approve DR signoff, accept residual DR risk, close DR gaps, waive missing recovery evidence, or authorize production go-live. n8n remains orchestration-only and must call AIM APIs only.
