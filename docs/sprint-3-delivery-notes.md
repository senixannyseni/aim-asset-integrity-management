# Sprint 3 Delivery Notes — Evidence Repository and NDT Data Room

## What Changed

Sprint 3 implements the AIM Evidence Repository and NDT Data Room on top of the hardened governance baseline.

Implemented:

- Evidence metadata registration API and UI.
- Evidence object-storage-compatible path convention.
- Evidence link API with implemented-entity validation.
- Evidence viewer panel with Open Evidence link.
- NDT measurement data model.
- Manual NDT measurement entry.
- Bulk NDT measurement import API.
- NDT review and approval separation.
- Evidence approval gate for critical NDT records.
- Audit events for evidence and NDT actions.

## AIM/n8n Boundary Confirmation

- AIM remains the system of record.
- Original evidence files remain in object storage; this sprint stores metadata and object path only.
- n8n is not integrated directly and must use AIM APIs only in later sprints.
- AI extraction runtime is not implemented.
- No engineering calculation, report generation, or API/ASME formula implementation is included.

## Required Commands

```powershell
pnpm db:migrate
pnpm db:seed
pnpm lint
pnpm typecheck
pnpm test
pnpm dev
```

## Acceptance Criteria Status

| Criterion | Status |
|---|---:|
| Evidence files can be uploaded/registered and linked | Implemented |
| NDT measurement can be manually entered | Implemented |
| NDT measurement can be bulk imported | Implemented API |
| Evidence link is visible from measurement detail | Implemented in API/UI as evidence state |
| Missing evidence creates blocking/warning rule | Implemented |
| Critical NDT approval blocked without evidence | Implemented |

## Known MVP Limitation

Binary file upload/presigned URL generation is not yet implemented. Evidence registration uses metadata and object-storage-compatible path convention. This preserves the AIM/object-storage boundary while avoiding premature storage implementation.
