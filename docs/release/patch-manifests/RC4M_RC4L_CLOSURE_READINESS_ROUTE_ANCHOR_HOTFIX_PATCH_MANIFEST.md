# RC4-M / RC4-L Closure Readiness Route Anchor Hotfix Patch Manifest

## Purpose

Restore the exact static route anchor expected by the RC4-L regression test while preserving the RC4-L runtime closure-readiness endpoint behavior.

## Files changed

- `apps/api/src/routes/work-orders.ts`
- `RC4M_RC4L_CLOSURE_READINESS_ROUTE_ANCHOR_HOTFIX_PATCH_MANIFEST.md`

## Governance notes

- Runtime behavior is unchanged.
- Work order closure readiness remains read-only for preview.
- Work order close still uses closure-readiness gates.
- Closed work orders remain locked from update/re-close.
- This patch is a compatibility anchor for static regression tests only.
