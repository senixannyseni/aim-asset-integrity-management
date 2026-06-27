-- RC3-H: NDT data room / visualization governance permission synchronization.
-- Scope-limited to read-only NDT measurement/evidence linkage visibility.
-- No API 579/API 581/FFS/RBI calculation, NDT mutation, AI approval, n8n execution, or final engineering decision automation is introduced.

insert into permissions(permission_code, description) values
  ('ndt_data_room.view', 'View read-only NDT data room summaries, measurement readiness, and evidence linkage visibility')
on conflict (permission_code) do update set description = excluded.description;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code = 'ndt_data_room.view'
where r.role_code in ('admin', 'data_entry', 'inspector', 'engineer', 'senior_engineer', 'lead_engineer', 'approver', 'qa_qc', 'management', 'it_admin', 'client_viewer')
on conflict do nothing;
