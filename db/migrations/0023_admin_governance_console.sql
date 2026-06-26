-- RC3-E: Admin governance console permission synchronization.
-- Scope-limited to RBAC/system-setting governance visibility and safe admin controls.
-- No admin dashboard, n8n console, audit mutation, secret management, or direct DB editor is introduced.

insert into permissions(permission_code, description) values
  ('admin_governance.view', 'View read-only admin governance users, roles, permissions, assignments, and redacted settings'),
  ('admin_governance.manage_roles', 'Safely assign or remove user-role mappings with reason and audit logging'),
  ('admin_governance.manage_settings', 'Safely update allowlisted non-secret system settings with reason and audit logging')
on conflict (permission_code) do update set description = excluded.description;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in (
  'admin_governance.view',
  'admin_governance.manage_roles',
  'admin_governance.manage_settings'
)
where r.role_code in ('admin', 'it_admin')
on conflict do nothing;

insert into system_settings(setting_key, setting_value, setting_type, description, requires_approval) values
  ('evidence_retention_days', '3650'::jsonb, 'number', 'Non-secret evidence governance retention window in days.', false),
  ('report_export_expiry_hours', '24'::jsonb, 'number', 'Non-secret report export link policy window in hours.', false),
  ('ai_review_sla_hours', '72'::jsonb, 'number', 'Non-secret AI review reminder SLA in hours.', false),
  ('governance_banner_text', '"AIM governance controls active"'::jsonb, 'string', 'Non-secret admin governance banner text.', false),
  ('admin_governance_read_only_notice_enabled', 'true'::jsonb, 'boolean', 'Non-secret UI notice toggle for admin governance.', false)
on conflict (setting_key) do update set
  description = excluded.description,
  setting_type = excluded.setting_type,
  updated_at = now();
