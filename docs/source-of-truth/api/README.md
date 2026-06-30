# AIM Source-of-Truth API Contract Mirror

`04_API/openapi.yaml` is the live active API contract used by implementation.

`docs/source-of-truth/api/openapi.yaml` is the source-of-truth mirror used for governance review, handoff, and source-of-truth completeness checks.

These two files must remain synchronized. Any API contract change must update both files in the same pull request.

The static test `apps/api/tests/source-truth-openapi-sync.test.ts` fails when the two OpenAPI files drift.
