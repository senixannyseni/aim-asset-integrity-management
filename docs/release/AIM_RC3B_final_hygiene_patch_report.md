# AIM RC3-B Final Hygiene Patch Report

## Purpose

This patch closes the final RC3-B hygiene findings identified during the pre-RC3-C readiness review.

It is intentionally narrow and limited to evidence object-storage access/completion behavior plus documentation wording.

## Fixes implemented

### 1. Duplicate blocked evidence access calls removed

`apps/api/src/routes/evidence.ts` previously had duplicate calls to `blockEvidenceAccess(...)` in the same blocked branches. The affected branches were:

- `EVIDENCE_BLOCKED_BY_SCAN`
- `EVIDENCE_OBJECT_KEY_MISSING`
- `EVIDENCE_OBJECT_NOT_FOUND`

The patch leaves one call per branch so a blocked evidence request produces one audit event, one transaction commit, and one HTTP response.

### 2. Evidence upload completion checksum guard tightened

Evidence upload URL creation already requires `checksum_sha256`, but completion previously allowed a synthetic fallback checksum derived from object metadata such as object key, content length, and ETag.

This patch removes that fallback.

Completion now requires:

1. expected checksum stored on the upload session; and
2. verification checksum from either:
   - caller-provided `checksum_sha256`, or
   - object metadata checksum (`checksum_sha256`, `checksumSha256`, or `checksum-sha256`).

Completion is blocked if neither verification source is available.

### 3. README wording corrected

The stale README limitation saying the evidence binary upload/signed URL flow was not production-ready has been replaced. The README now states that RC3-B implements AIM-controlled upload sessions, checksum verification, object-existence checks, RBAC-controlled signed URLs, and audit logging, while production deployment still requires environment-specific credentials, malware scanning integration, retention policy, and monitoring.

## Validation required after applying

Run:

```powershell
pnpm db:migrate
pnpm db:seed
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter @aim/api test -- rc3-b-object-storage-governance.test.ts
pnpm --filter @aim/api test -- phase1-7-governance-closure.test.ts
pnpm --filter @aim/api test -- report-generation.test.ts
```

## RC3-C readiness effect

After this patch passes and is merged, RC3-B can be treated as closed for the purpose of starting:

`RC3-C — AI Staging Promotion Governance Closure`
