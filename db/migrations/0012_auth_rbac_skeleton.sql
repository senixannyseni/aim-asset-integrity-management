-- Phase 1 Governance Closure: backend JWT/session auth skeleton and DB-backed RBAC support.
-- Scope-limited to identity/session metadata. No AI staging, formulas, API 579/581, CMMS, or 3D processing added here.

alter table users add column if not exists password_hash_algorithm text not null default 'legacy_placeholder';
alter table users add column if not exists password_changed_at timestamptz;
alter table users add column if not exists failed_login_count integer not null default 0;
alter table users add column if not exists locked_until timestamptz;
alter table users add column if not exists last_login_at timestamptz;

do $$
begin
  alter table users drop constraint if exists users_status_check;
  alter table users add constraint users_status_check check (status in ('active', 'inactive', 'disabled', 'locked', 'pending_activation'));
end $$;

create table if not exists auth_refresh_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_id text not null unique,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  revoked_reason text,
  user_agent text,
  ip_address inet,
  created_at timestamptz not null default now()
);

create index if not exists idx_auth_refresh_sessions_user_id on auth_refresh_sessions(user_id);
create index if not exists idx_auth_refresh_sessions_token_id on auth_refresh_sessions(token_id);
create index if not exists idx_auth_refresh_sessions_active on auth_refresh_sessions(user_id, expires_at) where revoked_at is null;

insert into roles(role_code, role_name, description) values
  ('lead_engineer', 'Lead Engineer', 'Source-of-truth role for engineering review, approval, and technical escalation.'),
  ('approver', 'Approver', 'Source-of-truth role for final approval and report issue authority.'),
  ('management', 'Management', 'Source-of-truth read-only management dashboard and status role.'),
  ('it_admin', 'IT Admin', 'Source-of-truth technical administration and security operations role.')
on conflict (role_code) do update set
  role_name = excluded.role_name,
  description = excluded.description;

insert into permissions(permission_code, description) values
  ('auth.login', 'Authenticate with email and password'),
  ('auth.logout', 'Revoke authenticated session'),
  ('auth.refresh', 'Refresh access token through a refresh session'),
  ('user.read', 'Read user accounts'),
  ('user.manage', 'Manage user accounts'),
  ('role.read', 'Read roles'),
  ('role.manage', 'Manage roles'),
  ('permission.read', 'Read permissions'),
  ('permission.manage', 'Manage permissions'),
  ('system_settings.read', 'Read system settings'),
  ('system_settings.update', 'Update system settings'),
  ('dashboard.view', 'View AIM dashboard')
on conflict (permission_code) do update set description = excluded.description;

-- Source-of-truth role aliases. Existing sprint roles are preserved for backward compatibility.
insert into role_permissions(role_id, permission_id)
select r_lead.id, p.id
from roles r_lead
join roles r_senior on r_senior.role_code = 'senior_engineer'
join role_permissions rp on rp.role_id = r_senior.id
join permissions p on p.id = rp.permission_id
where r_lead.role_code = 'lead_engineer'
on conflict do nothing;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in (
  'asset.read','asset.approve','inspection.read','inspection.approve','evidence.read','ndt.read',
  'calculation.read','calculation.approve','integrity_decision.review','integrity_decision.approve',
  'report.read','report.review','report.approve','report.issue','work_order.create','work_order.update','work_order.close',
  'dashboard.view','audit.read','auth.login','auth.logout','auth.refresh'
)
where r.role_code = 'approver'
on conflict do nothing;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in (
  'asset.read','inspection.read','evidence.read','ndt.read','calculation.read','integrity_decision.review',
  'report.read','work_order.update','dashboard.view','audit.read','auth.login','auth.logout','auth.refresh'
)
where r.role_code = 'management'
on conflict do nothing;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in (
  'user.read','user.manage','role.read','role.manage','permission.read','permission.manage','system_settings.read','system_settings.update',
  'workflow_event.create','error_log.create','error_log.read','audit.read','admin.manage','asset.read','evidence.read','report.read','dashboard.view',
  'auth.login','auth.logout','auth.refresh'
)
where r.role_code = 'it_admin'
on conflict do nothing;

-- Auth audit event labels are intentionally controlled here for migration traceability.
-- Handlers write these into audit_logs: auth.login_success, auth.login_failed, auth.token_refreshed, auth.refresh_failed, auth.logout.
