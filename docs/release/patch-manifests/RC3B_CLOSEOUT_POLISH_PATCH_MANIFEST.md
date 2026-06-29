# RC3-B Closeout Polish Patch Manifest

This scoped patch closes the remaining RC3-B source-of-truth alignment gaps before RC3-C begins.

## Included files

- `README.md`
- `03_Database/data_dictionary_current.md`
- `04_API/openapi.yaml`
- `05_n8n/rc3b_object_storage_workflow_addendum.md`
- `apps/api/src/routes/evidence.ts`
- `apps/api/src/routes/reports.ts`
- `docs/erd_current.md`
- `docs/sprint-status.md`
- `docs/uat/uat_rc3_object_storage_scripts.md`
- `docs/release/AIM_RC3B_closeout_polish_report.md`
- `RC3B_CLOSEOUT_POLISH_PATCH_MANIFEST.md`

## Scope

- AIM-generated evidence code for gate-eligible evidence upload sessions.
- Mandatory `checksum_sha256` for signed evidence upload URL requests.
- Completion-time checksum enforcement for gate-eligible uploads.
- Report evidence gates requiring `upload_status = 'verified'` only.
- UAT script alignment with evidence ID convention.
- ERD/data dictionary/status documentation cleanup.
- n8n API-only object-storage workflow addendum.

## Out of scope

- AI staging promotion.
- Audit log UI.
- Admin UI.
- Dashboard.
- n8n console.
- NDT visualization.
- Hypercare dashboard.
- External CMMS integration.
- API/ASME formula implementation.
