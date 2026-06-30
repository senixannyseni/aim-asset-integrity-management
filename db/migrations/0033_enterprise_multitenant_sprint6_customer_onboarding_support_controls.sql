-- Enterprise Multi-Tenant Runtime Implementation Sprint 6
-- Customer/Tenant Onboarding Runtime and Support Controls
-- Migration file: 0033_enterprise_multitenant_sprint6_customer_onboarding_support_controls.sql
-- Forward-only migration: does not rewrite 0028, 0029, 0030, 0031, or 0032.
-- AI/n8n/service actors cannot approve tenant onboarding, customer activation, support SLA exceptions, support escalation closure, BAU handoff, or Sprint 6 evidence acceptance.

create table if not exists tenant_support_sla_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  profile_code text not null,
  support_tier text not null check (support_tier in ('pilot','standard','premium','enterprise')),
  timezone text not null default 'UTC',
  sev1_response_minutes integer not null check (sev1_response_minutes > 0),
  sev2_response_minutes integer not null check (sev2_response_minutes > 0),
  escalation_target_minutes integer not null check (escalation_target_minutes > 0),
  customer_success_owner_role text not null default 'Customer Success',
  support_owner_role text not null default 'Operations',
  human_approval_required boolean not null default true,
  service_actor_may_approve boolean not null default false,
  status text not null default 'draft' check (status in ('draft','ready_for_human_review','approved','retired')),
  human_approval_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, profile_code),
  check (sev1_response_minutes <= sev2_response_minutes),
  check (service_actor_may_approve = false)
);

create table if not exists tenant_onboarding_plans (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  customer_name text not null,
  onboarding_stage text not null default 'intake' check (onboarding_stage in ('intake','configuration','evidence_ready','support_ready','ready_for_activation')),
  status text not null default 'blocked' check (status in ('blocked','ready_for_human_review','approved_for_activation')),
  onboarding_owner_role text not null default 'Customer Success',
  support_sla_profile_id uuid references tenant_support_sla_profiles(id),
  readiness_manifest_object_key text not null,
  completed_gate_keys jsonb not null default '[]'::jsonb,
  missing_gate_keys jsonb not null default '[]'::jsonb,
  evidence_ids jsonb not null default '[]'::jsonb,
  blocked_reasons jsonb not null default '[]'::jsonb,
  human_approval_required boolean not null default true,
  service_actor_may_approve boolean not null default false,
  human_approval_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (readiness_manifest_object_key like 'tenants/%/onboarding/%/readiness-manifest.json'),
  check (service_actor_may_approve = false)
);

create table if not exists tenant_onboarding_readiness_gates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  onboarding_plan_id uuid references tenant_onboarding_plans(id) on delete cascade,
  gate_key text not null,
  gate_status text not null default 'pending' check (gate_status in ('pending','blocked','ready_for_human_review','approved','not_applicable')),
  owner_role text not null,
  evidence_id text,
  human_approval_required boolean not null default true,
  service_actor_may_approve boolean not null default false,
  human_approval_id text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tenant_id, onboarding_plan_id, gate_key),
  check (service_actor_may_approve = false)
);

create table if not exists tenant_support_escalation_reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  support_case_reference text not null,
  severity text not null check (severity in ('sev1','sev2','sev3','sev4')),
  review_status text not null default 'requires_human_triage' check (review_status in ('requires_human_triage','ready_for_customer_success_review','approved_for_bau_handoff','closed')),
  response_target_minutes integer not null check (response_target_minutes > 0),
  escalation_target_minutes integer not null check (escalation_target_minutes > 0),
  case_evidence_object_key text not null,
  blocked_reasons jsonb not null default '[]'::jsonb,
  customer_success_owner_role text not null default 'Customer Success',
  support_owner_role text not null default 'Operations',
  human_approval_required boolean not null default true,
  service_actor_may_close boolean not null default false,
  human_approval_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (case_evidence_object_key like 'tenants/%/support/%/review.json'),
  check (service_actor_may_close = false)
);

