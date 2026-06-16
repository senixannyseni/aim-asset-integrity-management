-- Sprint 2.5: AIM+n8n Alignment and Governance Hardening
-- No engineering calculations, API formulas, AI extraction, or report generation are implemented here.

create table if not exists workflow_events (
  id uuid primary key default gen_random_uuid(),
  workflow_event_code text not null unique,
  workflow_id text not null,
  workflow_name text,
  event_type text not null,
  event_status text not null default 'received' check (event_status in ('received', 'accepted', 'rejected', 'processed', 'failed')),
  source_system text not null default 'n8n',
  related_entity_type text,
  related_entity_id uuid,
  payload_json jsonb not null default '{}'::jsonb,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

create table if not exists error_logs (
  id uuid primary key default gen_random_uuid(),
  error_code text not null,
  error_message text not null,
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  source_module text not null,
  source_system text not null default 'aim',
  related_entity_type text,
  related_entity_id uuid,
  workflow_event_id uuid references workflow_events(id),
  request_id text,
  stack_trace text,
  payload_json jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open', 'triaged', 'resolved', 'ignored')),
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists idx_workflow_events_workflow_id on workflow_events(workflow_id);
create index if not exists idx_workflow_events_event_type on workflow_events(event_type);
create index if not exists idx_workflow_events_entity on workflow_events(related_entity_type, related_entity_id);
create index if not exists idx_error_logs_source_module on error_logs(source_module);
create index if not exists idx_error_logs_severity on error_logs(severity);
create index if not exists idx_error_logs_status on error_logs(status);

insert into permissions(permission_code, description) values
  ('error_log.create', 'Create operational error logs'),
  ('error_log.read', 'Read operational error logs')
on conflict (permission_code) do update set description = excluded.description;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in ('error_log.create','error_log.read','workflow_event.create','audit.read')
where r.role_code in ('admin', 'senior_engineer', 'qa_qc')
on conflict do nothing;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in ('workflow_event.create','error_log.create')
where r.role_code = 'ai_agent'
on conflict do nothing;
