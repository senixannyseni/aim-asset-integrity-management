# AIM+n8n Error Handling and Recovery Runbook

**Document path:** `05_n8n/error_handling.md`  
**Version:** 1.0.0  
**Status:** Implementation-ready MVP handoff

---

## 1. Purpose

This runbook defines how n8n workflow errors must be detected, logged, retried, escalated, and recovered in the AIM+n8n MVP.

The core rule is simple:

**Every n8n failure must create an AIM error log through `/api/error-logs`, and every workflow execution must post to `/api/workflow-events`.**

n8n must not write directly to PostgreSQL and must not store final engineering data. All recovery must happen through AIM backend APIs.

---

## 2. Error Handling Principles

| Principle | Requirement |
|---|---|
| AIM is system of record | All error state is recorded in AIM, not n8n local state |
| No direct database writes | n8n must never write error recovery directly to PostgreSQL |
| Workflow event required | Every workflow start, success, failure, retry, and recovery action must be posted to `/api/workflow-events` |
| Error log required | Every failed workflow execution or unrecoverable node failure must post to `/api/error-logs` |
| Idempotency required | Actions that create or approve records must use idempotency keys |
| Human approval preserved | Retry/recovery must never auto-approve engineering data, calculations, decisions, or issued reports |
| Evidence preserved | Failure recovery must not detach or bypass evidence linkage requirements |
| Staging preserved | AI extraction recovery must not promote staging data without engineer review |

---

## 3. Error Severity Model

| Severity | Definition | Example | Default Escalation |
|---|---|---|---|
| `low` | Non-blocking notification or refresh failure | Dashboard refresh notification failed | IT Admin after recurring failures |
| `medium` | Workflow delayed but no engineering gate blocked yet | Reminder email failed | IT Admin after 4 hours |
| `high` | Workflow blocks review, approval, report, or work order | Extraction trigger API timeout | IT Admin and owner role |
| `critical` | Report issue, safety-related action, or urgent work order blocked | Critical work order creation failed | Immediate IT Admin + Lead Engineer |

---

## 4. Standard Error Categories

| Error Code | Category | Safe to Retry | Action |
|---|---|---:|---|
| `N8N_PAYLOAD_INVALID` | Validation | No | Create error log, notify owner, require payload correction |
| `N8N_AIM_API_TIMEOUT` | Connectivity | Yes | Retry with backoff and idempotency key |
| `N8N_AIM_API_5XX` | Backend transient | Yes | Retry with backoff; escalate after max attempts |
| `N8N_AIM_API_4XX_PERMISSION` | RBAC/permission | No | Notify IT Admin and owner; do not retry automatically |
| `N8N_AIM_API_4XX_VALIDATION` | Business validation | No | Notify owner role; keep entity unchanged |
| `N8N_DUPLICATE_IDEMPOTENCY_KEY` | Duplicate/replay | No | Query AIM status before any further action |
| `N8N_NOTIFICATION_FAILED` | Notification | Yes | Retry notification only; do not alter entity status |
| `N8N_GATE_NOT_SATISFIED` | Approval/report gate | No | Keep blocked; notify responsible role |
| `N8N_AI_EXTRACTION_FAILED` | AI extraction orchestration | Conditional | Retry only through AIM extraction job API |
| `N8N_RECOVERY_FAILED` | Recovery workflow failure | No | Escalate immediately to IT Admin |

---

## 5. Standard Failure Procedure

For every failed workflow:

1. Stop any downstream node that could create duplicate or unsafe action.
2. Build standard error payload.
3. Call `POST /api/error-logs`.
4. Call `POST /api/workflow-events` with `<workflow>.failed`.
5. Notify owner role and IT Admin according to severity.
6. Check `safe_to_retry` and retry policy.
7. If retry fails, escalate according to `05_n8n/sla_escalation_matrix.xlsx`.
8. Recovery must be executed through AIM backend API only.

---

## 6. Retry Rules

