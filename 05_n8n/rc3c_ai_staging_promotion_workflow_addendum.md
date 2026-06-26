# RC3-C n8n Addendum — AI Staging Promotion Governance

RC3-C preserves AIM as the system of record and keeps n8n as orchestration only.

## Allowed n8n behavior

n8n may:

- notify an engineer that an AI extraction job is ready for review;
- route review tasks to engineering reviewers;
- send reminders for pending AI field review;
- call `GET /api/v1/extraction-jobs/{jobId}` to display staging state;
- call `GET /api/v1/extraction-jobs/{jobId}/promotion-readiness` to query gate status;
- call AIM workflow/notification APIs to record routing and reminders;
- log orchestration events through AIM APIs.

## Prohibited n8n behavior

n8n must not approve, correct, reject, or promote AI staging records.
n8n must not write directly to PostgreSQL.

n8n must not:

- approve extracted fields;
- correct extracted fields;
- reject extracted fields;
- promote staging records;
- write directly to PostgreSQL;
- store final engineering data;
- issue reports;
- finalize calculations, integrity decisions, or work orders.

## Required AIM API boundary

All AI staging review and promotion actions must be performed by a human engineering actor through AIM RBAC-controlled APIs. If n8n attempts to use service credentials to perform review or promotion, AIM must return a service-actor block.

