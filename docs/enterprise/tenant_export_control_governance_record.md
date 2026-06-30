# Tenant Export Control Governance Record

## Purpose

This record documents the Sprint 5 export-control foundation for tenant evidence bundles, report exports, and restore/export manifests.

## Runtime controls

- `tenant_export_control_reviews` records export ID, purpose, requested object keys, allowed object keys, blocked object keys, blocked reasons, review status, and manifest key.
- `buildTenantExportControlReview` blocks malformed or cross-tenant object keys and requires human approval evidence.
- `assertTenantExportControlApproved` prevents execution when any blocked reason or blocked object key remains.

## Approval boundary

AI/n8n/service actors cannot approve export control review, cannot waive blocked object keys, and cannot execute tenant evidence export without a human approval record.

## Export manifest

Export manifests are written only under the selected tenant prefix, for example `tenants/{tenant_slug}/{tenant_id}/exports/{export_id}/manifest.json`.
