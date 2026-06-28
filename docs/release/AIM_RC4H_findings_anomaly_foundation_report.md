# AIM RC4-H Findings / Anomaly Foundation Release Report

## Package

RC4-H — Findings / Anomaly Foundation

## Status

Implemented as a scoped findings/anomaly foundation package.

## Scope Delivered

RC4-H establishes findings as traceable, evidence-linked engineering records that can be created, updated, reviewed, linked, and closed through governed human workflows.

Delivered components:

- Database migration `0027_findings_anomaly_foundation.sql` for the `findings` table and finding RBAC permissions.
- API route `apps/api/src/routes/findings.ts` for list, detail, create, update, asset-scoped list, same-asset evidence link, and evidence unlink.
- Frontend routes:
  - `/findings`
  - `/findings/[findingId]`
  - `/assets/[assetId]/findings`
- Safe contextual links from asset, evidence, NDT, and calculation screens.
- OpenAPI documentation for findings endpoints.
- Data dictionary and ERD updates for the new findings table.
- UAT coverage for create/list/detail/linkage/closure/governance checks.

## Governance Controls

RC4-H preserves AIM governance boundaries:

- Findings are engineering traceability records, not final engineering approvals.
- Findings may identify candidate concern areas but do not determine FFS, RBI, report issue readiness, or final integrity decisions.
- Cross-asset evidence/NDT/calculation linkage is rejected.
- Critical finding closure requires evidence linkage.
- Finding closure requires `closure_reason`.
- AI/n8n/service actors cannot close or finalize findings.
- Finding closure does not create FFS/RBI cases automatically.
- Finding closure does not approve calculations, issue reports, or create final integrity decisions.

## API Summary

New endpoints:

- `GET /api/v1/findings`
- `GET /api/v1/findings/{findingId}`
- `POST /api/v1/findings`
- `PATCH /api/v1/findings/{findingId}`
- `GET /api/v1/assets/{assetId}/findings`
- `POST /api/v1/findings/{findingId}/links/evidence`
- `DELETE /api/v1/findings/{findingId}/links/evidence/{evidenceFileId}`

## Audit Events

RC4-H writes or documents these audit events:

- `finding.created`
- `finding.updated`
- `finding.status_changed`
- `finding.evidence_linked`
- `finding.evidence_unlinked`
- `finding.closed`
- `finding.close_blocked`
- `finding.cross_asset_link_blocked`

## Out of Scope Confirmed

RC4-H does not implement:

- FFS case workflow.
- RBI case workflow.
- Automatic FFS/RBI case creation.
- Integrity decision workflow.
- Report builder changes.
- Engineering approval workflow redesign.
- Calculation engine changes.
- Formula Registry changes.
- Evidence upload changes.
- NDT import changes.
- Validation-by-asset redesign.
- n8n webhook integration.
- AI staging promotion handlers.
- New engineering formulas.
- API/ASME/API 579/API 581/FFS/RBI calculation content.
- Direct n8n database access.

## Acceptance

RC4-H is ready for review when lint, typecheck, full tests, and targeted findings/governance tests pass in the local repository.
