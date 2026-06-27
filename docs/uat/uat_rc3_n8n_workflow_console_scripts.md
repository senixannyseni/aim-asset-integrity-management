# UAT — RC3-G n8n Workflow Console / Orchestration Visibility

## Purpose

Verify that RC3-G provides RBAC-controlled, read-only AIM-side workflow orchestration visibility without exposing secrets, executing n8n workflows, or adding mutation controls.

## Preconditions

- RC3-B, RC3-C, RC3-D, RC3-E, and RC3-F are merged and green.
- User has a valid AIM login with `workflow_console.view`.
- Sample workflow tasks, notification logs, workflow events, audit logs, and error logs exist or the relevant sections may show zero counts.

## UAT script

1. Login as authorized workflow console viewer.
2. Open `/workflow-console`.
3. Confirm workflow task summary appears.
4. Confirm pending human follow-up summary appears if data exists.
5. Confirm notification delivery summary appears.
6. Confirm workflow failure/error summary appears if data exists.
7. Confirm recent workflow event summary appears if data exists.
8. Confirm no secrets/signed URLs/tokens/credentials/webhook secrets are displayed.
9. Confirm unauthorized user is blocked with `FORBIDDEN`.
10. Confirm ai_agent/n8n_service does not receive workflow governance action access.
11. Confirm console is read-only.
12. Confirm no execute/retry/approve/reject/correct/promote/report issue/delete/admin mutation controls exist.
13. Confirm no n8n workflow editor, builder, credential editor, or webhook secret editor exists.
14. Confirm n8n boundary remains API-only and cannot write workflow console state directly to PostgreSQL.
    - confirm workflow task summary appears
    - confirm no execute/retry/approve/reject/correct/promote/report issue/delete/admin mutation controls exist
    - confirm n8n boundary remains API-only and cannot write workflow console state directly to PostgreSQL

## Expected result

RC3-G passes when the workflow console is read-only, RBAC-controlled, summarizes existing AIM workflow/orchestration state only, redacts sensitive information, and provides safe links to existing AIM workspaces without introducing workflow execution, retry, approval, promotion, report issue, calculation, evidence, audit, or admin mutation controls.
