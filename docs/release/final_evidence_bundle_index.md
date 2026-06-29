# AIM Final Evidence Bundle Index

**Purpose:** Provide a compact, auditable index for the final Go/No-Go evidence bundle.

## 1. Bundle Control

| Field | Value |
|---|---|
| Bundle ID | `<EV-BUNDLE-ID>` |
| Release tag | `<tag>` |
| Commit SHA | `<sha>` |
| Decision date | `<YYYY-MM-DD>` |
| Evidence bundle location | `<controlled archive reference>` |
| Archive owner | `<name / role>` |
| Evidence coordinator | `<name / role>` |

## 2. Evidence Index

| Evidence ID | Evidence Name | Source / Attachment Reference | Owner | Result | Reviewer | Status |
|---|---|---|---|---|---|---|
| EV-BUNDLE-001 | Git baseline evidence | `<reference>` | Developer / DevOps | Pending | `<reviewer>` | Pending |
| EV-BUNDLE-002 | Full test/lint/repo hygiene evidence | `<reference>` | Developer | Pending | `<reviewer>` | Pending |
| EV-BUNDLE-003 | Migration and seed evidence | `<reference>` | DevOps | Pending | `<reviewer>` | Pending |
| EV-BUNDLE-004 | Environment validation evidence | `<reference>` | IT Admin / DevOps | Pending | `<reviewer>` | Pending |
| EV-BUNDLE-005 | Backup/restore/DR evidence | `<reference>` | DevOps | Pending | `<reviewer>` | Pending |
| EV-BUNDLE-006 | Security and service actor evidence | `<reference>` | Security Owner | Pending | `<reviewer>` | Pending |
| EV-BUNDLE-007 | Monitoring and incident response evidence | `<reference>` | IT Admin / Security Owner | Pending | `<reviewer>` | Pending |
| EV-BUNDLE-008 | UAT evidence and defect closure | `<reference>` | UAT Lead | Pending | `<reviewer>` | Pending |
| EV-BUNDLE-009 | Governance denial proof | `<reference>` | Security Owner / Lead Engineer | Pending | `<reviewer>` | Pending |
| EV-BUNDLE-010 | Final go/no-go signoff evidence | `<reference>` | Product Owner / Approver | Pending | `<reviewer>` | Pending |

## 3. Security Handling

Do not include secrets, JWTs, passwords, raw object keys, signed URLs, exploit details, confidential client evidence, or production credentials in this index. Reference controlled evidence locations instead.

AI/n8n/service actors cannot accept evidence, waive evidence, approve the final bundle, sign the release, or replace named human signoff.

## 4. Cross-References

This index must align with:

```text
docs/release/aim_mvp_final_go_no_go_evidence_bundle.md
docs/release/final_release_evidence_register.md
docs/release/final_release_operations_evidence_collection.md
docs/release/final_go_no_go_signoff_packet.md
docs/release/final_go_live_authorization_record.md
```
