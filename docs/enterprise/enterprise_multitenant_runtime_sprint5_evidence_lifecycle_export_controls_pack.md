# Enterprise Multi-Tenant Runtime Implementation Sprint 5 — Tenant-Scoped Evidence Lifecycle, Backup/Restore, and Export Controls Pack

## Scope

Sprint 5 adds tenant-scoped evidence lifecycle, backup/restore, and export-control foundations for AIM enterprise runtime. It converts the Sprint 2 object-storage tenant boundary and Sprint 3 route registry into operational controls for evidence retention, tenant restore scopes, and tenant export review.

## Evidence map

| Evidence ID | Control objective | Evidence location |
|---|---|---|
| MT-S5-001 | Tenant evidence lifecycle policy table and runtime helper are present | `tenant_evidence_lifecycle_policies`, `tenant-evidence-lifecycle.ts` |
| MT-S5-002 | Tenant object prefixes remain under `tenants/{slug}/{tenant_id}` | `tenantObjectStoragePrefix`, Sprint 2 object boundary |
| MT-S5-003 | Evidence lifecycle gate requires human approval for export, restore, and deletion | `buildTenantEvidenceLifecyclePolicy` |
| MT-S5-004 | Tenant backup/restore rehearsal scope is recorded | `tenant_backup_restore_drills` |
| MT-S5-005 | Restore targets are tenant-prefixed and cannot cross tenant boundary | `buildTenantBackupRestoreScope` |
| MT-S5-006 | Tenant export control review records allowed and blocked keys | `tenant_export_control_reviews` |
| MT-S5-007 | Cross-tenant export object keys are blocked before execution | `buildTenantExportControlReview` |
| MT-S5-008 | AI/n8n/service actors cannot approve evidence export, restore, backup, or lifecycle deletion | runtime helpers and migration notes |
| MT-S5-009 | Lifecycle evidence is linked to release register and acceptance gates | release docs and gates |
| MT-S5-010 | Operations runbook defines backup/restore/export validation | Sprint 5 runbook |
| MT-S5-011 | No historical migrations are rewritten | forward-only `0032` migration |
| MT-S5-012 | Unsafe committed evidence examples are excluded | repo hygiene and static regression test |

## Governance boundary

AI/n8n/service actors cannot accept multi-tenant Sprint 5 evidence. AI/n8n/service actors cannot approve tenant evidence exports, tenant restore, tenant backup/restore closure, lifecycle policy approval, lifecycle deletion, or tenant export-control exceptions. AIM remains the system of record, and n8n remains orchestration-only.

## Runtime implementation

Sprint 5 introduces:

- `apps/api/src/modules/tenancy/tenant-evidence-lifecycle.ts`
- `db/migrations/0032_enterprise_multitenant_sprint5_evidence_lifecycle_export_controls.sql`
- `tenant_evidence_lifecycle_policies`
- `tenant_backup_restore_drills`
- `tenant_export_control_reviews`

The runtime helper builds tenant-specific lifecycle policy summaries, restore scopes, export manifests, and blocked export reviews without moving approval authority into AI, n8n, or service actors.

## Unsafe content restrictions

Do not paste secrets, tenant credentials, customer PII, real customer data, tenant data, tenant billing details, payment processing data, full API 579, full API 581, or copied API/API-ASME formulas into this evidence pack.
