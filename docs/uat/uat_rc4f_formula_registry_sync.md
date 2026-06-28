# RC4-F UAT — Formula Registry Synchronization

## Objective

Verify that approved Formula Registry records synchronize to executable `formula_versions`, unapproved records remain blocked, and calculation execution continues to require approved synchronized formula versions.

## Preconditions

- User is logged in as a human `admin` or `senior_engineer` for formula approval/sync tests.
- AI, n8n, and service actor users are available or simulated for negative permission tests.
- At least one draft internal fixture Formula Registry record exists.
- No API/ASME formula text or copyrighted standard clause is pasted into the system.

## Test Cases

### UAT-F1 — Approve and synchronize Formula Registry record

1. Open `/formulas`.
2. Create or select a draft internal fixture formula record.
3. Open the formula detail page.
4. Approve the record as a human formula governor.
5. Confirm the approval completes.
6. Confirm the UI shows synchronized executable status and an executable `formula_version_id`.
7. Confirm audit logs include `FORMULA_APPROVED` and `FORMULA_SYNCED_TO_EXECUTABLE`.

Expected result: approved record is synchronized to executable `formula_versions`.

### UAT-F2 — Idempotent sync

1. Select the same approved record.
2. Click Sync to Executable.
3. Repeat Sync to Executable.
4. Confirm no duplicate executable formula version is created.
5. Confirm the same formula code/version remains linked to one executable formula version.

Expected result: repeated sync is safe and idempotent.

### UAT-F3 — Draft formula cannot sync

1. Create a draft formula record.
2. Attempt Sync to Executable before approval.
3. Confirm sync is rejected.
4. Confirm audit logs include sync failure visibility where available.

Expected result: draft record does not become executable.

### UAT-F4 — Retired/rejected/deprecated formula cannot sync

1. Select a retired/rejected/deprecated record, or deprecate a test record.
2. Attempt Sync to Executable.
3. Confirm the action is rejected.

Expected result: non-approved record cannot become executable.

### UAT-F5 — AI/n8n/service actor cannot approve or sync

1. Attempt formula approval/sync using AI, n8n, or service actor credentials.
2. Confirm permission is denied.

Expected result: only human formula governors can approve or sync.

### UAT-F6 — Calculation requires approved synchronized formula version

1. Run calculation with missing formula version.
2. Run calculation with a draft/unapproved formula version.
3. Run calculation with an approved synchronized formula version.
4. Confirm rejected cases fail safely.
5. Confirm the accepted case persists `formula_version_id` and formula version snapshot.

Expected result: calculation execution accepts only approved synchronized `formula_versions`.

## Governance Confirmation

- No new engineering formulas are introduced.
- No API/ASME/API 579/API 581/FFS/RBI formula content is introduced.
- No FFS/RBI trigger logic is introduced.
- Formula approval remains human-governed.
- AI/n8n/service actors cannot approve or sync formulas.
- AIM remains the system of record.
