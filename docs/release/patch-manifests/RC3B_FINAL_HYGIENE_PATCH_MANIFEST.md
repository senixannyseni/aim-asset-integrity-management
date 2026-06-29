# RC3-B Final Hygiene Patch Manifest

Patch name: `fix(rc3-b): finalize evidence access and checksum completion guards`

Base expected: `main` after RC3-B object-storage merge/tag.

## Scope

This is a narrow pre-RC3-C hygiene patch. It does not introduce RC3-C functionality.

Included changes:

1. `apps/api/src/routes/evidence.ts`
   - Removes duplicate `blockEvidenceAccess(...)` calls for blocked evidence access cases.
   - Keeps one audit/error response per blocked access attempt.
   - Removes the synthetic checksum fallback based on `objectKey:contentLength:eTag`.
   - Requires completion checksum verification through either:
     - caller-provided `checksum_sha256`, or
     - object metadata checksum from object storage.
   - Blocks completion if the expected session checksum is missing.
   - Blocks completion if no verification checksum is available.
   - Compares verified checksum to the upload-session expected checksum before finalizing evidence metadata.

2. `apps/api/tests/rc3-b-object-storage-governance.test.ts`
   - Adds regression assertions for the final checksum-completion guard.
   - Adds regression assertions preventing duplicate blocked-access branches from returning.

3. `README.md`
   - Replaces stale wording that said evidence binary upload/signed URL flow was not production-ready.
   - Clarifies RC3-B implementation is present while production deployment still requires environment-specific object-storage credentials, malware scanning integration, retention, and monitoring.

4. `docs/release/AIM_RC3B_final_hygiene_patch_report.md`
   - Records the final hygiene change and validation checklist before RC3-C.

## Out of scope

- AI staging promotion.
- Audit log UI.
- Admin UI.
- Dashboard.
- n8n console.
- NDT visualization.
- Hypercare dashboard.
- New migrations.
- API/ASME formula changes.
- Object-storage provider change.
