-- UAT Cycle 1 hotfix:
-- approval_records.approved_at must represent actual approval time only.
-- Approval requests should use submitted_at and keep approved_at null until senior approval.

alter table approval_records
  alter column approved_at drop default;

alter table approval_records
  alter column approved_at drop not null;

update approval_records
set approved_at = null,
    updated_at = now()
where approval_status <> 'approved'
  and approver_id is null;
