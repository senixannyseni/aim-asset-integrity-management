# P5-4 Backup and Restore Evidence Record

**Record:** P5-4 Backup and Restore Evidence Record  
**Package:** P5-4 Backup, Restore, and DR  
**Status:** Evidence template; fill with redacted references only

## 1. PostgreSQL Backup Evidence

| Field | Required value |
|---|---|
| Evidence ID | P5-DR-002 |
| Backup owner | Named human owner |
| Backup source | Production or production-pilot PostgreSQL target, redacted |
| Backup method | Managed export, snapshot, dump, PITR, or approved equivalent |
| Backup timestamp | Date/time and timezone |
| Backup identifier/checksum | Redacted identifier or checksum reference |
| Retention policy | Retention duration and storage location |
| Access control | Who can access backup artifacts |
| Result | Pass / Fail / Not applicable with rationale |

Do not paste database dumps, production credentials, database connection strings with passwords, private keys, object-storage keys, signed URLs, or confidential client evidence in this record.

## 2. PostgreSQL Restore Rehearsal

| Field | Required value |
|---|---|
| Evidence ID | P5-DR-003 |
| Restore target | Non-production restore rehearsal environment |
| Restore command/reference | Redacted command, managed-service restore record, or runbook reference |
| Restore start/end | Date/time and duration |
| Validation queries | Redacted query names or result references |
| Recovered data proof | Record count, checksum, or controlled sample reference |
| Result | Pass / Fail / Not applicable with rationale |

Validation must confirm that restored records include governed AIM data such as assets, inspections, evidence metadata, calculation snapshots, review gates, report versions, audit logs, and work-order records where applicable.

## 3. Object-Storage Backup Evidence

| Field | Required value |
|---|---|
| Evidence ID | P5-DR-004 |
| Bucket/artifact scope | Evidence objects and report artifacts, redacted |
| Backup/replication/versioning mechanism | Approved storage protection mechanism |
| Retention and immutability note | Retention, lifecycle, versioning, legal hold, or archive note |
| Access control | Named owner and access boundary |
| Result | Pass / Fail / Not applicable with rationale |

Object-storage evidence must cover both original evidence files and generated report artifacts.

## 4. Object-Storage Restore Rehearsal

| Field | Required value |
|---|---|
| Evidence ID | P5-DR-005 |
| Restored sample scope | Evidence object and report artifact samples |
| Evidence-code path validation | Redacted path pattern and evidence code |
| Metadata validation | Asset, inspection, method, component, checksum, uploader, timestamp |
| Checksum validation | Match / Mismatch / Not applicable with rationale |
| Signed URL/raw object key handling | Confirm no durable UI exposure or committed links |
| Result | Pass / Fail / Not applicable with rationale |

## 5. Validation Boundary

AI/n8n/service actors cannot accept backup evidence, approve restore readiness, approve DR signoff, accept residual DR risk, waive missing restore proof, or authorize production go-live. n8n remains orchestration-only and must not hold direct PostgreSQL write credentials for recovery.
