# AI Failure Fallback Procedure

## 1. Objective

Define how AIM handles AI extraction failures while preserving the AIM/n8n boundary, engineering review, evidence lineage, and auditability.

---

## 2. Failure Categories

| Code | Failure Category | Example |
|---|---|---|
| AI-F-001 | Unsupported file type | executable or corrupted archive |
| AI-F-002 | Unreadable evidence | encrypted PDF, damaged file, unreadable scan |
| AI-F-003 | Schema validation failed | missing required source/confidence/status fields |
| AI-F-004 | AI timeout | model or extraction service timeout |
| AI-F-005 | Low confidence extraction | most fields below threshold |
| AI-F-006 | Evidence reference missing | extracted values without evidence page/table/cell |
| AI-F-007 | Safety/governance violation | AI output attempts approval or final decision |
| AI-F-008 | Duplicate or conflicting extraction | two reports conflict for same asset/inspection |

---

## 3. Fallback Principles

1. AIM remains the system of record.
2. n8n may route failure notifications but must call AIM backend APIs only.
3. AI failure must not block manual inspection data entry.
4. All failed jobs must create an `error_logs` record.
5. All failed jobs must create or update a `workflow_events` record.
6. Manual entry must remain evidence-linked.
7. Manual corrections must create `manual_overrides` when correcting extracted values.
8. Engineering review remains mandatory.

---

## 4. Standard Failure Path

1. AI extraction job fails or validation rejects output.
2. AIM sets `extraction_jobs.status = failed` or `requires_manual_review`.
3. AIM creates `error_logs`.
4. AIM posts `workflow_events`.
5. n8n sends notification to owner role.
6. Engineer or Inspector enters/repairs data manually in staging.
7. Engineer reviews the corrected staging record.
8. Promotion only occurs through AIM backend approval/promotion endpoint.

---

## 5. Manual Fallback Options

| Situation | Fallback |
|---|---|
| File cannot be parsed | Inspector uploads cleaner evidence or Engineer performs manual staging entry. |
| Field confidence is low | Engineer reviews evidence and corrects field. |
| Evidence reference missing | Reviewer requests source page/table/cell/grid reference. |
| AI extracts wrong asset tag | Engineer confirms correct asset or rejects job. |
| Duplicate report found | Lead Engineer classifies as duplicate/revision/new record. |
| Unit mismatch | Engineer confirms unit and conversion basis through deterministic backend rule if allowed. |
| AI attempts final decision | Reject payload; create critical error and governance audit event. |

---

## 6. Required Error Log Payload

```json
{
  "source": "ai_extraction",
  "severity": "high",
  "error_code": "AI-F-003",
  "message": "AI extraction payload failed schema validation.",
  "related_entity_type": "extraction_job",
  "related_entity_id": "EXJ-2026-000001",
  "workflow_id": "WF-002",
  "requires_human_action": true
}
```

---

## 7. Required Audit Events

| Failure | Audit Event |
|---|---|
| AI extraction failed | `extraction_job.failed` |
| Schema validation failed | `data_quality_check.failed` |
| Manual staging entry created | `staging_record.created_manually` |
| Manual correction created | `manual_override.created` |
| Failure notification sent | `notification.sent` |
| Workflow failure received | `workflow_event.failed` |

---

## 8. Recovery Completion Criteria

A failed extraction is considered recovered only when:
- failed job status is resolved or closed;
- required staging data exists;
- evidence linkage is complete;
- Engineer has reviewed or corrected the data;
- audit logs exist;
- unresolved error logs are closed with reason.

---

## 9. Run / Test Commands

```bash
npm run test:ai-failure-fallback
npm run test:error-handling
npm run test:workflow
npm run test:audit
```
