# Tenant Support SLA Runtime Record

Sprint: MT Sprint 6.

Primary artifacts:

- `buildTenantSupportSlaProfile`
- `tenant_support_sla_profiles`

## Runtime behavior

Support SLA profiles define tenant-specific support tier, timezone, response targets, escalation target, Customer Success ownership, Operations ownership, human approval requirement, and service-actor non-approval boundary.

Supported tiers: pilot, standard, premium, enterprise.

The migration enforces positive response targets, SEV1 target not slower than SEV2 target, tenant_id indexing, and `service_actor_may_approve = false`.

## Human approval boundary

AI/n8n/service actors cannot approve tenant support SLA, SLA exception, or customer activation readiness.

## Safety and non-disclosure guardrails

Do not paste secrets, tenant credentials, customer PII, real customer data, tenant data, tenant billing details, payment processing data, full API 579, full API 581, or copied API/API-ASME formulas into these records. Use placeholders and evidence IDs only.

AI/n8n/service actors cannot accept multi-tenant Sprint 6 evidence, approve tenant onboarding, approve customer activation, approve support SLA exceptions, approve support escalation closure, approve BAU handoff, waive customer onboarding evidence, or sign Sprint 6 closure.
