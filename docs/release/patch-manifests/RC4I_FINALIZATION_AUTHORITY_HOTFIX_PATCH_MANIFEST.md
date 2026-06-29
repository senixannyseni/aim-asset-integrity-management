# RC4-I Finalization Authority Hotfix Patch Manifest

## Patch ID

RC4-I-HOTFIX-FINALIZATION-AUTHORITY

## Purpose

Fixes the RC4-I RBI finalization authority mismatch where `lead_engineer` had `rbi.interface.approve` and `rbi.interface.export` permissions, but the backend finalization guard only accepted `admin` and `senior_engineer` roles.

## Scope

- Allow `lead_engineer` in the RBI backend finalization authority guard when the route-level RBAC permission has already passed.
- Keep AI actor finalization blocked.
- Preserve route-level permission enforcement for approve/export/close endpoints.
- Update RC4-I regression/static test coverage to assert `lead_engineer` approve/export permission and backend guard alignment.
- Update RC4-I OpenAPI, UAT, release, data dictionary, and manifest text to reflect Senior Engineer / Lead Engineer / Admin finalization authority.

## Changed Files

```text
03_Database/data_dictionary_current.md
04_API/openapi.yaml
RC4I_RBI_WORKFLOW_DETAIL_GUIDED_UI_PATCH_MANIFEST.md
RC4I_FINALIZATION_AUTHORITY_HOTFIX_PATCH_MANIFEST.md
apps/api/src/routes/rbi.ts
apps/api/tests/rc4-i-rbi-workflow-detail-guided-ui.test.ts
docs/release/AIM_RC4I_rbi_workflow_detail_guided_ui_report.md
docs/uat/uat_rc4i_rbi_workflow_detail_guided_ui.md
```

## Governance Boundary

This hotfix does not add quantitative API RP 581 formulas, calculation math, report issuance automation, final integrity decision automation, direct n8n/database writes, or AI approval/finalization capability.

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
- Changed TypeScript/TSX files passed TypeScript transpileModule syntax checks.
- Confirmed no ZIP files or implementation guide files are included in this patch package.
```

## Ready-to-Copy PR Text

Title:

```text
fix(rc4-i): align RBI finalization authority with lead engineer RBAC
```

Body:

```markdown
## Summary

Fixes RC4-I RBI finalization authority alignment:

- Allows `lead_engineer` in the backend RBI finalization guard after route-level RBAC permission passes.
- Keeps `ai_agent` blocked from approve/export/close/finalization.
- Preserves `rbi.interface.approve` and `rbi.interface.export` permission checks.
- Updates RC4-I regression/static coverage and documentation to reflect Senior Engineer / Lead Engineer / Admin finalization authority.

## Governance

- No quantitative API RP 581 formulas are implemented.
- No calculation math is changed.
- No report issuance or integrity decision automation is introduced.
- AI/n8n/service actors remain unable to approve, export, close, or finalize RBI cases.

## Validation

- OpenAPI YAML parsed successfully.
- Changed TypeScript/TSX files passed syntax transpilation checks.
- Run in dev environment:
  - `pnpm --filter @aim/api test -- rc4-i-rbi-workflow-detail-guided-ui.test.ts`
  - `pnpm --filter @aim/api test -- rbi-workflow.test.ts`
  - `pnpm -r lint`
  - `pnpm -r test`
```

## After-Merge Checklist

```bash
pnpm install
pnpm --filter @aim/api test -- rc4-i-rbi-workflow-detail-guided-ui.test.ts
pnpm --filter @aim/api test -- rbi-workflow.test.ts
pnpm -r lint
pnpm -r test
git status --short
```

Checklist:

- [ ] Confirm `lead_engineer` can approve RBI case when holding `rbi.interface.approve`.
- [ ] Confirm `lead_engineer` can export RBI case when holding `rbi.interface.export`.
- [ ] Confirm `ai_agent` remains blocked from RBI approve/export/close/finalization.
- [ ] Confirm no untracked ZIP/package files are committed.
