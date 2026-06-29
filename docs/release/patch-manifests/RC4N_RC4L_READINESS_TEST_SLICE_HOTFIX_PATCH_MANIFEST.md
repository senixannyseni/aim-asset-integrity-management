# RC4-N / RC4-L Readiness Test Slice Hotfix Patch Manifest

## Purpose
Fixes a Windows line-ending-sensitive static regression assertion in `rc4-l-work-order-detail-closure-readiness.test.ts` that was slicing `work-orders.ts` with the raw CRLF source string.

## Scope
- Test-only compatibility hotfix.
- Uses the already-normalized LF-only route source for the readiness-route slice.
- Does not change runtime API behavior.
- Does not modify work-order closure readiness enforcement.
- Does not modify RC4-N integrity decision functionality.

## Changed files
- `apps/api/tests/rc4-l-work-order-detail-closure-readiness.test.ts`

## Expected validation
Run:

```powershell
pnpm --filter @aim/api test -- rc4-l-work-order-detail-closure-readiness.test.ts
pnpm --filter @aim/api test -- rc4-n-integrity-decision-detail-readiness.test.ts
pnpm -r lint
pnpm -r test
```

## Governance note
This hotfix only stabilizes a static regression test across LF/CRLF environments. Runtime governance remains backend-authoritative.
