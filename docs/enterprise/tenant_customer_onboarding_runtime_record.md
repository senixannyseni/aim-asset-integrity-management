# Tenant Customer Onboarding Runtime Record

Sprint: MT Sprint 6.

Primary artifacts:

- `apps/api/src/modules/tenancy/tenant-onboarding-support.ts`
- `db/migrations/0033_enterprise_multitenant_sprint6_customer_onboarding_support_controls.sql`
- `tenant_onboarding_plans`
- `tenant_onboarding_readiness_gates`

## Runtime behavior

Tenant onboarding is represented by a tenant-scoped plan, readiness-gate state, evidence IDs, missing gates, blocked reasons, tenant-prefixed onboarding manifest object key, and human approval evidence.

Customer activation is allowed only when all required gates are completed, evidence IDs are present, the request is human-owned, and human approval evidence is provided.

AI/n8n/service actors cannot approve tenant onboarding, customer activation, support SLA, or BAU handoff.

## Required readiness gates

- tenant_context_confirmed
- tenant_admin_contact_confirmed
- evidence_lifecycle_policy_confirmed
- support_sla_profile_confirmed
- data_residency_confirmed
- human_onboarding_approval_present

## Non-scope

This record does not create tenants, approve memberships, process billing, collect payment data, or certify final production tenant isolation.

## Safety and non-disclosure guardrails

Do not paste secrets, tenant credentials, customer PII, real customer data, tenant data, tenant billing details, payment processing data, full API 579, full API 581, or copied API/API-ASME formulas into these records. Use fixtures and evidence IDs only.

AI/n8n/service actors cannot accept multi-tenant Sprint 6 evidence, approve tenant onboarding, approve customer activation, approve support SLA exceptions, approve support escalation closure, approve BAU handoff, waive customer onboarding evidence, or sign Sprint 6 closure.
