# Multi-Tenant Sprint 6 Customer Onboarding Risk Record

Sprint: MT Sprint 6.

| Risk ID | Risk | Control | Owner |
|---|---|---|---|
| MT-S6-RISK-001 | Customer activation occurs before all readiness gates are complete | `assertTenantOnboardingReadyForActivation` and readiness-gate table | Customer Success / Engineering |
| MT-S6-RISK-002 | Service actor closes onboarding or support handoff | service actor approval blockers and DB check constraints | Security |
| MT-S6-RISK-003 | Tenant support SLA is unclear before rollout | `tenant_support_sla_profiles` | Customer Success |
| MT-S6-RISK-004 | BAU handoff lacks evidence | tenant-prefixed support review object key | Operations |
| MT-S6-RISK-005 | Billing/payment expectations leak into onboarding package | explicit non-scope and no payment processing data | Product / Legal |

## Closure conditions

- Sprint 6 regression test passes;
- migration 0033 applies cleanly;
- all onboarding readiness gates are documented;
- support SLA profile foundation is present;
- support escalation review foundation is present;
- human signoff confirms no automated customer activation.

AI/n8n/service actors cannot accept residual customer onboarding risk, waive Sprint 6 evidence, or sign Sprint 6 closure.

## Safety and non-disclosure guardrails

Do not paste secrets, tenant credentials, customer PII, real customer data, tenant data, tenant billing details, payment processing data, full API 579, full API 581, or copied API/API-ASME formulas into these records. Use placeholders and evidence IDs only.

AI/n8n/service actors cannot accept multi-tenant Sprint 6 evidence, approve tenant onboarding, approve customer activation, approve support SLA exceptions, approve support escalation closure, approve BAU handoff, waive customer onboarding evidence, or sign Sprint 6 closure.
