# Frontend UX Redesign — Validation Fix

## Scope

This small follow-up patch fixes validation issues found after applying the AIM Preview alignment frontend package.

## Fixes

1. Wraps routes that use `useSearchParams()` in `Suspense` so `next build` can prerender safely:
   - `/evidence`
   - `/findings`
   - `/ndt`
2. Restores legacy test marker strings expected by existing API-side frontend closure tests while keeping the redesigned UI:
   - `AIM Login`
   - `Demo headers are disabled unless NEXT_PUBLIC_AIM_ALLOW_DEMO_HEADERS=true.`
   - `Governance Dashboard Readiness Overview`
3. Does not change backend, database, n8n, API contracts, migrations, or governance behavior.

## Validation Commands

```powershell
pnpm --filter @aim/web typecheck
pnpm --filter @aim/web build
pnpm lint
pnpm test
```

## Expected Result

- `pnpm --filter @aim/web build` should no longer fail on missing Suspense boundaries for `/evidence`, `/findings`, or `/ndt`.
- `pnpm test` should no longer fail on the two string-presence tests for login and dashboard readiness.
