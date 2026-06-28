# RC4-J Review Context Source Lint Hotfix Patch Manifest

## Scope

Small TypeScript lint hotfix for RC4-J after approval context source hardening.

## Files changed

- `apps/api/src/routes/engineering-reviews.ts`

## Fix

- Removes duplicate block-scoped `expectedCalculationRunId` declaration in the approval-record creation route.
- Preserves the intended source-of-truth behavior: approval calculation context is derived from the linked engineering review first, then resolved entity context only as fallback.

## Validation

Run locally:

```powershell
pnpm --filter @aim/api test -- rc4-j-engineering-review-approval-ui.test.ts
pnpm --filter @aim/api test -- engineering-review-approval.test.ts
pnpm -r lint
pnpm -r test
```
