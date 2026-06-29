# Sales Enablement and Demo Safety Record

**Package:** Commercial Governance, Sales Enablement, and Scale Readiness Evidence Pack  
**Evidence focus:** `COMM-GOV-002`, `COMM-GOV-003`, `COMM-GOV-005`, `COMM-GOV-007`

## 1. Sales Enablement Material Inventory

| Material | Required review | Owner | Status | Evidence link |
|---|---|---|---|---|
| Sales deck | Product claim, security claim, screenshot, and demo-data review | Product Owner / Sales Lead | Pending | TBD |
| Demo script | Safe data, role flow, and unsupported-claim review | Sales Lead / Lead Engineer | Pending | TBD |
| Technical one-pager | Architecture, AI/n8n boundary, and standards disclaimer review | Lead Engineer / Product Owner | Pending | TBD |
| Customer FAQ | Legal/compliance and support/SLA review | Commercial Owner / Legal | Pending | TBD |
| Objection handling | Security, data, AI, n8n, and evidence-governance response review | Product Owner / Security Owner | Pending | TBD |

## 2. Demo and Sales Claim Safety

All demo/sales materials must use approved demo/sandbox data only. They must not show real customer data, raw production evidence, durable signed URLs, object-storage keys, customer PII, private commercial terms, or unapproved screenshots.

Sales materials must preserve these boundaries:

- AIM remains the system of record;
- n8n remains orchestration-only;
- AI output remains staging-only and human-reviewed;
- engineering decisions, calculation review, report issue, work-order closure, accepted risk, production go-live, and commercial commitments require named human authority;
- no invented or copied API/API-ASME formulas are included;
- full API 579 and full API 581 are not claimed unless separately implemented and approved.

## 3. Human Approval Rule

AI/n8n/service actors cannot approve sales enablement materials.
AI/n8n/service actors cannot approve customer commitments.
AI/n8n/service actors cannot approve customer qualification.
AI/n8n/service actors cannot waive sales/demo safety evidence.

## 4. Customer Qualification Checklist

| Criterion | Evidence | Owner | Decision |
|---|---|---|---|
| Industry/use-case fit | Approved ICP and use-case notes | Sales Lead | Pending |
| Data/evidence readiness | Customer evidence constraints and redaction expectations | Customer Success Owner | Pending |
| Integration expectations | CMMS/n8n/API/object-storage boundary understood | Lead Engineer | Pending |
| Support expectations | SLA/support scope acknowledged | Operations | Pending |
| Legal/compliance fit | Data residency/privacy/compliance assumptions reviewed | Legal / Compliance | Pending |

Do not paste secrets, customer PII, real customer data, customer commercial terms, contract redlines, invoice/payment details, tenant billing details, payment processing data, or confidential sales pipeline data into this record.
