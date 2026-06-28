# Source-of-Truth Alignment Checklist

## Purpose

Confirm that the RC3 release candidate remains aligned with the AIM source-of-truth package before final go/no-go.

## RC3-J Source-of-Truth Alignment

- [ ] README status confirms RC3-A through RC3-J are implemented as scoped hardening packages.
- [ ] Sprint status confirms RC3-J Final UAT / Release Candidate Closure & Production Operations Readiness.
- [ ] UAT master index references RC3-B through RC3-I and the final end-to-end UAT scenario.
- [ ] Release candidate closure report summarizes RC3-A through RC3-I completion.
- [ ] Production deployment checklist references PostgreSQL, object storage, RBAC, audit logging, backup, smoke tests, and rollback.
- [ ] Environment validation checklist confirms API base URL, frontend base URL, PostgreSQL connection, object storage policy, JWT secret presence, CORS policy, file size/MIME policy, audit logging, and n8n API-only boundary.
- [ ] Backup/restore runbook confirms PostgreSQL backup, PostgreSQL restore validation, object storage backup/export verification, checksum verification, and evidence/report artifact restore considerations.
- [ ] Smoke test checklist confirms login, RBAC menu visibility, evidence flow, AI staging review, report gate behavior, audit log view, admin governance, governance dashboard, workflow console, NDT data room, and go-live readiness.
- [ ] Security/governance checklist confirms RBAC, SoD, AI/n8n/service actor restrictions, audit immutability, secret redaction, object storage policy, report issue gates, evidence linkage, backup/restore, and n8n direct DB write prohibition.
- [ ] No new API route is introduced by RC3-J.
- [ ] No new frontend page is introduced by RC3-J.
- [ ] No new database migration is introduced by RC3-J.
- [ ] No new database table is introduced by RC3-J.
- [ ] No new runtime behavior is introduced by RC3-J.
- [ ] No API 579/API 581/FFS/RBI formula implementation is introduced by RC3-J.
- [ ] AI extraction remains staging-only.
- [ ] Engineer/human review remains mandatory.
- [ ] Evidence linkage remains mandatory.
- [ ] n8n remains orchestration-only and must not write directly to PostgreSQL.
- [ ] AIM remains the system of record.

## RC4-A Source-of-Truth Alignment

- [ ] RC4-A is documentation/test polish for Sprint 0 foundation closure only.
- [ ] Health endpoint tests were added in `apps/api/tests/health.test.ts`.
- [ ] Sprint 0 closure checklist was added in `docs/release/sprint0_foundation_closure_checklist.md`.
- [ ] Sprint 0 “no calculation yet” criterion is documented as historical and superseded by later governed deterministic calculation modules.
- [ ] Role evolution is documented without adding new roles or permissions.
- [ ] Seed idempotency behavior and harmless append-only audit seed entries are documented.
- [ ] No new API routes are introduced by RC4-A.
- [ ] No new frontend routes are introduced by RC4-A.
- [ ] No new database tables are introduced by RC4-A.
- [ ] No new database migration is introduced by RC4-A.
- [ ] No new engineering formulas are introduced by RC4-A.
- [ ] RC4-A does not change runtime engineering calculation behavior.
- [ ] RC4-A does not change AI, n8n, approval, report, FFS, RBI, NDT, evidence, or object-storage behavior.
- [ ] No governance boundaries are weakened.
- [ ] AIM remains the system of record.
- [ ] n8n remains orchestration-only and must not write directly to PostgreSQL.
- [ ] AI extraction remains staging-first and cannot bypass human review.
- [ ] Evidence linkage remains mandatory.


## RC4-B Source-of-Truth Alignment

- [ ] RC4-B completes the Tank Asset Register frontend only.
- [ ] `apps/web/app/assets/page.tsx` exists.
- [ ] `apps/web/app/assets/[assetId]/page.tsx` exists.
- [ ] Asset list/table, create tank asset form, search/filter, operating status, inspection due date, loading, empty, error, and permission-denied states are available.
- [ ] Asset detail/edit, tank geometry input, shell-course editor, material selector, related links, audit-log link, evidence link, NDT link, calculation link, and report link are available.
- [ ] Missing code edition, diameter, shell height, material, and joint efficiency are clearly flagged in the UI.
- [ ] Frontend validation is UX-only and does not weaken backend validation.
- [ ] Existing backend APIs are used; no duplicate asset data model is introduced.
- [ ] No new API routes are introduced by RC4-B.
- [ ] No new database tables are introduced by RC4-B.
- [ ] No new database migration is introduced by RC4-B.
- [ ] No new engineering formulas are introduced by RC4-B.
- [ ] RC4-B does not change runtime engineering calculation behavior.
- [ ] RC4-B does not change AI, n8n, approval, report, FFS, RBI, NDT, evidence, or object-storage behavior.
- [ ] No governance boundaries are weakened.
- [ ] AIM remains the system of record.
- [ ] n8n remains orchestration-only and must not write directly to PostgreSQL.
- [ ] AI extraction remains staging-first and cannot bypass human review.
- [ ] Evidence linkage remains mandatory.


