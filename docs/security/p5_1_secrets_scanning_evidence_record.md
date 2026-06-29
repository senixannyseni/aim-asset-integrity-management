# P5-1 Secrets Scanning Evidence Record

**Package:** P5-1 Security and Secrets Hardening  
**Evidence IDs:** P5-SEC-001, P5-SEC-002, P5-SEC-007, P5-SEC-008

## 1. Scan Summary

| Field | Value |
|---|---|
| Scan date | `<date>` |
| Repository branch/tag/commit | `<branch/tag/commit>` |
| Scanner/tool | `<tool name/version or manual procedure>` |
| Scope | Repository files, committed docs, examples, logs, release evidence documents |
| Scanner operator | `<name / role>` |
| Reviewer | `<name / role>` |
| Result | Pending |

## 2. Minimum Scan Targets

The scan/review must cover at least:

- `.env`, `.env.local`, `.env.production`, and any real environment files;
- JWT-like tokens, API keys, passwords, private keys, connection strings, signed URLs, object-storage keys, and database dumps;
- generated evidence bundles and release docs;
- frontend durable state for signed URLs or raw object keys;
- audit/error/log examples;
- package artifacts and ZIP extraction folders before commit.

## 3. Findings Register

| Finding ID | Type | File/path | Severity | Disposition | Owner | Target closure | Evidence reference |
|---|---|---|---|---|---|---|---|
| `<id>` | `<secret/dependency/redaction/exposure>` | `<path>` | `<severity>` | `<closed/false-positive/risk-accepted>` | `<owner>` | `<date>` | `<reference>` |

## 4. Required Assertions

- No real secrets or production credentials are committed.
- Only safe examples such as `.env.example` are committed.
- No signed URLs or raw object keys are persisted as durable frontend UI state.
- No tokens, credentials, signed URLs, raw object keys, or secret-like values appear in clear-text audit logs.
- Any false positive is documented with reviewer and rationale.

## 5. Human Signoff

| Role | Name | Decision | Date | Comments |
|---|---|---|---|---|
| Security Owner |  | Pending |  |  |
| Developer / DevOps |  | Pending |  |  |
| Lead Engineer |  | Pending |  |  |

AI/n8n/service actors cannot accept secrets-scan evidence, waive missing evidence, approve false positives, or sign this record.
