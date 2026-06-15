# Sprint 2 Delivery Notes — Tank Asset Register and Engineering Master Data

## Pre-Implementation Governance Check

### Assumptions

- AIM remains the system of record for tank asset and engineering master data.
- PostgreSQL stores structured asset, geometry, shell course, material, and audit records.
- Object storage is not changed in this sprint.
- n8n is not used to write asset master data directly. Future orchestration must call AIM backend APIs only.
- No engineering calculation, formula execution, FFS assessment, or RBI calculation is implemented in this sprint.
- API 650/API 653 references are captured as controlled metadata fields only.

### Impacted Documents

- `README.md`
- `docs/sprint-status.md`
- `docs/database-baseline.md`
- `docs/sprint-2-delivery-notes.md`

### Impacted Tables

- `assets`
- `tank_geometry`
- `shell_courses`
- `materials`
- `permissions`
- `role_permissions`
- `audit_logs`

### Impacted Endpoints

- `GET /api/v1/assets`
- `POST /api/v1/assets`
- `GET /api/v1/assets/{assetId}`
- `PATCH /api/v1/assets/{assetId}`
- `DELETE /api/v1/assets/{assetId}`
- `GET /api/v1/assets/{assetId}/geometry`
- `PUT /api/v1/assets/{assetId}/geometry`
- `GET /api/v1/assets/{assetId}/shell-courses`
- `POST /api/v1/assets/{assetId}/shell-courses`
- `PATCH /api/v1/assets/{assetId}/shell-courses/{courseId}`
- `DELETE /api/v1/assets/{assetId}/shell-courses/{courseId}`
- `GET /api/v1/materials`

### Required Permissions

- `asset.read`
- `asset.create`
- `asset.update`
- `asset.delete`

### Required Audit Events

- `ASSET_CREATED`
- `ASSET_UPDATED`
- `ASSET_DELETED`
- `TANK_GEOMETRY_CREATED`
- `TANK_GEOMETRY_UPDATED`
- `SHELL_COURSE_CREATED`
- `SHELL_COURSE_UPDATED`
- `SHELL_COURSE_DELETED`

### Required Validation Rules

- Missing code edition blocks asset create/update.
- Missing tank tag, name, facility, location, service fluid, owner, design code, assessment code, operating status, construction year, or inspection due date blocks asset create/update.
- Missing diameter, shell height, number of courses, liquid level, capacity, specific gravity, design temperature, design pressure, vacuum basis, bottom type, roof type, or foundation type blocks geometry save.
- Liquid level cannot exceed shell height after unit normalization.
- Missing material or joint efficiency blocks shell course save.
- Geometry lengths are normalized internally to meters.
- Shell course height and thickness values are normalized internally to millimeters.

### Required Test Cases

- Missing code edition is rejected.
- Unit normalization works for geometry and shell course height.
- Liquid level above shell height is rejected.
- Missing material and joint efficiency are rejected.
- Existing RBAC tests continue to pass.

### Migration / Documentation Updates

- Added `0002_tank_asset_master_data.sql`.
- Updated seed data to include richer tank asset, geometry, shell course, material, and permission records.
- Updated README and sprint status documents.

## What Changed

Implemented the Tank Asset Register and Engineering Master Data module:

- CRUD backend APIs for tank assets.
- Geometry upsert API.
- Shell course CRUD APIs.
- Material master selector API.
- Frontend asset register page.
- Frontend asset detail page with geometry and shell course forms.
- Validation for required engineering fields, numeric ranges, unit consistency, material selection, joint efficiency, and code edition.
- Audit log writes for create, update, and delete actions.

## AIM / n8n Boundary Confirmation

- AIM remains the system of record.
- n8n does not write asset records or shell course records directly.
- This sprint does not implement calculations.
- Formula Registry remains controlled and non-executable unless future approved versions are added.

## Run / Test Commands

```bash
pnpm db:migrate
pnpm db:seed
pnpm lint
pnpm typecheck
pnpm test
pnpm dev
```

## Manual Smoke Test

1. Open `http://localhost:3000/assets`.
2. Create a new tank asset.
3. Open the created tank detail page.
4. Save tank geometry.
5. Add a shell course with a selected material.
6. Confirm errors appear when code edition, diameter, material, or joint efficiency are missing.
7. Confirm `/api/v1/assets` returns the created tank.
8. Confirm audit records are inserted for create/update/delete actions.
