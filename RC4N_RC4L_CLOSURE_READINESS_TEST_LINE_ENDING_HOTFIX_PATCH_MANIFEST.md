# RC4-N / RC4-L Closure Readiness Test Line Ending Hotfix Patch Manifest

## Patch
RC4-N compatibility hotfix for the existing RC4-L static regression test.

## Purpose
The RC4-L test checked the `work-orders.ts` closure-readiness route using an exact LF-only multiline source substring. On Windows, the working tree may contain CRLF line endings, causing the static assertion to fail even though the runtime route exists and behavior is unchanged.

## Changed Files
- `apps/api/tests/rc4-l-work-order-detail-closure-readiness.test.ts`

## Behavior
- Normalizes CRLF to LF only for the route-anchor assertion.
- Does not alter runtime application code.
- Does not weaken closure-readiness governance.
- Does not change work-order close behavior.

## Validation
Run:

```powershell
pnpm --filter @aim/api test -- rc4-l-work-order-detail-closure-readiness.test.ts
pnpm --filter @aim/api test -- rc4-n-integrity-decision-detail-readiness.test.ts
pnpm -r lint
pnpm -r test
```
