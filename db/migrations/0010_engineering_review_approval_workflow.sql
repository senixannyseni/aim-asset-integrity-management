-- Sprint 9: Engineering Review and Approval Workflow
-- Governance-only workflow. No API/API-ASME formulas, AI approval, report issue, RBI quantitative logic, or work-order integration is implemented here.

insert into permissions(permission_code, description) values
  ('engineering_review.read', 'Read engineering review and approval workflow records'),
  ('engineering_review.create', 'Create engineering review workflow records'),
  ('engineering_review.update', 'Update engineering review workflow status and checklist'),
  ('engineering_review.comment', 'Add engineering review comments'),
  ('engineering_review.approve', 'Approve or lock engineering review workflow records'),
  ('engineering_review.override', 'Approve controlled engineering overrides'),
  ('approval_record.read', 'Read engineering approval records'),
  ('approval_record.create', 'Create engineering approval requests'),
  ('approval_record.approve', 'Approve engineering approval records'),
  ('approval_record.reject', 'Reject engineering approval records')
on conflict (permission_code) do update set description = excluded.description;

alter table engineering_reviews drop constraint if exists engineering_reviews_review_status_check;
update engineering_reviews
set review_status = case review_status
  when 'requested' then 'submitted_for_review'
  when 'changes_requested' then 'returned_for_revision'
  else review_status
end
where review_status in ('requested','changes_requested');

alter table engineering_reviews
  alter column reviewer_id drop not null,
  add column if not exists review_code text,
  add column if not exists asset_id uuid references assets(id),
  add column if not exists calculation_run_id uuid references calculation_runs(id),
  add column if not exists assigned_engineer uuid references users(id),
  add column if not exists checklist_json jsonb not null default '{}'::jsonb,
  add column if not exists comments_json jsonb not null default '[]'::jsonb,
  add column if not exists override_json jsonb not null default '{}'::jsonb,
  add column if not exists revision_no integer not null default 1,
  add column if not exists supersedes_review_id uuid references engineering_reviews(id),
  add column if not exists locked_flag boolean not null default false,
  add column if not exists submitted_at timestamptz,
  add column if not exists returned_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

update engineering_reviews
set review_code = coalesce(review_code, 'REV-' || id::text),
    asset_id = coalesce(asset_id, (case when entity_type = 'asset' then entity_id else null end)),
    calculation_run_id = coalesce(calculation_run_id, (case when entity_type = 'calculation_run' then entity_id else null end)),
    locked_flag = (locked_flag or review_status in ('approved','rejected','locked')); -- RC4-J: existing final reviews are immutable at DB level

alter table engineering_reviews
  alter column review_status set default 'draft',
  add constraint engineering_reviews_review_status_check check (review_status in ('draft','submitted_for_review','returned_for_revision','reviewed','submitted_for_approval','approved','rejected','locked'));

create unique index if not exists ux_engineering_reviews_review_code on engineering_reviews(review_code);
create index if not exists idx_engineering_reviews_entity on engineering_reviews(entity_type, entity_id);
create index if not exists idx_engineering_reviews_calculation_run on engineering_reviews(calculation_run_id);
create index if not exists idx_engineering_reviews_asset_id on engineering_reviews(asset_id);

alter table approval_records drop constraint if exists approval_records_approval_status_check;
update approval_records
set approval_status = case approval_status
  when 'requested' then 'submitted_for_approval'
  when 'revoked' then 'rejected'
  else approval_status
end
where approval_status in ('requested','revoked');

alter table approval_records
  alter column approver_id drop not null,
  add column if not exists approval_code text,
  add column if not exists review_id uuid references engineering_reviews(id),
  add column if not exists asset_id uuid references assets(id),
  add column if not exists calculation_run_id uuid references calculation_runs(id),
  add column if not exists approval_type text not null default 'final_result',
  add column if not exists reviewer_user_id uuid references users(id),
  add column if not exists override_json jsonb not null default '{}'::jsonb,
  add column if not exists affected_field text,
  add column if not exists original_value_json jsonb,
  add column if not exists override_value_json jsonb,
  add column if not exists reason text,
  add column if not exists evidence_links jsonb not null default '[]'::jsonb,
  add column if not exists checklist_json jsonb not null default '{}'::jsonb,
  add column if not exists locked_flag boolean not null default false,
  add column if not exists submitted_at timestamptz,
  add column if not exists rejected_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

update approval_records
set approval_code = coalesce(approval_code, 'APR-' || id::text),
    asset_id = coalesce(asset_id, (case when entity_type = 'asset' then entity_id else null end)),
    calculation_run_id = coalesce(calculation_run_id, (case when entity_type = 'calculation_run' then entity_id else null end)),
    locked_flag = (locked_flag or approval_status in ('approved','rejected','locked')); -- RC4-J: existing final approvals are immutable at DB level

alter table approval_records
  alter column approval_status set default 'draft',
  add constraint approval_records_approval_status_check check (approval_status in ('draft','submitted_for_review','returned_for_revision','reviewed','submitted_for_approval','approved','rejected','locked'));

create unique index if not exists ux_approval_records_approval_code on approval_records(approval_code);
create index if not exists idx_approval_records_entity on approval_records(entity_type, entity_id);
create index if not exists idx_approval_records_review_id on approval_records(review_id);
create index if not exists idx_approval_records_calculation_run on approval_records(calculation_run_id);
create index if not exists idx_approval_records_asset_id on approval_records(asset_id);

create or replace function prevent_locked_engineering_review_change()
returns trigger as $$
begin
  if (old.locked_flag = true or old.review_status in ('approved','rejected','locked')) then
    raise exception 'Locked engineering_review records cannot be modified or deleted. Create a new revision.';
  end if;
  if (tg_op = 'DELETE') then
    return old;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_prevent_locked_engineering_review_update on engineering_reviews;
create trigger trg_prevent_locked_engineering_review_update
before update on engineering_reviews
for each row execute function prevent_locked_engineering_review_change();

drop trigger if exists trg_prevent_locked_engineering_review_delete on engineering_reviews;
create trigger trg_prevent_locked_engineering_review_delete
before delete on engineering_reviews
for each row execute function prevent_locked_engineering_review_change();

create or replace function prevent_locked_approval_record_change()
returns trigger as $$
begin
  if (old.locked_flag = true or old.approval_status in ('approved','rejected','locked')) then
    raise exception 'Locked approval_record records cannot be modified or deleted. Create a new revision.';
  end if;
  if (tg_op = 'DELETE') then
    return old;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_prevent_locked_approval_record_update on approval_records;
create trigger trg_prevent_locked_approval_record_update
before update on approval_records
for each row execute function prevent_locked_approval_record_change();

drop trigger if exists trg_prevent_locked_approval_record_delete on approval_records;
create trigger trg_prevent_locked_approval_record_delete
before delete on approval_records
for each row execute function prevent_locked_approval_record_change();

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in (
  'engineering_review.read','engineering_review.create','engineering_review.update','engineering_review.comment',
  'approval_record.read','approval_record.create'
)
where r.role_code in ('engineer','senior_engineer','lead_engineer','qa_qc')
on conflict do nothing;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in (
  'engineering_review.approve','engineering_review.override','approval_record.approve','approval_record.reject'
)
where r.role_code in ('admin','senior_engineer','lead_engineer','approver')
on conflict do nothing;

insert into role_permissions(role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.permission_code in ('engineering_review.read','approval_record.read')
where r.role_code in ('client_viewer','approver')
on conflict do nothing;

-- Explicitly no ai_agent approval/finalization permissions are granted in this migration.
-- ai_agent intentionally receives no engineering review, approval, override, reject, or lock permissions