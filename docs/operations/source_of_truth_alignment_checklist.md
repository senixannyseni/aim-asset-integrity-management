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


## RC4-E Source-of-Truth Alignment

- [ ] RC4-E completes validation-by-asset UX, validation history visibility, and data dictionary expansion only.
- [ ] `apps/web/app/validation/page.tsx` exists.
- [ ] `apps/web/app/validation/history/page.tsx` exists.
- [ ] `apps/web/app/assets/[assetId]/validation/page.tsx` exists.
- [ ] `apps/web/app/data-dictionary/page.tsx` exists.
- [ ] Validation overview shows summary/status categories, latest runs, affected domains, and links to asset-specific validation.
- [ ] Asset validation page shows grouped checks, field-level messages, unit warnings/errors, material completeness visibility, evidence/NDT/calculation/report readiness where available, and related links.
- [ ] Validation history page is read-only and supports practical filters.
- [ ] Data dictionary page is searchable and grouped by domain.
- [ ] `03_Database/data_dictionary_current.md` is expanded for asset, evidence, NDT, validation, calculation, formula, review, report, and audit traceability.
- [ ] Validation may flag/warn/block/route to review but must not approve engineering data automatically.
- [ ] Frontend validation is UX-only and does not weaken backend validation.
- [ ] No new database tables are introduced by RC4-E.
- [ ] No new database migration is introduced by RC4-E.
- [ ] No new engineering formulas are introduced by RC4-E.
- [ ] RC4-E does not change runtime engineering calculation behavior.
- [ ] RC4-E does not introduce API 579/API 581/FFS/RBI formulas or FFS/RBI trigger logic.
- [ ] RC4-E does not change AI, n8n, approval, report, evidence upload, NDT import, or object-storage backend behavior.
- [ ] No governance boundaries are weakened.
- [ ] AIM remains the system of record.
- [ ] n8n remains orchestration-only and must not write directly to PostgreSQL.
- [ ] AI extraction remains staging-first and cannot bypass human review.
- [ ] Evidence linkage remains mandatory.


## RC4-F Source-of-Truth Alignment

- [ ] RC4-F synchronizes approved Formula Registry records to executable `formula_versions` only.
- [ ] Approved/locked human-governed Formula Registry records can synchronize to executable formula versions.
- [ ] Draft Formula Registry records cannot synchronize.
- [ ] Under-review Formula Registry records cannot synchronize.
- [ ] Rejected Formula Registry records cannot synchronize.
- [ ] Retired/deprecated Formula Registry records cannot synchronize.
- [ ] Superseded/inactive Formula Registry records cannot synchronize.
- [ ] Synchronization is idempotent and does not create duplicate executable `formula_versions` for the same approved registry/code/version.
- [ ] Formula approval triggers synchronization within the same governed operation.
- [ ] Explicit sync endpoint is restricted to human formula governors and uses `formula.approve` permission.
- [ ] AI, n8n, and service actors cannot approve or sync formulas to executable state.
- [ ] Sync success writes `FORMULA_SYNCED_TO_EXECUTABLE` audit logs.
- [ ] Sync failure writes `FORMULA_SYNC_FAILED` audit logs.
- [ ] Calculation execution checks `formula_versions`, not Formula Registry display state alone.
- [ ] Calculation execution rejects missing, draft, under-review, rejected, retired, superseded, inactive, or otherwise unapproved formula versions.
- [ ] Calculation run persists `formula_version_id` and `formula_version_snapshot_json`.
- [ ] Formula Registry UI shows sync status and executable formula_version_id where safe.
- [ ] No new database tables are introduced by RC4-F.
- [ ] No new database migration is introduced by RC4-F.
- [ ] No new engineering formulas are introduced by RC4-F.
- [ ] RC4-F does not change deterministic formula math outputs.
- [ ] RC4-F does not introduce API 579/API 581/FFS/RBI formulas or FFS/RBI trigger logic.
- [ ] RC4-F does not change AI, n8n, approval outside formula approval, report, evidence upload, NDT import, or object-storage behavior.
- [ ] No governance boundaries are weakened.
- [ ] AIM remains the system of record.
- [ ] n8n remains orchestration-only and must not write directly to PostgreSQL.
- [ ] AI extraction remains staging-first and cannot bypass human review.
- [ ] Evidence linkage remains mandatory.


## RC4-G Source-of-Truth Alignment

