# RC3-C UAT Script — AI Staging Promotion Governance

## Objective

Validate that AI extraction output remains staging-only until human engineering review, verified evidence linkage, segregation-of-duty, and promotion gates pass.

## Preconditions

- RC3-B object storage is configured.
- A verified evidence file exists with `upload_status = 'verified'`.
- At least two human engineering users are available: reviewer and promoter.
- AI/service actor demo role is available for negative tests.

## UAT steps

1. Create or use a sample extraction job through `POST /api/v1/extraction-jobs`.
2. Create staged AI extracted fields through `POST /api/v1/extraction-jobs/{jobId}/fields`.
3. Link verified object-storage evidence to each engineering-relevant field/staging record.
4. Attempt approve as `ai_agent` or service actor and confirm `AI_SERVICE_ACTOR_BLOCKED`.
5. Attempt correction with reason `n/a`, `-`, `test`, or whitespace and confirm `MANUAL_OVERRIDE_REASON_REQUIRED`.
6. Approve a valid field as human engineer and confirm `AI_FIELD_APPROVED` audit event.
7. Correct a field as human engineer with corrected value and meaningful reason; confirm `AI_FIELD_CORRECTED` and `AI_FIELD_OVERRIDE_RECORDED` audit events.
8. Reject a field as human engineer with meaningful reason; confirm `AI_FIELD_REJECTED` and that promotion is blocked with `REJECTED_FIELD_CANNOT_BE_PROMOTED`.
9. Attempt promotion with missing or metadata-only evidence and confirm `VERIFIED_EVIDENCE_LINK_REQUIRED`.
10. Query `GET /api/v1/extraction-jobs/{jobId}/promotion-readiness` and confirm gate details are returned.
11. Attempt promotion with the same reviewer and promoter and confirm `SEGREGATION_OF_DUTY_BLOCKED`.
12. Promote as an independent human promoter after all gates pass through `POST /api/v1/extraction-jobs/{jobId}/promote`.
13. Confirm `AI_STAGING_PROMOTION_REQUESTED` and `AI_STAGING_PROMOTED` audit events.
14. Confirm promoted records have `promotion_status = 'promoted'`, `review_status = 'promoted'`, and `final_table_mutation = false` metadata.
15. Confirm n8n only routes/reminds/queries AIM APIs and does not approve/correct/reject/promote.

## Expected result

RC3-C passes when unreviewed, rejected, low-confidence without correction, missing-evidence, service-actor, and SoD-violating promotions are blocked; only independent human-reviewed, evidence-linked, gate-passing staging records are promoted.