## RC4-C Source-of-Truth Alignment

- [ ] RC4-C completes the Evidence Repository upload/detail frontend only.
- [ ] `apps/web/app/evidence/page.tsx` exists.
- [ ] `apps/web/app/evidence/[evidenceId]/page.tsx` exists.
- [ ] Evidence list/table, metadata summary, asset filter, inspection/event filter, method/component/location display, upload status, malware scan status, checksum, loading, empty, error, and permission-denied states are available.
- [ ] Evidence upload UI uses the existing object-storage upload-url and complete-upload flow.
- [ ] File picker, file name, file size, MIME type, extension, client-side validation feedback, upload progress, upload status, checksum, and complete-upload confirmation are available.
- [ ] Evidence detail page shows metadata, object-storage status, upload status, malware status, checksum, file size, MIME type, asset/inspection context, linkage, safe preview, and audit link.
- [ ] Preview/open/download is blocked for infected, blocked, quarantined, scan-failed, deleted, or delete-requested evidence.
- [ ] Raw object keys, signed URLs, tokens, and secrets are not displayed.
- [ ] Frontend validation is UX-only and does not weaken backend validation.
- [ ] Existing backend APIs are used; no duplicate evidence object-storage logic is introduced.
- [ ] No new API routes are introduced by RC4-C.
- [ ] No new database tables are introduced by RC4-C.
- [ ] No new database migration is introduced by RC4-C.
- [ ] No new engineering formulas are introduced by RC4-C.
- [ ] RC4-C does not change runtime engineering calculation behavior.
- [ ] RC4-C does not change AI, n8n, approval, report, FFS, RBI, NDT, or object-storage backend behavior.
- [ ] No governance boundaries are weakened.
- [ ] AIM remains the system of record.
- [ ] n8n remains orchestration-only and must not write directly to PostgreSQL.
- [ ] AI extraction remains staging-first and cannot bypass human review.
- [ ] Evidence linkage remains mandatory.

## RC4-D Source-of-Truth Alignment

- [ ] RC4-D completes the NDT bulk import and measurement detail frontend only.
- [ ] `apps/web/app/ndt/page.tsx` exists.
- [ ] `apps/web/app/ndt/[measurementId]/page.tsx` exists.
- [ ] `apps/web/app/assets/[assetId]/ndt/page.tsx` exists.
- [ ] NDT list/table, manual entry, bulk import panel, row preview, row-level validation, import summary, filters, and CSV export are available.
- [ ] Asset-scoped NDT page filters measurements to the selected asset and pre-fills/validates asset context for manual entry and bulk import.
- [ ] NDT measurement detail shows metadata, asset link, inspection/event reference, component/course/grid/elevation/orientation, measured thickness with unit, method, confidence, extraction source, reviewer status, validation status, evidence linkage, missing-evidence state, calculation input link, and audit link.
- [ ] NDT visualization is display-only and uses stored measurement values, existing validation statuses, and existing evidence gate outputs only.
- [ ] Evidence links route to `/evidence/{evidenceFileId}` and do not expose raw object keys, signed URLs, tokens, secrets, or raw evidence contents.
- [ ] Frontend validation is UX-only and does not weaken backend validation.
- [ ] Existing backend APIs are used; no duplicate NDT data model is introduced.
- [ ] No new API routes are introduced by RC4-D.
- [ ] No new database tables are introduced by RC4-D.
- [ ] No new database migration is introduced by RC4-D.
- [ ] No new engineering formulas are introduced by RC4-D.
- [ ] RC4-D does not change runtime engineering calculation behavior.
- [ ] RC4-D does not introduce API 579/API 581/FFS/RBI formulas or FFS/RBI trigger logic.
- [ ] RC4-D does not change AI, n8n, approval, report, evidence upload, or object-storage backend behavior.
- [ ] No governance boundaries are weakened.
- [ ] AIM remains the system of record.
- [ ] n8n remains orchestration-only and must not write directly to PostgreSQL.
- [ ] AI extraction remains staging-first and cannot bypass human review.
- [ ] Evidence linkage remains mandatory.

