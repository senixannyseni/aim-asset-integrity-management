# AIM RC4-I RBI Workflow Detail, Guided UI, and Duplicate Prevention Report

## Status

Implemented.

## Scope

RC4-I implements Future Fix items 51–57 for the RBI workflow:

1. RBI case detail page: `/rbi/[caseId]`.
2. Guided RBI input form replacing JSON-only manual entry.
3. Frontend actions for status update, review, approve, export, and close with RBAC-aware visibility.
4. Repeated-anomaly trigger connection to the real RC4-H findings/anomaly history module.
5. Duplicate-prevention logic for repeated RBI triggers from the same calculation warning signature and same finding-history signature.
6. Integration/static regression coverage for calculation warning → RBI case → review → senior/lead-engineer approval/export/close workflow.
7. Richer placeholder/semi-quantitative risk matrix visualization.

## Changed Files

- `apps/api/src/routes/rbi.ts`
- `apps/web/app/rbi/RbiInterfaceClient.tsx`
- `apps/web/app/rbi/[caseId]/page.tsx`
- `apps/web/app/rbi/[caseId]/RbiCaseDetailClient.tsx`
- `apps/web/app/globals.css`
- `apps/api/tests/rc4-i-rbi-workflow-detail-guided-ui.test.ts`
- `04_API/openapi.yaml`
- `04_API/api_payload_examples/create_rbi_case_from_finding_history.json`
- `03_Database/data_dictionary_current.md`
- `docs/erd_current.md`
- `docs/sprint-status.md`
- `docs/operations/source_of_truth_alignment_checklist.md`
- `docs/uat/uat_rc4i_rbi_workflow_detail_guided_ui.md`
- `README.md`

## Backend Controls

### Repeated calculation-warning duplicate prevention

`POST /api/v1/rbi/cases/from-calculation` now derives a `source_warning_signature` from configured RBI warning codes and blocks duplicate open cases for the same calculation run, trigger rule, and warning signature.

Duplicate response code:

```text
RBI_DUPLICATE_TRIGGER_BLOCKED
```

### Repeated finding-history trigger

`POST /api/v1/rbi/cases/from-finding-history` creates an RBI interface case from the RC4-H findings/anomaly module when at least two relevant active findings exist for the asset/component scope.

The case stores:

- `trigger_source = finding_history`
- `trigger_rule_id = RBI-TRIG-REPEATED-ANOMALY`
- `input_placeholders.source_module = findings_anomaly_history`
- `input_placeholders.source_findings`
- `input_placeholders.source_finding_signature`

### Review/finalization endpoints

- `POST /api/v1/rbi/cases/{caseId}/review`
- `POST /api/v1/rbi/cases/{caseId}/export`
- `POST /api/v1/rbi/cases/{caseId}/close`

Existing approval endpoint remains:

- `POST /api/v1/rbi/cases/{caseId}/approve`

Close requires a comment/reason. AI actors are blocked from approve/export/close/finalization. Senior/lead-engineer/admin finalization authority is enforced in the backend. Approval requires recorded human review and `ready_for_review` status. Export and close require prior approval, and `/approve` cannot be used to export or close a case.

## Frontend Controls

- `/rbi` now provides guided manual creation fields.
- `/rbi` includes calculation-warning and finding-history trigger forms.
- `/rbi` includes a display-only risk matrix labelled placeholder/semi-quantitative.
- `/rbi/[caseId]` shows case summary, risk drivers, evidence links, source findings, placeholders, audit link, and workflow actions.
- Buttons are hidden/disabled based on user permissions from `/api/v1/auth/me`; backend RBAC remains authoritative.

## Governance Boundaries

RC4-I does **not** implement:

- quantitative API RP 581 formulas;
- proprietary probability/consequence equations;
- automatic final integrity decisions;
- report issuance automation;
- calculation approval automation;
- FFS case creation;
- direct n8n/database writes;
- AI approval or service actor finalization.

## RC4-I hardening follow-up

The second RC4-I cleanup patch hardens finalization gates and DB-backed RBAC alignment:

- `lead_engineer` receives the same RBI approve/export DB seed and migration permissions already reflected in static RBAC.
- `/approve` approves only and rejects `status=exported` or `status=closed`.
- `/export` requires prior approval and `rbi.interface.export`.
- `/close` requires prior approval plus closure comment/reason.
- `approved_at` is written only for actual approval, not export or close.
- RBI case UUID/text lookup and asset UUID validation are hardened to avoid DB type errors.

## Validation

Expected commands in a repository with dependencies installed:

```bash
pnpm --filter @aim/api test -- rc4-i-rbi-workflow-detail-guided-ui.test.ts
pnpm --filter @aim/api test -- rbi-workflow.test.ts
pnpm -r lint
```

## Release Decision

RC4-I is ready for code review and UAT execution after applying the changed files and running the validation commands in the developer environment.
