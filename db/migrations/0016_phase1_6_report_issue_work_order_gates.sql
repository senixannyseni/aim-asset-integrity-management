-- Phase 1.6: Report Issue Gates + Internal Work Order Fallback
-- Scope boundary: no API 579/API 581 quantitative implementation, no external SAP/Maximo/CMMS integration, no 3D processing, no invented API/ASME formulas.
-- AIM remains system of record. Report issue and work order fallback are AIM-backend-only, RBAC-controlled, human-reviewed, evidence-gated, and audit-logged.

insert into permissions(permission_code, description) values
  ('work_order.read', 'Read internal AIM work orders'),
  ('work_order.create', 'Create internal AIM work orders from approved decisions or issued report actions'),
  ('work_order.update', 'Update internal AIM work orders'),
  ('work_order.close', 'Close internal AIM work orders with completion note and closure evidence where required')
on conflict (permission_code) do update set description = excluded.description;

alter table reports
  add column if not exists issue_gate_status text not null default 'pending' check (issue_gate_status in ('pending','passed','blocked','issued')),
  add column if not exists issue_gate_checklist_json jsonb not null default '[]'::jsonb,
  add column if not exists issue_blocked_reason text,
  add column if not exists last_issue_gate_checked_at timestamptz,
  add column if not exists last_issue_gate_checked_by uuid references users(id);

create index if not exists idx_reports_issue_gate_status on reports(issue_gate_status);

alter table internal_work_orders
  add column if not exists inspection_event_id uuid references inspection_events(id) on delete restrict,
  add column if not exists integrity_decision_id uuid references integrity_decisions(id) on delete restrict,
  add column if not exists report_id uuid references reports(id) on delete restrict,
  add column if not exists action_source text not null default 'approved_integrity_decision' check (action_source in ('approved_integrity_decision','issued_report_action','preliminary_internal_control')),
  add column if not exists assigned_role text,
  add column if not exists preliminary_internal_flag boolean not null default false,
  add column if not exists gate_status text not null default 'pending' check (gate_status in ('pending','passed','blocked','closed')),
  add column if not exists gate_checklist_json jsonb not null default '[]'::jsonb,
  add column if not exists closure_evidence_required boolean not null default false,
  add column if not exists closure_evidence_link_id uuid references evidence_links(id) on delete restrict,
  add column if not exists action_source_note text;

create index if not exists idx_internal_work_orders_inspection_event_id on internal_work_orders(inspection_event_id);
create index if not exists idx_internal_work_orders_decision_id on internal_work_orders(integrity_decision_id);
create index if not exists idx_internal_work_orders_report_id on internal_work_orders(report_id);
create index if not exists idx_internal_work_orders_gate_status on internal_work_orders(gate_status);

-- Internal fallback marker only. external_cmms_reference remains nullable for future integration reference and must not be populated by Phase 1.6 routes.
comment on column internal_work_orders.external_cmms_reference is 'Nullable future placeholder only. Phase 1.6 does not implement SAP/Maximo/CMMS integration and AIM routes keep this value null.';
comment on column internal_work_orders.external_cmms_status is 'Nullable future placeholder only. Phase 1.6 internal fallback does not call external CMMS.';
comment on column internal_work_orders.gate_checklist_json is 'Phase 1.6 internal work order gate checklist snapshot. Work order creation cannot bypass integrity/report gates.';
comment on column reports.issue_gate_checklist_json is 'Phase 1.6 report issue gate checklist snapshot: required data, evidence, calculation, review, integrity decision, report approval, workflow errors, and approver comment.';

insert into audit_logs(event_type, entity_type, metadata_json)
values
  ('phase1_6.report_issue_work_order_gate_migration_applied', 'migration', '{"phase":"1.6","scope":"report issue gates and internal work order fallback","no_external_cmms":true,"no_api_579_581":true}'::jsonb);
