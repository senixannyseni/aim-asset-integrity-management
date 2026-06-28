# RC4-I RBI Workflow Detail, Guided UI, and Duplicate Prevention Patch Manifest

## Patch ID

RC4-I

## Scope

Implements RBI workflow Future Fix items 51–57:

- RBI case detail page `/rbi/[caseId]`.
- Guided RBI input form replacing JSON-only manual entry.
- Frontend actions for status update, review, approve, export, and close with RBAC-aware visibility.
- Repeated-anomaly RBI trigger from RC4-H findings/anomaly history.
- Duplicate prevention for repeated RBI triggers from the same calculation warning/finding-history signatures.
- Regression/static test coverage.
- Placeholder/semi-quantitative risk matrix visualization.

## Changed Files

```text
03_Database/data_dictionary_current.md
04_API/api_payload_examples/create_rbi_case_from_finding_history.json
04_API/openapi.yaml
README.md
apps/api/src/routes/rbi.ts
apps/api/tests/rc4-i-rbi-workflow-detail-guided-ui.test.ts
apps/web/app/globals.css
apps/web/app/rbi/RbiInterfaceClient.tsx
apps/web/app/rbi/[caseId]/RbiCaseDetailClient.tsx
apps/web/app/rbi/[caseId]/page.tsx
docs/erd_current.md
docs/operations/source_of_truth_alignment_checklist.md
docs/release/AIM_RC4I_rbi_workflow_detail_guided_ui_report.md
docs/sprint-status.md
docs/uat/uat_rc4i_rbi_workflow_detail_guided_ui.md
RC4I_RBI_WORKFLOW_DETAIL_GUIDED_UI_PATCH_MANIFEST.md
```

## Implementation Guide

1. Extract the changed-files-only package at the repository root.
2. Copy/overwrite the files into the same relative paths.
3. Do not copy the ZIP itself into the repository.
4. Run validation commands in an environment with dependencies installed.
5. Review changed files and commit only intended source/docs files.

## Validation Commands

```bash
pnpm --filter @aim/api test -- rc4-i-rbi-workflow-detail-guided-ui.test.ts
pnpm --filter @aim/api test -- rbi-workflow.test.ts
pnpm -r lint
pnpm -r test
```

## Manual Validation Performed In This Environment

```text
- OpenAPI YAML parsed successfully with PyYAML.
- TypeScript/TSX changed-file syntax checked with TypeScript transpileModule.
```

Full repository test/lint was not run here because the sandbox does not include installed `node_modules` or `pnpm`.

## Governance Boundary

RC4-I introduces no quantitative API RP 581 formulas, no deterministic calculation math changes, no report issuance automation, no final integrity decision automation, no FFS case creation, no direct n8n/database writes, and no AI approval/finalization path.

## Ready-to-Copy PR Text

Title:

```text
feat(rc4-i): complete RBI workflow detail and guided UI
```

Body:

```markdown
## Summary

Implements RC4-I RBI workflow completion:

- Adds guided RBI case creation on `/rbi`.
- Adds `/rbi/[caseId]` detail page with status, review, approve, export, and close actions.
- Adds repeated-anomaly RBI trigger from RC4-H findings/anomaly history.
- Adds duplicate prevention for repeated calculation-warning and finding-history trigger signatures.
- Adds OpenAPI, data dictionary, ERD, release, UAT, README, and source-of-truth documentation updates.
- Adds RC4-I regression/static test coverage.

## Governance

- No quantitative API RP 581 formulas are implemented.
- No deterministic calculation math is changed.
- No final integrity decision, report issue, or FFS case is created automatically.
- AI/n8n/service actors remain unable to approve, export, close, or finalize RBI cases.
- AIM remains the system of record.

## Validation

- OpenAPI YAML parsed successfully.
- Changed TypeScript/TSX files passed syntax transpilation checks.
- RC4-I hotfix confirms `lead_engineer` is accepted by the backend finalization guard when the role has `rbi.interface.approve` / `rbi.interface.export`.
- RC4-I cleanup aligns DB migration/seed RBI finalization permissions with `lead_engineer`, enforces review-before-approval, forces export/close through dedicated endpoints, and prevents export/close from populating `approved_at`.
- RC4-I status-update cleanup prevents generic status updates from setting `ready_for_review` or writing `reviewed_at`; the dedicated review endpoint is required for approval readiness.
- To run in dev environment:
  - `pnpm --filter @aim/api test -- rc4-i-rbi-workflow-detail-guided-ui.test.ts`
  - `pnpm --filter @aim/api test -- rbi-workflow.test.ts`
  - `pnpm -r lint`
  - `pnpm -r test`
```

## After-Merge Commands / Checklist

```bash
pnpm install
pnpm --filter @aim/api test -- rc4-i-rbi-workflow-detail-guided-ui.test.ts
pnpm --filter @aim/api test -- rbi-workflow.test.ts
pnpm -r lint
pnpm -r test
git status --short
```

Checklist:

- [ ] Confirm `/rbi` guided form loads.
- [ ] Confirm `/rbi/[caseId]` detail page loads using a user-facing `case_id`.
- [ ] Confirm duplicate calculation-warning trigger returns duplicate block for repeated submission.
- [ ] Confirm repeated finding-history trigger requires at least two relevant active findings.
- [ ] Confirm Senior Engineer/Lead Engineer/Admin can approve after review, export after approval, and close after approval/export.
- [ ] Confirm `/approve` cannot be used for export or close.
- [ ] Confirm close without comment is rejected.
- [ ] Confirm AI/service actor cannot approve/export/close.
- [ ] Confirm no untracked ZIP/package files are committed.