- [ ] RC4-G adds guided calculation UI and golden dataset fixtures only.
- [ ] `apps/web/app/calculations/page.tsx` exists or equivalent calculation overview route exists.
- [ ] `apps/web/app/calculations/[runId]/page.tsx` exists or equivalent calculation detail route exists.
- [ ] `apps/web/app/assets/[assetId]/calculations/page.tsx` exists.
- [ ] Guided calculation form shows asset, approved executable formula version, evidence, NDT, validation/readiness, and unit fields where supported.
- [ ] Formula selector uses approved executable `formula_versions` only.
- [ ] Draft, unapproved, rejected, retired, superseded, inactive, or unsynchronized Formula Registry records are not exposed for calculation execution.
- [ ] Calculation detail shows formula snapshot, input snapshot, output snapshot, warnings, blockers, evidence/NDT links, and audit link.
- [ ] Calculation comparison is display-only and does not infer engineering acceptability.
- [ ] Golden dataset fixtures use synthetic internal MVP data only.
- [ ] Golden dataset tests prove deterministic calculation output for existing MVP behavior.
- [ ] Calculation output remains deterministic, versioned, and auditable.
- [ ] Calculation results require engineering review before final use.
- [ ] No new database tables are introduced by RC4-G.
- [ ] No new database migration is introduced by RC4-G.
- [ ] No new engineering formulas are introduced by RC4-G.
- [ ] RC4-G does not change deterministic formula math outputs.
- [ ] RC4-G does not introduce API 579/API 581/FFS/RBI formulas or FFS/RBI trigger logic.
- [ ] RC4-G does not change AI, n8n, approval, report, evidence upload, NDT import, or object-storage behavior.
- [ ] No governance boundaries are weakened.
- [ ] AIM remains the system of record.
- [ ] n8n remains orchestration-only and must not write directly to PostgreSQL.
- [ ] AI extraction remains staging-first and cannot bypass human review.
- [ ] Evidence linkage remains mandatory.

## RC4-H Source-of-Truth Alignment

- [ ] RC4-H adds Findings / Anomaly foundation only.
- [ ] `db/migrations/0027_findings_anomaly_foundation.sql` exists and creates minimal findings/anomaly foundation.
- [ ] `apps/api/src/routes/findings.ts` exists and is mounted from `apps/api/src/app.ts`.
- [ ] Findings API supports list, detail, create, update, same-asset evidence link/unlink, and asset-scoped listing.
- [ ] Findings reject cross-asset evidence linkage.
- [ ] Findings reject cross-asset NDT linkage where NDT linkage is supplied.
- [ ] Findings reject cross-asset calculation linkage where calculation linkage is supplied.
- [ ] Finding create/update/link/unlink/status/close actions write audit logs.
- [ ] AI, n8n, and service actors cannot close or finalize findings.
- [ ] Closing a finding requires `closure_reason`.
- [ ] Critical finding closure requires evidence linkage.
- [ ] Finding closure does not approve calculations, approve engineering data, issue reports, create final integrity decisions, or create FFS/RBI cases.
- [ ] `/findings` exists or equivalent overview route exists.
- [ ] `/findings/[findingId]` exists or equivalent detail route exists.
- [ ] `/assets/[assetId]/findings` exists.
- [ ] Frontend shows evidence/NDT/calculation linkage markers and missing-evidence/critical warning states.
- [ ] OpenAPI documents findings endpoints.
- [ ] Data dictionary and ERD are updated because RC4-H adds a findings table.
- [ ] No engineering formulas are introduced by RC4-H.
- [ ] RC4-H does not change deterministic calculation behavior.
- [ ] RC4-H does not introduce API 579/API 581/FFS/RBI formulas or FFS/RBI case automation.
- [ ] RC4-H does not change AI, n8n, approval, report, evidence upload, NDT import, Formula Registry, or calculation engine behavior.
- [ ] No governance boundaries are weakened.
- [ ] AIM remains the system of record.
- [ ] n8n remains orchestration-only and must not write directly to PostgreSQL.
- [ ] AI extraction remains staging-first and cannot bypass human review.
- [ ] Evidence linkage remains mandatory for engineering findings and anomalies.

## RC4-I Source-of-Truth Alignment

- [ ] RC4-I adds RBI workflow detail/guided UI/completion behavior only.
- [ ] `/rbi` supports guided RBI case creation and no longer relies only on raw JSON payload entry.
- [ ] `/rbi/[caseId]` exists and shows case summary, trigger source, risk drivers, evidence links, source findings, placeholders, and audit link.
- [ ] RBI status update is non-final and remains separate from approve/export/close final actions.
- [ ] RBI review action writes `RBI_CASE_REVIEWED` audit event.
- [ ] RBI approve/export/close actions require human senior authority through backend RBAC.
- [ ] RBI close requires comment/reason.
- [ ] AI, n8n, and service actors cannot approve, export, close, or finalize RBI cases.
- [ ] Calculation-warning RBI trigger blocks duplicate open cases for the same calculation-run / trigger-rule / warning-signature.
- [ ] Repeated-anomaly RBI trigger uses RC4-H `findings` history and blocks duplicate open cases for the same asset / trigger-rule / finding-signature.
- [ ] Repeated-anomaly trigger requires at least two relevant active findings.
- [ ] Evidence links created from calculation/finding source rows pass same-asset validation.
- [ ] Risk matrix UI is labelled qualitative/semi-quantitative placeholder only.
- [ ] No quantitative API RP 581 probability/consequence formula is implemented.
- [ ] No new database migration is introduced by RC4-I.
- [ ] No deterministic calculation math is changed by RC4-I.
- [ ] RC4-I does not issue reports, approve calculations, create final integrity decisions, or create FFS cases.
- [ ] OpenAPI documents `from-finding-history`, `review`, `export`, and `close` RBI endpoints.
- [ ] Data dictionary and ERD explain the new trigger signatures without adding table columns.
- [ ] AIM remains the system of record.
- [ ] n8n remains orchestration-only and must not write directly to PostgreSQL.
- [ ] AI extraction remains staging-first and cannot bypass human review.
