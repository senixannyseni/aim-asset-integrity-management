# P5-5 Performance and Reliability Evidence Record

**Record:** P5-5 Performance and Reliability Evidence Record  
**Evidence range:** P5-PERF-001 through P5-PERF-008  
**Status:** Template/evidence-control record; attach measured evidence separately

## 1. Performance Baseline Ownership

| Field | Value |
|---|---|
| Performance owner | `<named Lead Engineer>` |
| DevOps owner | `<named IT Admin / DevOps>` |
| Target environment | `<production-pilot / staging / production-like>` |
| Release tag / commit SHA | `<tag and commit SHA>` |
| Test window | `<date/time range>` |
| Evidence storage location | `<secure evidence location>` |
| Review cadence | `<cadence>` |

## 2. API Load Smoke Test

| Area | Required evidence | Result / reference |
|---|---|---|
| Health endpoint | request count, concurrency, duration, latency summary, error count | `<redacted evidence reference>` |
| Auth/login flow | request count, concurrency, duration, latency summary, error count | `<redacted evidence reference>` |
| Protected API route | permissioned route, denied-action route, latency summary, error count | `<redacted evidence reference>` |
| Evidence/governance route | upload metadata or read route smoke, latency summary, error count | `<redacted evidence reference>` |
| Calculation/report gate route | read/gate route smoke, latency summary, error count | `<redacted evidence reference>` |

## 3. Report Export Throughput Check

| Field | Value |
|---|---|
| Sample report type | `<redacted sample>` |
| Artifact size class | `<small / medium / large>` |
| Export duration | `<duration>` |
| Timeout behavior | `<observed timeout behavior>` |
| Retry/error behavior | `<observed behavior>` |
| Evidence link | `<secure evidence reference>` |

## 4. Object-Storage Throughput Check

| Field | Value |
|---|---|
| Evidence size class | `<small / medium / large>` |
| Upload duration | `<duration>` |
| Download duration | `<duration>` |
| Checksum validation | `<pass/fail/reference>` |
| Signed URL handling | `<redacted; no signed URLs pasted>` |
| Raw object key handling | `<redacted; no raw durable key exposed>` |

n8n remains orchestration-only and must call AIM APIs only. P5-5 does not allow n8n to write directly to PostgreSQL or to bypass AIM evidence gates.

## 5. Frontend Route Responsiveness Smoke

| Route / workspace | Scenario | Result / reference |
|---|---|---|
| `/assets` | asset list and detail navigation | `<redacted evidence reference>` |
| `/inspections` | inspection package navigation | `<redacted evidence reference>` |
| `/evidence` | evidence list/readiness view | `<redacted evidence reference>` |
| `/calculations` | calculation list/detail navigation | `<redacted evidence reference>` |
| `/integrity-workspace` | consolidated workspace navigation | `<redacted evidence reference>` |
| `/release-closure` | release readiness evidence view | `<redacted evidence reference>` |

## 6. Timeout, Retry, and Error Policy

| Flow | Timeout policy | Retry policy | Error evidence |
|---|---|---|---|
| API request | `<policy>` | `<policy>` | `<reference>` |
| Report export | `<policy>` | `<policy>` | `<reference>` |
| Object-storage upload/download | `<policy>` | `<policy>` | `<reference>` |
| n8n-triggered workflow | `<policy>` | `<policy>` | `<reference>` |
| AI staging job | `<policy>` | `<policy>` | `<reference>` |

AI/n8n/service actors cannot accept performance evidence or approve performance readiness. Human owners must record pass/no-go decisions.
