-- RC3-G: n8n workflow console / orchestration visibility permission synchronization.
-- Scope-limited to read-only AIM-side workflow orchestration visibility.
-- No n8n execution, workflow editor, credential/webhook secret editor, direct PostgreSQL write, or final engineering mutation is introduced.

insert into permissions(permission_code, description) values
  ('workflow_console.view', 'View read-only AIM-side workflow orchestration console summaries and redacted workflow metadata')
on conflict (permission_code) do update set description = excluded.description;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code = 'workflow_console.view'
where r.role_code in ('admin', 'it_admin', 'management')
on conflict do nothing;
