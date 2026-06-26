-- RC3-D Audit Log Governance Visibility
-- Scope: add read-only audit visibility permission alias. No audit mutation capability is introduced.

insert into permissions(permission_code, description) values
  ('audit_logs.view', 'View redacted, read-only audit log governance records')
on conflict (permission_code) do update set description = excluded.description;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code = 'audit_logs.view'
where r.role_code in ('admin', 'senior_engineer', 'lead_engineer', 'qa_qc', 'approver', 'it_admin')
on conflict do nothing;
