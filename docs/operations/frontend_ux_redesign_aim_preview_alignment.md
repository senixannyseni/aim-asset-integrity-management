# Frontend UX Redesign — AIM Preview Alignment

## Scope

This package aligns the AIM web frontend with the uploaded AIM Preview reference while preserving the existing AIM governance architecture.

Included changes:

- App-wide AIM Preview shell with navy sidebar, compact topbar, grouped module navigation, session footer, and audit/workflow shortcuts.
- Restyled login page using the AIM Preview visual language while keeping real backend JWT login.
- Preview-aligned governance dashboard layout with KPI cards, review queues, governance boundary, and quick-access panels.
- New `/ai-photo-extraction` frontend UX workspace as a controlled preview-alignment page for future photo/artifact extraction integration.
- Global CSS tokens and component styles inspired by `AIM_Preview.html`.

## Governance Boundaries Preserved

- Database migration history is treated as release evidence. Already-tagged migration `0028` is restored to the MT Sprint 1 baseline. Migration `0029` contains only a narrow PostgreSQL compatibility correction for fresh database setup: it rewrites the `evidence_upload_sessions` tenant backfill to avoid PostgreSQL target-alias scope errors while preserving the Sprint 2 schema shape and avoiding trigger-disable logic. No frontend UX work is allowed to add new schema behavior or bypass governance controls.

- Frontend does not write directly to PostgreSQL, object storage, or n8n.
- Login continues to call the backend auth API through `loginToAim`.
- Dashboard data continues to come from `/api/v1/governance-dashboard/overview`.
- New AI Photo Extraction page is intentionally read-only/UX-oriented and does not create extraction jobs, approvals, promotions, report issue actions, or work orders.
- Approval, promotion, report issue, and engineering decisions remain backend-gated.

## Files Changed

- `apps/web/app/components/AimShell.tsx`
- `apps/web/app/layout.tsx`
- `apps/web/app/globals.css`
- `apps/web/app/login/page.tsx`
- `apps/web/app/dashboard/GovernanceDashboardClient.tsx`
- `apps/web/app/ai-photo-extraction/page.tsx`
- `docs/operations/frontend_ux_redesign_aim_preview_alignment.md`
- `docs/operations/frontend_ux_redesign_validation_fix.md`

## Validation Commands

Run from repository root:

```bash
pnpm --filter @aim/web typecheck
pnpm --filter @aim/web build
pnpm lint
pnpm test
```

For local visual verification:

```bash
pnpm dev
```

Open:

- `http://localhost:3000/login`
- `http://localhost:3000/dashboard`
- `http://localhost:3000/ai-photo-extraction`
- `http://localhost:3000/assets`
- `http://localhost:3000/reports`

## Manual Review Checklist

- Confirm login page has AIM Preview visual alignment and still uses real API authentication.
- Confirm sidebar appears on non-login routes and active navigation follows route changes.
- Confirm dashboard loads backend data when authenticated and shows a controlled error message when unauthenticated.
- Confirm existing pages remain reachable from the new sidebar, including `/data-dictionary`, `/validation`, and `/validation/history`.
- Confirm `/ai-photo-extraction` is clearly labelled as frontend UX alignment and does not expose unsafe mutation controls.
- Confirm responsive behavior at desktop and tablet widths.

## Follow-up Package Recommendation

Implement AI Photo Extraction as a real backend-backed module only after adding or confirming schema/API support for:

- extraction run records for visual/photo artifacts;
- extracted photo/artifact metadata;
- evidence source page/figure/table references;
- engineer review action, correction reason, rejection reason;
- linkage to findings, reports, and integrity decisions;
- audit events for every review/correction/link action.

## Database migration audit note

This frontend UX cleanup intentionally documents the final database-file state after review:

- `db/migrations/0028_enterprise_multitenant_sprint1_tenant_context.sql` is restored to the already-tagged MT Sprint 1 baseline and must not include broad `disable trigger user` statements.
- `db/migrations/0029_enterprise_multitenant_sprint2_route_filtering_object_boundary.sql` contains a narrow PostgreSQL-scope compatibility correction for the `evidence_upload_sessions` tenant backfill. The correction keeps the Sprint 2 schema shape, removes the invalid target-alias reference that caused fresh CI migration failure, and does not disable triggers.

Any future database behavior change must be implemented as a separate reviewed database package or a forward-only migration. Frontend UX alignment must not silently rewrite historical migrations or bypass backend governance controls.
