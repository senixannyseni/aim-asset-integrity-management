# Sprint 7 Delivery Notes — FFS Trigger Workflow

Status: Implemented

## Scope Implemented

Sprint 7 implements an API 579-1/ASME FFS-1-aligned **trigger workflow** for Fitness-for-Service review candidates.

Implemented backend routes:

- `GET /api/v1/ffs/cases`
- `POST /api/v1/ffs/cases`
- `GET /api/v1/ffs/cases/{caseId}`
- `POST /api/v1/ffs/cases/from-calculation`
- `PATCH /api/v1/ffs/cases/{caseId}/status`
- `POST /api/v1/ffs/cases/{caseId}/close`

Implemented frontend route:

- `/ffs`

Implemented migration:

- `db/migrations/0008_ffs_trigger_workflow.sql`

## Governance Boundary

The workflow creates and manages FFS trigger cases only. It does not execute API 579-1/ASME FFS-1 calculations, does not reproduce copyrighted clause text, and does not declare fitness for service.

FFS cases may be created from:

- deterministic calculation warning outputs;
- manual findings entered by an authorized user.

## Trigger Coverage

Configured trigger rules cover:

- local thin area;
- crack-like indication;
- dent/gouge;
- severe corrosion;
- settlement concern;
- out-of-roundness;
- brittle fracture concern;
- thickness below screening criteria.

## Approval Rules

- AI agents cannot close FFS cases.
- Final FFS disposition requires `senior_engineer` or `admin` authority.
- Final disposition writes an `approval_records` row and an audit log.
- Non-final workflow status updates are separate from final disposition approval.

## Traceability

FFS cases preserve:

- asset/component;
- damage mechanism;
- trigger source and rule;
- trigger reason;
- severity;
- supporting measurements;
- evidence link snapshots;
- assigned engineer;
- due date;
- final disposition and approval record when closed.

## Exclusions

Not implemented in this sprint:

- API 579-1/ASME FFS-1 formula execution;
- final FFS assessment calculation;
- report generation;
- AI extraction runtime;
- work-order integration;
- RBI quantitative calculation.
