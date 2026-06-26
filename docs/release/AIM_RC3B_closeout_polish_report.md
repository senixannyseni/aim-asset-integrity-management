# AIM RC3-B Closeout Polish Report

## Executive Summary

This closeout polish patch resolves the final source-of-truth alignment gaps found after RC3-B implementation and cleanup. The patch keeps RC3-B limited to evidence object storage, report export artifact storage, object-storage configuration/governance, and related documentation/UAT alignment.

The patch does not introduce RC3-C features such as AI staging promotion, audit log UI, admin UI, dashboard work, n8n console, NDT visualization, or hypercare dashboard.

## Implemented Closeout Items

### 1. AIM-generated evidence codes

Gate-eligible RC3-B evidence upload sessions now generate evidence codes in AIM backend. Callers should no longer provide `evidence_code` to `/api/v1/evidence/upload-url`.

### 2. Mandatory checksum for gate-eligible uploads

`checksum_sha256` is now mandatory for new object-storage evidence upload URL requests. Upload completion requires checksum verification through the provided completion checksum or object metadata.

### 3. Object-verified report gates

Report evidence gates now count only evidence records with `upload_status = 'verified'`. Legacy/null upload statuses are not treated as verified.

### 4. Documentation alignment

The ERD, data dictionary, README, sprint status, UAT script, and OpenAPI contract now reflect the closeout rules.

### 5. n8n workflow boundary addendum

A dedicated RC3-B n8n addendum documents that n8n may route notifications, recovery, and workflow events through AIM APIs only. It cannot generate object keys, create evidence codes, finalize evidence, issue report artifacts, or store raw signed URLs.

## Validation to Run Locally

```text
pnpm db:migrate
pnpm db:seed
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter @aim/api test -- rc3-b-object-storage-governance.test.ts
pnpm --filter @aim/api test -- phase1-7-governance-closure.test.ts
pnpm --filter @aim/api test -- report-generation.test.ts
```

## Recommended Status After Validation

If all checks pass, RC3-B should be treated as closeout-complete and ready for PR/integration review. The next RC3 package should be RC3-C AI staging promotion governance closure.
