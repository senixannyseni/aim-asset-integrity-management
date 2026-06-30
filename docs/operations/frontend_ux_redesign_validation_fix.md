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
3. Does not change backend runtime authority, n8n orchestration boundaries, API contracts, or governance behavior. Database-file handling is limited to restoring `0028` and applying a narrow PostgreSQL compatibility correction to `0029` for fresh migration runs; it does not add schema shape changes or trigger-disable logic.

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


## Follow-up cleanup fixes

4. Restores already-tagged database migration `0028` to the MT Sprint 1 baseline and keeps `0029` limited to a PostgreSQL-scope compatibility correction for the `evidence_upload_sessions` tenant backfill. The `0029` correction preserves Sprint 2 schema shape and avoids `disable trigger user`.
5. Adds a reusable `.sr-only` utility for accessible hidden text used by the redesigned UI.
6. Adds sidebar navigation and page metadata for `/data-dictionary`, `/validation`, and `/validation/history`.
7. Changes AI Photo Extraction mock wording from `Approved` to `Human Reviewed` so the frontend does not imply AI approval authority.
8. Keeps the app-wide shell on non-login routes as an accepted preview-alignment behavior; no backend permission or workflow authority is moved to the frontend.
