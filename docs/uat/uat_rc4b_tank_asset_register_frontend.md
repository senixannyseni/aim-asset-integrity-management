# UAT — RC4-B Tank Asset Register Frontend Completion

## Package

`RC4-B — Tank Asset Register Frontend Completion`

## Objective

Verify that users can view, create, and maintain Tank Asset Register frontend data using existing AIM backend APIs while preserving AIM governance boundaries.

## Preconditions

- RC3-A through RC3-J are merged, tagged, and closed.
- RC4-A is merged and tagged.
- Database migrations and seeds have been run.
- Backend API is running.
- Frontend app is running.
- Test user has asset read/update/create permissions according to the current RBAC setup.

## UAT-01 — Asset List Page Loads

| Item | Expected Result |
|---|---|
| Open `/assets` | Tank Asset Register page loads. |
| Observe table | Table exposes asset ID, tank tag, asset name, facility, location, service fluid, tank type, construction year, codes, code edition, owner, operating status, and inspection due date. |
| Observe state handling | Loading, empty, error, and permission-denied states are available. |
| Governance check | No evidence contents, signed URLs, object keys, formulas, or final engineering decisions are exposed. |

## UAT-02 — Asset Create Form

| Step | Expected Result |
|---|---|
| Submit empty create form | UI flags required fields including tank tag, asset name, code edition, construction year, and inspection due date. |
| Enter invalid construction year | UI flags invalid construction year. |
| Enter invalid/missing inspection due date | UI flags invalid inspection due date. |
| Enter valid asset data and submit | Asset is created through existing backend API. |
| Refresh `/assets` | Created asset appears in list. |

## UAT-03 — Asset Detail Page

| Step | Expected Result |
|---|---|
| Open `/assets/{assetId}` | Asset detail page loads summary and edit form. |
| Edit asset fields | Fields include tank tag, asset name, facility, location, service fluid, tank type, construction year, design/assessment codes, code edition, owner, operating status, and inspection due date. |
| Submit missing code edition | UI flags missing code edition. |
| Submit valid changes | Asset is updated through existing backend API. |

## UAT-04 — Tank Geometry Form

| Step | Expected Result |
|---|---|
| Open asset detail page | Geometry form is visible. |
| Submit missing diameter | UI flags missing diameter. |
| Submit missing shell height | UI flags missing shell height. |
| Submit invalid number of courses | UI flags invalid number of courses. |
| Submit invalid numeric range | UI flags invalid numeric range. |
| Submit valid geometry | Geometry is saved through existing backend API. |
| Governance check | No calculation is executed by the geometry form. |

## UAT-05 — Shell-Course Table Editor

| Step | Expected Result |
|---|---|
| Open asset detail page | Shell-course table editor is visible. |
| Add shell course with missing material | UI flags missing material. |
| Add shell course with missing joint efficiency | UI flags missing/invalid joint efficiency. |
| Add shell course with missing course height or nominal thickness | UI flags missing required shell-course fields. |
| Submit valid shell-course row | Shell course is created through existing backend API. |
| Edit existing shell course | Shell course updates through existing backend API. |
| Delete existing shell course | Shell course delete action succeeds only through existing backend-supported endpoint. |

## UAT-06 — Material Master Selector

| Step | Expected Result |
|---|---|
| Open shell-course form | Material selector loads active material options from backend. |
| Review material labels | Material code, name, and specification are clear. |
| Select material and submit shell-course form | Selected material ID is sent to backend. |
| Governance check | RC4-B does not create new material records unless existing API supports it. |

## UAT-07 — Related Links and Audit Link

| Link | Expected Result |
|---|---|
| Audit logs | Opens `/audit-logs?entity_type=asset&entity_id={assetId}` or closest supported route. |
| Evidence | Opens `/evidence?asset_id={assetId}` or closest supported route. |
| NDT | Opens `/ndt?asset_id={assetId}` or closest supported route. |
| Calculations | Opens `/calculations?asset_id={assetId}` or closest supported route. |
| Reports | Opens `/reports?asset_id={assetId}` or closest supported route. |

## UAT-08 — Governance Regression

| Rule | Expected Result |
|---|---|
| No new formulas | No API/ASME/API 579/API 581/FFS/RBI formulas are introduced. |
| No calculation changes | RC4-B does not change calculation engine behavior. |
| No AI/n8n changes | RC4-B does not change AI staging, n8n orchestration, approval, report, evidence, NDT, FFS, or RBI behavior. |
| No direct n8n DB access | n8n remains orchestration-only through AIM backend APIs. |
| Backend authoritative | Frontend validation is UX-only; backend validation remains authoritative. |

## Required Command Checks

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter @aim/web typecheck
pnpm --filter @aim/api test
pnpm --filter @aim/api test -- rc3-j-final-uat-release-candidate-closure.test.ts
pnpm --filter @aim/api test -- health.test.ts
```

## Sign-Off

| Role | Name | Result | Date | Notes |
|---|---|---|---|---|
| Engineer |  | Pass / Fail |  |  |
| Lead Engineer |  | Pass / Fail |  |  |
| IT/Admin |  | Pass / Fail |  |  |
