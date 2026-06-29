# P5-5 Capacity and Query Review Record

**Record:** P5-5 Capacity and Query Review Record  
**Evidence range:** P5-PERF-005 through P5-PERF-008  
**Status:** Template/evidence-control record; attach measured query/capacity evidence separately

## 1. Capacity Assumptions

| Capacity dimension | Baseline assumption | Growth assumption | Evidence / rationale |
|---|---:|---:|---|
| Users | `<count>` | `<count>` | `<reference>` |
| Assets / tanks | `<count>` | `<count>` | `<reference>` |
| Inspection events | `<count>` | `<count>` | `<reference>` |
| Evidence files | `<count/size>` | `<count/size>` | `<reference>` |
| NDT measurements | `<row count>` | `<row count>` | `<reference>` |
| Calculations | `<count>` | `<count>` | `<reference>` |
| Report exports | `<count/size>` | `<count/size>` | `<reference>` |
| Internal work orders | `<count>` | `<count>` | `<reference>` |
| Audit-log events | `<count>` | `<count>` | `<reference>` |

## 2. Database Query Review

| Query / screen / workflow | Risk | Pagination/limit check | Index/backlog action | Owner | Decision |
|---|---|---|---|---|---|
| Asset list/detail | `<risk>` | `<pass/fail>` | `<action>` | `<owner>` | `<decision>` |
| Evidence list/search | `<risk>` | `<pass/fail>` | `<action>` | `<owner>` | `<decision>` |
| NDT measurement list/detail | `<risk>` | `<pass/fail>` | `<action>` | `<owner>` | `<decision>` |
| Calculation list/detail | `<risk>` | `<pass/fail>` | `<action>` | `<owner>` | `<decision>` |
| Integrity workspace | `<risk>` | `<pass/fail>` | `<action>` | `<owner>` | `<decision>` |
| Audit log review | `<risk>` | `<pass/fail>` | `<action>` | `<owner>` | `<decision>` |
| Report export lookup | `<risk>` | `<pass/fail>` | `<action>` | `<owner>` | `<decision>` |

## 3. Large Evidence / Large Dataset Handling

| Area | Required review | Evidence / decision |
|---|---|---|
| Large evidence upload | size class, timeout behavior, checksum, retry behavior | `<reference>` |
| Large evidence download | signed URL expiry, checksum, download timing | `<reference>` |
| Bulk NDT data | row-count assumption, import validation, pagination | `<reference>` |
| Report artifact export | artifact size class, export time, timeout/retry policy | `<reference>` |
| Audit-log retention/search | retention period, search/index strategy, access control | `<reference>` |

## 4. Human Decision

AI/n8n/service actors cannot accept performance evidence, approve performance readiness, approve data-retention exceptions, close lifecycle gaps, accept residual performance risk, or authorize production go-live.
