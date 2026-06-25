# RC3-B Cleanup Patch Manifest

This patch is scoped to the post-RC3-B cleanup items identified during source-of-truth review.

## Scope

1. Documentation status cleanup for RC3-A/RC3-B completion.
2. Data dictionary and ERD addenda for RC3-B object-storage fields and relationships.
3. Legacy evidence metadata upload policy: retained for compatibility, not gate-eligible until object storage verification.
4. Checksum verification hardening for evidence upload completion when an expected checksum is declared.
5. Blocked evidence access audit logging through `EVIDENCE_ACCESS_BLOCKED`.
6. OpenAPI error-response and legacy-route documentation updates.
7. UAT script fix to calculate file size/hash dynamically.

## Files included

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
