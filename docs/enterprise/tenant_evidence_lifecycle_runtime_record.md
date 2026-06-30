# Tenant Evidence Lifecycle Runtime Record

## Purpose

This record documents the Sprint 5 tenant evidence lifecycle foundation. The objective is to make evidence retention, archive timing, export review, restore review, and lifecycle deletion tenant-scoped and human-approved.

## Runtime controls

- `tenant_evidence_lifecycle_policies` stores tenant-level evidence lifecycle policy records.
- `buildTenantEvidenceLifecyclePolicy` creates the runtime policy with tenant object prefix, backup prefix, retention period, archive timing, and mandatory human approval gates.
- `assertTenantEvidenceLifecycleObjectKey` reuses the Sprint 2 tenant object-storage boundary before lifecycle actions can proceed.
- `summarizeTenantEvidenceLifecycleGate` creates deterministic gate text for audit and operations records.

## Required authority

AI/n8n/service actors cannot approve tenant evidence export, restore, backup, lifecycle deletion, or lifecycle policy closure. Human approval evidence remains mandatory before execution.

## Data boundary

Tenant evidence lifecycle applies only inside `tenants/{tenant_slug}/{tenant_id}` object-storage prefixes. Frontend display, n8n workflow routing, and service orchestration cannot override backend tenant boundaries.
