# Sprint Status

| Sprint | Scope | Status |
|---:|---|---:|
| 0/1 | Foundation, monorepo, DB baseline, RBAC, health checks | Complete |
| 2 | Tank Asset Register and Engineering Master Data | Complete |
| Governance | AIM/n8n alignment hardening before Sprint 3 | Complete |
| 3 | Evidence Repository and NDT Data Room | Complete |
| 4 | Engineering Data Dictionary and Validation Engine | Complete |

## Boundary

AIM remains the system of record. n8n may call AIM APIs only. AI cannot approve. No API/ASME formula has been implemented.

## Sprint 5 — Formula Registry Module

Status: Implemented in Sprint 5 package.

- Controlled Formula Registry metadata and versioning added.
- Approval/deprecation/test-run placeholder APIs added.
- Formula Registry UI added at `/formulas`.
- No engineering calculation or API/ASME formula execution is implemented.
