# RC4-U Deployment Verification and Rollback Checklist

## Deployment verification

1. Confirm clean `main` branch and release tag.
2. Confirm expected Docker/container image or deployment artifact hash.
3. Apply database migrations in order.
4. Verify `/health` and `/health/db`.
5. Verify login and authenticated API request.
6. Verify `/api/v1/release-closure/readiness` with a human authorized account.
7. Verify `/release-closure`, `/integrity-workspace`, `/golive-readiness`, and `/dashboard` frontend pages.
8. Verify evidence object-storage upload/download metadata path without exposing signed URLs.
9. Verify report export metadata path.
10. Verify audit log entries after representative engineering actions.

## Rollback checklist

1. Record pre-deployment database backup identifier.
2. Record previous application image/artifact identifier.
3. Stop new deployment or switch traffic back to previous release.
4. Restore previous application image/artifact.
5. Apply database rollback only if approved by Engineering Lead and Platform Lead.
6. Re-run smoke tests.
7. Log rollback decision, reason, owner, and timestamp.
8. Notify Product Owner, Engineering Lead, QA/UAT Lead, and Platform Lead.

## Rollback boundary

Rollback does not delete or rewrite evidence objects unless explicitly approved through evidence governance. Object storage is treated as immutable source evidence.
