# AIM Tank Integrity — RC3-B Cleanup Implementation Report

**Input reviewed:** `aim-tank-integrity-20260625-081459.zip`  
**Output patch:** `aim-tank-integrity-rc3-b-cleanup-patch.zip`  
**Full cleaned repository snapshot:** `aim-tank-integrity-20260625-rc3b-cleaned.zip`

## 1. Executive Summary

The cleanup pass addresses the specific source-of-truth gaps identified after RC3-B implementation. The repository already contained the core RC3-B implementation for evidence object-storage upload/download and report export object-storage. This cleanup patch does not add RC3-C scope. It tightens governance alignment, documentation consistency, data dictionary/ERD coverage, legacy route safety, checksum verification behavior, auditability for blocked evidence access, OpenAPI response coverage, and UAT script reliability.

Recommended status after applying this patch: **RC3-B cleanup ready for local validation and PR review**.

## 2. Scope Implemented

### 2.1 Documentation status cleanup

Updated documentation that still described RC3-A as in progress or RC3-B as future work. The affected docs now state that RC3-A and RC3-B are implemented in this repository state, while production closure remains human-gated and later RC3 packages remain out of scope.

Updated files include:

- `README.md`
- `docs/deployment/deployment_runbook.md`
- `docs/deployment/go_live_checklist.md`
- `docs/deployment/migration_plan.md`
- `docs/release/hypercare_post_uat_monitoring_checklist.md`
- `docs/release/release_candidate_go_no_go_decision.md`
- `docs/security-baseline.md`
- `docs/sprint-status.md`

### 2.2 Data dictionary and ERD synchronization

Added an RC3-B addendum to `03_Database/data_dictionary_current.md` documenting:

- updated `evidence_files` object-storage fields;
- new `evidence_upload_sessions` table;
- legacy metadata-only upload policy;
- updated `report_exports` object-storage fields;
- required RC3-B audit events;
- required object-storage gates.

Added an RC3-B addendum to `docs/erd_current.md` documenting logical relationships among:

- `assets`;
- `inspection_events`;
- `evidence_upload_sessions`;
- `evidence_files`;
- `evidence_links`;
- `reports`;
- `report_exports`;
- `users`;
- `audit_logs`.

### 2.3 Legacy evidence upload route policy

The legacy route `POST /api/v1/evidence/upload` is retained for compatibility but no longer presents itself as a gate-eligible object-storage upload path.

The route now:

- writes audit event `EVIDENCE_LEGACY_METADATA_REGISTERED`;
- marks records as `metadata_only_pending_object_verification`;
- sets `upload_status = 'pending'`;
- sets `access_status = 'blocked'`;
- returns a warning instructing clients to use `/evidence/upload-url` and `/evidence/complete-upload` for gate-eligible RC3-B evidence.

This reduces the bypass risk where metadata-only evidence could be mistaken for object-verified evidence.

### 2.4 Report evidence gate hardening

The report issue evidence-count query now joins `evidence_links` to `evidence_files` and counts only object-verified evidence:

- `coalesce(ef.upload_status, 'verified') = 'verified'`
- object key/path/URI exists

This prevents legacy metadata-only records with `upload_status = 'pending'` from satisfying report evidence gates.

### 2.5 Checksum verification hardening

The evidence completion flow now handles declared checksum governance more strictly:

- `ObjectMetadata` includes provider metadata.
- `headObject` returns storage metadata.
- completion compares provided checksum, expected checksum, and object metadata checksum where available.
- if an expected checksum was declared but neither a provided checksum nor object metadata checksum is available, completion is blocked with `EVIDENCE_CHECKSUM_REQUIRED`.

The upload URL response also includes an `x-amz-meta-checksum_sha256` required header when a checksum is declared.

### 2.6 Blocked evidence access audit logging

Blocked evidence access cases now write audit logs before returning failure:

- malware/scan block;
- missing object key;
- object not found in object storage.

The route updates `evidence_files.access_status = 'blocked'` and writes `EVIDENCE_ACCESS_BLOCKED` with safe metadata. It still avoids logging raw signed URL query strings.

### 2.7 OpenAPI updates

OpenAPI was updated to reflect:

- legacy metadata-only upload behavior;
- `EVIDENCE_LEGACY_METADATA_REGISTERED`;
- `409` response for signed evidence URL object/malware failures;
- checksum-required failure in complete-upload;
- blocked evidence access audit behavior;
- report export download URL error responses.

### 2.8 UAT script fix

`docs/uat/uat_rc3_object_storage_scripts.md` now calculates evidence file size dynamically:

```powershell
$fileSize = (Get-Item $evidencePath).Length
$fileHash = (Get-FileHash -Path $evidencePath -Algorithm SHA256).Hash.ToLowerInvariant()
```

It also passes the checksum into upload-url and complete-upload requests, preventing the previous hardcoded `size_bytes = 1234` mismatch risk.

## 3. Files Changed

- `README.md`
- `03_Database/data_dictionary_current.md`
- `04_API/openapi.yaml`
- `docs/erd_current.md`
- `docs/security-baseline.md`
- `docs/sprint-status.md`
- `docs/deployment/deployment_runbook.md`
- `docs/deployment/go_live_checklist.md`
- `docs/deployment/migration_plan.md`
- `docs/release/hypercare_post_uat_monitoring_checklist.md`
- `docs/release/release_candidate_go_no_go_decision.md`
- `docs/uat/uat_rc3_object_storage_scripts.md`
- `apps/api/src/routes/evidence.ts`
- `apps/api/src/routes/reports.ts`
- `apps/api/src/modules/object-storage/object-storage-service.ts`
- `apps/api/src/modules/object-storage/object-storage-types.ts`

## 4. Not Changed / Out of Scope

This cleanup intentionally uses a governed boundary instead of:

- AI staging promotion;
- audit log UI;
- admin UI;
- dashboard;
- n8n console;
- NDT visualization;
- hypercare dashboard;
- external CMMS integration;
- full API 579/API 581 calculations;
- API/ASME formula expressions.

## 5. Required Local Validation After Applying Patch

Run these commands after copying the patch into the repository:

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter @aim/api test -- rc3-b-object-storage-governance.test.ts
pnpm --filter @aim/api test -- phase1-7-governance-closure.test.ts
pnpm --filter @aim/api test -- report-generation.test.ts
```

If database is available:

```powershell
pnpm db:migrate
pnpm db:seed
```

Then run the RC3-B object-storage UAT script against local MinIO/PostgreSQL.

## 6. Implementation Caveat

This patch was prepared from a ZIP snapshot in a sandbox environment without installing dependencies or running the repository's TypeScript/Vitest suite. It is therefore supplied as a scoped source patch for local validation in the user's working repository.
