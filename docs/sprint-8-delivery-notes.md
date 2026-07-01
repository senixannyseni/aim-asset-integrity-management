# Sprint 8 Delivery Notes — RBI Interface and Trigger Workflow

Status: Implemented

## Scope Implemented

Sprint 8 adds an API RP 580/581 governance-aligned RBI interface and trigger workflow.

Implemented endpoints:

- GET /api/v1/rbi/cases
- POST /api/v1/rbi/cases
- GET /api/v1/rbi/cases/{caseId}
- POST /api/v1/rbi/cases/from-calculation
- PATCH /api/v1/rbi/cases/{caseId}/status
- POST /api/v1/rbi/cases/{caseId}/approve

Implemented UI route:

- /rbi

Implemented database migration:

- db/migrations/0009_rbi_interface_trigger_workflow.sql

## Engineering Boundary

This sprint uses a governed boundary instead of proprietary quantitative API RP 581 calculations.

RBI inputs are fixtures for:

- consequence of failure
- probability of failure
- damage mechanism
- inspection effectiveness
- fluid service
- inventory
- operating severity
- mitigation controls

RBI cases can be triggered by:

- high corrosion rate
- short remaining life
- repeated anomalies
- engineering review

## Governance Rules

- RBI interface records are qualitative/semi-quantitative fixtures unless approved Formula Registry rules are provided.
- Risk summary must show calculation basis.
- AI agents cannot approve, export, close, or finalize RBI cases.
- Evidence links must belong to the same asset as the RBI case.
- Calculation-triggered RBI cases preserve source calculation run, source measurement, evidence, and warning code references.

## Exclusions

Not implemented in this sprint:

- quantitative API RP 581 probability of failure calculation
- quantitative API RP 581 consequence of failure calculation
- report generation
- AI extraction runtime
- CMMS/work-order integration
- integrity decision finalization
