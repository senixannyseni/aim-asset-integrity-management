# Human Review SOP for AI Extraction

## 1. Purpose

This SOP defines how Engineers review, correct, approve, reject, and promote AI-extracted data in AIM.

AI is a data extraction assistant only. AI must not approve engineering data, final integrity decisions, calculations, or reports.

---

## 2. Roles and Authority

| Role | Authority |
|---|---|
| Inspector | Upload evidence and inspection context; may comment on source evidence. |
| Engineer | Review extracted fields, approve/correct/reject staging data, request more evidence. |
| Lead Engineer | Resolve escalations, approve sensitive overrides, review high-risk records. |
| Approver | Approve final reports or decisions where required by workflow. |
| IT Admin | Manage system configuration, not engineering approval. |
| Admin | Manage users/roles; not engineering approval unless assigned engineering role. |

---

## 3. Review Queue Entry Criteria

A staging record enters human review when:

- AI extraction completes;
- validation has been run;
- one or more extracted fields have `needs_review`, `invalid`, or warning flags;
- the field is required for calculation, decision, or report;
- confidence is below the configured threshold;
- evidence linkage is missing or incomplete.

---

## 4. Review Steps

### Step 1 — Open Review Task
Reviewer opens the staging review task from AIM.

### Step 2 — Verify Context
Reviewer confirms:
- asset tag,
- inspection ID,
- method,
- component,
- evidence file,
- source page/table/cell/grid reference.

### Step 3 — Compare Extracted Field to Evidence
Reviewer must inspect evidence side-by-side with extracted value.

### Step 4 — Choose Field Action

| Action | When Used | Required Input |
|---|---|---|
| Approve | Value matches evidence and validation is acceptable | reviewer identity, timestamp |
| Correct | AI value is wrong but correct value can be verified | corrected value, reason, evidence reference |
| Reject | Field cannot be trusted or evidence is insufficient | rejection reason |
| Request Evidence | Source evidence is missing/incomplete | requested evidence details |

### Step 5 — Manual Override
If corrected, AIM must create a `manual_overrides` record with:
- original value,
- corrected value,
- correction reason,
- reviewer,
- timestamp,
- evidence reference.

### Step 6 — Promote Staging Record
Promotion to final engineering table is allowed only after required fields are approved/corrected and gates are satisfied.

---

## 5. Prohibited Reviewer Actions

Reviewers must not:
- approve without checking evidence;
- promote fields missing evidence;
- rely solely on AI confidence;
- use AI-generated formulas not in formula registry;
- issue reports with unresolved critical warnings;
- bypass calculation review for calculation-dependent findings.

---

## 6. Required Audit Trail

Every review action must write audit logs:

| Action | Audit Event |
|---|---|
| Field approved | `extraction_field.approved_by_engineer` |
| Field corrected | `manual_override.created` |
| Field rejected | `extraction_field.rejected_by_engineer` |
| Staging promoted | `staging_record.promoted` |
| Evidence requested | `review_task.evidence_requested` |
| Review escalated | `review_task.escalated` |

---

## 7. Escalation Rules

Escalate to Lead Engineer when:
- asset tag mismatch cannot be resolved;
- duplicate report number may overwrite existing inspection history;
- thickness value is suspicious and affects calculation;
- evidence conflicts between two sources;
- reviewer correction materially changes integrity status;
- validation rules or schema mapping appear wrong.

---

## 8. Acceptance Criteria

A review task is complete only when:
- every required field has a final reviewer action;
- corrections have reason and evidence;
- critical validation flags are resolved;
- audit events exist;
- the staging record is either promoted, rejected, or returned for evidence.

---

## 9. Run / Test Commands

```bash
npm run test:staging-review
npm run test:manual-overrides
npm run test:evidence-linkage
npm run test:audit
npm run test:rbac
```