create index if not exists idx_tenant_support_sla_profiles_tenant_id on tenant_support_sla_profiles(tenant_id);
create index if not exists idx_tenant_onboarding_plans_tenant_id on tenant_onboarding_plans(tenant_id);
create index if not exists idx_tenant_onboarding_readiness_gates_tenant_id on tenant_onboarding_readiness_gates(tenant_id);
create index if not exists idx_tenant_support_escalation_reviews_tenant_id on tenant_support_escalation_reviews(tenant_id);

insert into tenant_support_sla_profiles (
  tenant_id,
  profile_code,
  support_tier,
  timezone,
  sev1_response_minutes,
  sev2_response_minutes,
  escalation_target_minutes,
  status,
  human_approval_id
)
select id, 'default-standard-sla', 'standard', 'UTC', 60, 240, 480, 'ready_for_human_review', 'MT-S6-HUMAN-REVIEW-PLACEHOLDER'
from tenants
where tenant_slug = 'default'
on conflict (tenant_id, profile_code) do nothing;

insert into tenant_onboarding_plans (
  tenant_id,
  customer_name,
  onboarding_stage,
  status,
  support_sla_profile_id,
  readiness_manifest_object_key,
  completed_gate_keys,
  missing_gate_keys,
  evidence_ids,
  blocked_reasons,
  human_approval_id
)
select
  t.id,
  'Default AIM Tenant',
  'support_ready',
  'ready_for_human_review',
  sla.id,
  'tenants/default/' || t.id::text || '/onboarding/Default-AIM-Tenant/readiness-manifest.json',
  '["tenant_context_confirmed","tenant_admin_contact_confirmed","evidence_lifecycle_policy_confirmed","support_sla_profile_confirmed","data_residency_confirmed"]'::jsonb,
  '["human_onboarding_approval_present"]'::jsonb,
  '["MT-S6-001","MT-S6-002","MT-S6-003"]'::jsonb,
  '["Human onboarding approval evidence is required before tenant activation."]'::jsonb,
  null
from tenants t
join tenant_support_sla_profiles sla on sla.tenant_id = t.id and sla.profile_code = 'default-standard-sla'
where t.tenant_slug = 'default'
and not exists (
  select 1 from tenant_onboarding_plans existing
  where existing.tenant_id = t.id and existing.customer_name = 'Default AIM Tenant'
);

insert into tenant_onboarding_readiness_gates (
  tenant_id,
  onboarding_plan_id,
  gate_key,
  gate_status,
  owner_role,
  evidence_id,
  human_approval_id
)
select p.tenant_id, p.id, gate.gate_key, gate.gate_status, gate.owner_role, gate.evidence_id, gate.human_approval_id
from tenant_onboarding_plans p
cross join (values
  ('tenant_context_confirmed', 'approved', 'Engineering', 'MT-S6-001', 'MT-S6-HUMAN-REVIEW-PLACEHOLDER'),
  ('tenant_admin_contact_confirmed', 'approved', 'Customer Success', 'MT-S6-002', 'MT-S6-HUMAN-REVIEW-PLACEHOLDER'),
  ('evidence_lifecycle_policy_confirmed', 'approved', 'Operations', 'MT-S6-003', 'MT-S6-HUMAN-REVIEW-PLACEHOLDER'),
  ('support_sla_profile_confirmed', 'approved', 'Customer Success', 'MT-S6-004', 'MT-S6-HUMAN-REVIEW-PLACEHOLDER'),
  ('data_residency_confirmed', 'approved', 'Security', 'MT-S6-005', 'MT-S6-HUMAN-REVIEW-PLACEHOLDER'),
  ('human_onboarding_approval_present', 'ready_for_human_review', 'Customer Success', 'MT-S6-006', null)
) as gate(gate_key, gate_status, owner_role, evidence_id, human_approval_id)
where p.customer_name = 'Default AIM Tenant'
on conflict (tenant_id, onboarding_plan_id, gate_key) do nothing;

comment on table tenant_onboarding_plans is 'MT-S6 tenant/customer onboarding runtime foundation. Customer activation requires human approval; AI/n8n/service actors cannot approve tenant onboarding or customer activation.';
comment on table tenant_support_sla_profiles is 'MT-S6 tenant support SLA profile foundation. SLA exceptions require human approval; service actors cannot approve.';
comment on table tenant_support_escalation_reviews is 'MT-S6 tenant support escalation review foundation. Support closure and BAU handoff remain human-approved.';
