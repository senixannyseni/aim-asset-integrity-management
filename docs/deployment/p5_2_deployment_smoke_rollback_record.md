# P5-2 Deployment Smoke and Rollback Evidence Record

**Package:** P5-2 Deployment and Environment Hardening  
**Evidence IDs:** `P5-ENV-001`, `P5-ENV-002`, `P5-ENV-010`, `P5-ENV-011`, `P5-ENV-012`

## 1. Release and Artifact Traceability

| Field | Value |
|---|---|
| Release tag | `<tag>` |
| Commit SHA | `<commit-sha>` |
| Build artifact identifier | `<artifact-id>` |
| Build artifact checksum | `<checksum>` |
| Deployment window | `<date/time>` |
| Deployment owner | `<name / role>` |
| Rollback owner | `<name / role>` |

## 2. Smoke Test Evidence

| Smoke Area | Required evidence | Result | Evidence reference |
|---|---|---|---|
| API health | health endpoint output | Pending |  |
| Frontend reachability | approved frontend URL check | Pending |  |
| Login/auth-me | authenticated user check | Pending |  |
| Protected route denial | anonymous/unauthorized denial evidence | Pending |  |
| Evidence metadata | evidence repository metadata check | Pending |  |
| Signed URL behavior | short-lived URL behavior without durable UI exposure | Pending |  |
| Calculation gate | calculation blocked/allowed only with approved formula/version evidence | Pending |  |
| Report issue gate | report issue blocked unless required gates pass | Pending |  |
| Work-order closure gate | close blocked without required note/evidence | Pending |  |
| Audit/event/error logging | controlled actions emit audit/error/workflow evidence | Pending |  |
| n8n API-only workflow boundary | workflow calls AIM APIs only | Pending |  |

## 3. Rollback Readiness

| Check | Required evidence | Result | Evidence reference |
|---|---|---|---|
| Previous release/artifact identified | tag/artifact reference | Pending |  |
| Database backup taken | backup evidence | Pending |  |
| Rollback command/procedure reviewed | runbook reference | Pending |  |
| Rollback owner assigned | named owner | Pending |  |
| Communication path confirmed | support channel/escalation | Pending |  |
| Rollback rehearsal or tabletop completed | rehearsal record | Pending |  |

## 4. Human Go/No-Go for Deployment Evidence

| Role | Name | Decision | Date | Comment |
|---|---|---|---|---|
| DevOps |  | Pending |  |  |
| Lead Engineer |  | Pending |  |  |
| Security Owner |  | Pending |  |  |
| Product Owner |  | Pending |  |  |
| Operations / Hypercare Owner |  | Pending |  |  |

AI/n8n/service actors cannot accept deployment smoke evidence, accept rollback readiness, sign deployment readiness, or authorize production go-live.
