# UAT Cycle 2 Frontend Walkthrough

## Personas

- Engineer
- Senior Engineer
- AI/service-user negative test where applicable

## Pages

- `/login`
- `/evidence`
- `/calculations`
- `/integrity-decisions`
- `/integrity-decisions/[decision_id]`
- `/reports`
- `/work-orders`
- `/work-orders/[work_order_id]`

## Walkthrough

1. Open `/login` and log in using real JWT credentials. Confirm API calls use bearer token. Development headers are allowed only when `NEXT_PUBLIC_AIM_DEV_HEADERS_ENABLED=true`.
2. Open `/evidence` and confirm evidence files are available.
3. Open `/integrity-decisions`, create a decision from an approved calculation, and attempt approval before evidence. Confirm the UI shows `INTEGRITY_DECISION_EVIDENCE_REQUIRED`.
4. Link evidence directly to `integrity_decision` and approve as senior engineer.
5. Open `/reports`, generate or select a report, approve it, and link evidence directly to `report`, `calculation_run`, and `integrity_decision`.
6. Attempt report issue before all evidence links are present. Confirm missing evidence gate messages are visible.
7. Issue the report after all gates pass. Confirm report is locked.
8. Open `/work-orders`, test External CMMS rejection, create internal AIM work order fallback, and close with authorized role.
9. Confirm AI must not approve or finalize any engineering output.
10. Confirm n8n is not used to write directly to PostgreSQL.

## Expected UX

- RBAC denial messages are visible.
- Gate failures show missing evidence and workflow blockers.
- Issued reports show locked status.
- Internal work order gate checklist is visible.