| Operation Type | Auto Retry Allowed | Notes |
|---|---:|---|
| GET/read status | Yes | Safe, max 3 retries |
| Notification send | Yes | Retry notification only |
| Create evidence metadata | Yes with idempotency | Check existing checksum/storage_uri before duplicate creation |
| Create extraction job | Yes with idempotency | Never run duplicate AI jobs blindly |
| Promote staging record | No blind retry | Query AIM state first; must preserve human review |
| Approve calculation | No blind retry | Query calculation status first |
| Issue report | No blind retry | Query report status and gate state first |
| Create work order | Yes with idempotency | Check work_order_code or idempotency result |
| Error log creation | Yes | If error logging fails, n8n must raise critical alert |

---

## 7. Recovery by Workflow

| Workflow | Recovery Action |
|---|---|
| WF-001 File Intake | Re-submit evidence metadata through AIM API after checksum/storage_uri duplicate check |
| WF-002 AI Extraction Trigger | Re-check evidence verification and extraction job status before re-trigger |
| WF-003 Staging Validation | Re-read extraction job and staging records; do not promote records |
| WF-004 Engineer Review Reminder | Re-send reminder; do not alter review state |
| WF-005 Approval Flow | Query entity approval state; do not replay approval blindly |
| WF-006 Calculation Review | Query calculation status; require human review before approval |
| WF-007 Report Approval | Query report status and gates; do not issue without approver action |
| WF-008 Action Required to Work Order | Recreate work order only with idempotency and duplicate check |
| WF-009 Dashboard Refresh | Re-run KPI read; no data mutation |
| WF-010 Error Queue and Recovery | Escalate if recovery fails; create secondary error log with parent reference |

---

## 8. Standard Error Log Payload

```json
{
  "source_system": "n8n",
  "severity": "high",
  "error_code": "N8N_WORKFLOW_FAILURE",
  "error_message": "Workflow failed before successful AIM API completion.",
  "entity_type": "workflow_event",
  "entity_id": "wf-event-id-or-pending",
  "request_id": "req_n8n_54231",
  "diagnostics_json": {
    "workflow_id": "WF-001",
    "workflow_name": "File Intake",
    "node_name": "HTTP Request - AIM API",
    "n8n_execution_id": "54231",
    "http_status": 500,
    "safe_to_retry": true,
    "attempt": 1,
    "boundary_note": "n8n does not write final engineering data and must recover through AIM APIs only."
  }
}
```

---

## 9. Standard Failed Workflow Event Payload

```json
{
  "source_system": "n8n",
  "event_type": "workflow.file_intake.failed",
  "entity_type": "evidence_file",
  "entity_id": "pending",
  "payload_json": {
    "workflow_id": "WF-001",
    "error_code": "N8N_AIM_API_TIMEOUT",
    "safe_to_retry": true,
    "attempt": 1
  },
  "n8n_execution_id": "54231"
}
```

---

## 10. Operational Monitoring

Minimum operational checks:

- Count failed workflow events by workflow ID.
- Count unresolved error logs by severity.
- Track retry count and repeated failures.
- Track approval/report/work order blockers.
- Alert if `/api/error-logs` call fails.
- Alert if any n8n workflow is configured with direct PostgreSQL credentials.
- Alert if any workflow node attempts to call non-AIM API for final engineering state.

---

## 11. Acceptance Criteria

- Every workflow has an error path.
- Every failure creates `/api/error-logs`.
- Every workflow posts `/api/workflow-events`.
- Retry behavior does not duplicate approvals, report issues, or work orders.
- Human approval is never replaced by n8n or AI.
- n8n recovery uses AIM API only.
- IT Admin can identify failed workflow, failed node, entity, severity, retry status, and owner role from AIM.

---

## 12. Delivery Notes

### What Changed

This runbook defines AIM+n8n MVP error handling, severity, retry, escalation, and recovery behavior.

### AIM / n8n Boundary Confirmation

n8n is orchestration only. AIM backend owns state transition, validation, audit, and final engineering data persistence.

### Run / Test Commands

```bash
npm run test:workflow
npm run test:audit
npm run test:error-handling
```

Suggested n8n test pattern:

```bash
n8n execute --id=<workflow_id>
n8n export:workflow --all --output=./05_n8n/exports/
```

### Documentation Updates

Update this document whenever error codes, retry policies, workflow owner roles, or API error schemas change.
