# Governance Hardening Notes

This patch aligns the current Sprint 2 implementation before Sprint 3 is applied.

## What changed

- Added implemented-endpoint OpenAPI contract under `04_API/openapi.yaml`.
- Added payload examples for implemented asset, geometry, shell course, workflow event, and error log endpoints.
- Added current data dictionary and current ERD documentation.
- Added `workflow_events` and `error_logs` baseline tables and APIs.
- Centralized local dev RBAC headers in `apps/web/lib/api-client.ts`.
- Added governance tests for OpenAPI path consistency, NDT review/approval separation policy, evidence gate behavior, AI agent approval denial, and audit event coverage.

## Explicitly not implemented

- No engineering calculation.
- No API/ASME formula.
- No AI extraction.
- No report generation.
- No n8n direct DB integration.
- No functional NDT UI/API because Sprint 3 has not been applied yet.

## Boundary confirmation

AIM remains the system of record. n8n can only communicate through AIM backend APIs. AI output must remain staging-only when implemented. All future engineering approval endpoints must remain RBAC protected and auditable.
