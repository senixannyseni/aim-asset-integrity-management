-- RC3-I: Hypercare / go-live readiness visibility permission synchronization.
-- Scope-limited to read-only readiness summaries derived from existing AIM gate/status/error/review/audit/task records.
-- No API 579/API 581/FFS/RBI calculation, evidence mutation, NDT mutation, AI approval, n8n execution, hypercare closure, or final engineering decision automation is introduced.

insert into permissions(permission_code, description) values
  ('golive_readiness.view', 'View read-only hypercare and go-live readiness summaries, blockers, gates, and UAT readiness indicators')
on conflict (permission_code) do update set description = excluded.description;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code = 'golive_readiness.view'
where r.role_code in ('admin', 'data_entry', 'inspector', 'engineer', 'senior_engineer', 'lead_engineer', 'approver', 'qa_qc', 'management', 'it_admin', 'client_viewer')
on conflict do nothing;
