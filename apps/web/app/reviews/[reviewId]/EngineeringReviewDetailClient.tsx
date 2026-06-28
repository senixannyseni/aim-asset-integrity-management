'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../../lib/api-client';

type CurrentUser = { permissions?: string[]; roles?: string[] };
type ChecklistValue = { status?: string; comment?: string } | boolean | string;
type ChecklistMap = Record<string, ChecklistValue>;
type ReviewComment = {
  comment_id?: string;
  parent_comment_id?: string | null;
  thread_id?: string;
  comment?: string;
  author_user_id?: string | null;
  author_roles?: string[];
  created_at?: string;
};
type ApprovalRecord = {
  approval_record_id: string;
  approval_code: string;
  approval_status: string;
  approval_type: string;
  approval_comment?: string;
  locked_flag: boolean;
};
type ReviewDetail = {
  review_id: string;
  review_code: string;
  entity_type: string;
  entity_id: string;
  asset_id?: string;
  calculation_run_id?: string;
  review_type: string;
  review_status: string;
  review_comment?: string;
  checklist?: ChecklistMap;
  comments?: ReviewComment[];
  revision_no: number;
  supersedes_review_id?: string;
  locked_flag: boolean;
  submitted_at?: string;
  reviewed_at?: string;
  updated_at?: string;
  approvals?: ApprovalRecord[];
  audit_trail?: Array<Record<string, unknown>>;
};

type ChecklistRow = { key: string; status: string; comment: string };

const defaultChecklistRows: ChecklistRow[] = [
  { key: 'validation_result_reviewed', status: 'pending', comment: '' },
  { key: 'evidence_traceability_reviewed', status: 'pending', comment: '' },
  { key: 'formula_version_reviewed', status: 'pending', comment: '' },
  { key: 'warnings_reviewed', status: 'pending', comment: '' },
  { key: 'segregation_of_duty_checked', status: 'pending', comment: '' }
];

function hasPermission(user: CurrentUser | null, permission: string): boolean {
  return Boolean(user?.roles?.includes('admin') || user?.permissions?.includes(permission));
}

function renderJson(value: unknown): string {
  try { return JSON.stringify(value, null, 2); } catch { return String(value); }
}

function safeDate(value?: string | null): string { return value ? value.slice(0, 19).replace('T', ' ') : '-'; }
function badgeClass(status?: string): string {
  const value = String(status ?? '').toLowerCase();
  if (value.includes('reject') || value.includes('locked') || value.includes('fail')) return 'badge badge-danger';
  if (value.includes('review') || value.includes('submit') || value.includes('draft') || value.includes('pending')) return 'badge badge-warning';
  return 'badge';
}

function checklistToRows(checklist: ChecklistMap | undefined): ChecklistRow[] {
  const source = checklist && Object.keys(checklist).length > 0 ? checklist : Object.fromEntries(defaultChecklistRows.map((row) => [row.key, { status: row.status, comment: row.comment }]));
  return Object.entries(source).map(([key, value]) => {
    if (typeof value === 'boolean') return { key, status: value ? 'pass' : 'fail', comment: '' };
    if (typeof value === 'string') return { key, status: value, comment: '' };
    return { key, status: value?.status ?? 'pending', comment: value?.comment ?? '' };
  });
}

function rowsToChecklist(rows: ChecklistRow[]): ChecklistMap {
  return Object.fromEntries(rows.map((row) => [row.key, { status: row.status, comment: row.comment }])) as ChecklistMap;
}

function actionError(payload: Record<string, unknown>, fallback: string): string {
  const error = payload.error as { message?: string; code?: string } | undefined;
  return error?.message ?? error?.code ?? fallback;
}

export default function EngineeringReviewDetailClient({ reviewId }: { reviewId: string }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [detail, setDetail] = useState<ReviewDetail | null>(null);
  const [checklistRows, setChecklistRows] = useState<ChecklistRow[]>(defaultChecklistRows);
  const [comment, setComment] = useState('');
  const [parentCommentId, setParentCommentId] = useState('');
  const [approvalComment, setApprovalComment] = useState('Senior/lead engineer approved final result after checklist and evidence review.');
  const [rejectionReason, setRejectionReason] = useState('');
  const [overrideField, setOverrideField] = useState('');
  const [overrideOriginal, setOverrideOriginal] = useState('');
  const [overrideValue, setOverrideValue] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideEvidenceFileId, setOverrideEvidenceFileId] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const canUpdateReview = hasPermission(user, 'engineering_review.update');
  const canComment = hasPermission(user, 'engineering_review.comment');
  const canCreateApproval = hasPermission(user, 'approval_record.create');
  const canApprove = hasPermission(user, 'approval_record.approve');
  const canReject = hasPermission(user, 'approval_record.reject');
  const canCreateRevision = hasPermission(user, 'engineering_review.create');
  const reviewMutationLocked = Boolean(detail?.locked_flag || ['submitted_for_approval', 'approved', 'rejected', 'locked'].includes(String(detail?.review_status ?? '')));
  const openApproval = useMemo(() => detail?.approvals?.find((approval) => !approval.locked_flag && approval.approval_status === 'submitted_for_approval'), [detail]);

  async function loadDetail() {
    const [meRes, detailRes] = await Promise.all([
      apiFetch('/api/v1/auth/me', { cache: 'no-store' }),
      apiFetch(`/api/v1/engineering/reviews/${reviewId}`, { cache: 'no-store' })
    ]);
    const [mePayload, detailPayload] = await Promise.all([meRes.json().catch(() => ({})), detailRes.json().catch(() => ({}))]);
    if (meRes.ok) setUser(mePayload.data?.user ?? null);
    if (!detailRes.ok) {
      setMessage(actionError(detailPayload, 'Review detail could not be loaded.'));
      return;
    }
    const next = detailPayload.data as ReviewDetail;
    setDetail(next);
    setChecklistRows(checklistToRows(next.checklist));
  }

  useEffect(() => { void loadDetail(); }, [reviewId]);

  function updateChecklistRow(index: number, patch: Partial<ChecklistRow>) {
    setChecklistRows((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));
  }

  async function updateStatus(status: string) {
    setMessage(null);
    const response = await apiFetch(`/api/v1/engineering/reviews/${reviewId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({
        review_status: status,
        review_comment: detail?.review_comment,
        checklist: rowsToChecklist(checklistRows)
      })
    });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(actionError(payload, 'Review status update failed.'));
      return;
    }
    setMessage(`Review marked ${status}.`);
    await loadDetail();
  }

  async function addComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const response = await apiFetch(`/api/v1/engineering/reviews/${reviewId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ comment, parent_comment_id: parentCommentId || undefined })
    });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(actionError(payload, 'Comment failed.'));
      return;
    }
    setComment('');
    setParentCommentId('');
    setMessage('Comment added to review thread.');
    await loadDetail();
  }

  async function requestApproval() {
    if (!detail) return;
    setMessage(null);
    const response = await apiFetch('/api/v1/approval-records', {
      method: 'POST',
      body: JSON.stringify({
        review_id: detail.review_id,
        entity_type: detail.entity_type,
        entity_id: detail.entity_id,
        calculation_run_id: detail.calculation_run_id,
        approval_type: 'final_result',
        approval_comment: 'Submitted for final engineering approval after structured checklist completion.'
      })
    });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(actionError(payload, 'Approval request failed.'));
      return;
    }
    setMessage(`Approval ${payload.data.approval_code} requested.`);
    await loadDetail();
  }

  async function approve(override = false) {
    if (!openApproval) return;
    setMessage(null);
    const body: Record<string, unknown> = { approval_comment: approvalComment };
    if (override) {
      body.override = {
        affected_field: overrideField,
        original_value: overrideOriginal,
        override_value: overrideValue,
        reason: overrideReason,
        evidence_file_id: overrideEvidenceFileId,
        evidence_links: overrideEvidenceFileId ? [{ evidence_file_id: overrideEvidenceFileId, link_type: 'manual_override_support' }] : []
      };
    }
    const response = await apiFetch(`/api/v1/approval-records/${openApproval.approval_record_id}/approve`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(actionError(payload, override ? 'Override approval failed.' : 'Approval failed.'));
      return;
    }
    setMessage(override ? 'Override approved and record locked.' : 'Approval completed and record locked.');
    await loadDetail();
  }

  async function reject() {
    if (!openApproval) return;
    setMessage(null);
    const response = await apiFetch(`/api/v1/approval-records/${openApproval.approval_record_id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ rejection_reason: rejectionReason })
    });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(actionError(payload, 'Rejection failed.'));
      return;
    }
    setMessage('Approval request rejected with reason.');
    await loadDetail();
  }

  async function createRevision() {
    setMessage(null);
    const response = await apiFetch(`/api/v1/engineering/reviews/${reviewId}/revision`, {
      method: 'POST',
      body: JSON.stringify({
        review_status: 'draft',
        review_comment: `New revision created from ${detail?.review_code ?? reviewId}.`,
        checklist: rowsToChecklist(defaultChecklistRows)
      })
    });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(actionError(payload, 'Revision creation failed.'));
      return;
    }
    setMessage(`Revision ${payload.data.review_code} created. Open it from the review list.`);
    await loadDetail();
  }

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">RC4-J Review Detail</p>
          <h1>{detail?.review_code ?? 'Engineering Review Detail'}</h1>
          <p>Structured checklist, threaded comments, controlled approval/rejection/override, immutable lock, and revision creation.</p>
        </div>
        <div className="action-row">
          <Link className="secondary-button" href="/reviews">Reviews</Link>
          {detail?.calculation_run_id && <Link className="secondary-button" href={`/calculations/${detail.calculation_run_id}`}>Calculation</Link>}
        </div>
      </header>

      {message && <div className="notice">{message}</div>}
      {!detail ? <section className="notice"><h2>Loading review detail</h2><p>Loading checklist, approvals, comments, and audit trail.</p></section> : <>
        <section className="grid-two">
          <section className="panel">
            <h2>Review status</h2>
            <dl className="metadata-grid">
              <dt>Status</dt><dd><span className={badgeClass(detail.review_status)}>{detail.review_status}</span></dd>
              <dt>Entity</dt><dd>{detail.entity_type} / {detail.entity_id}</dd>
              <dt>Revision</dt><dd>{detail.revision_no}</dd>
              <dt>Locked</dt><dd>{detail.locked_flag ? 'Yes' : 'No'}</dd>
              <dt>Reviewed at</dt><dd>{safeDate(detail.reviewed_at)}</dd>
              <dt>Supersedes</dt><dd>{detail.supersedes_review_id ?? '-'}</dd>
            </dl>
          </section>
          <section className="panel">
            <h2>Permission-aware actions</h2>
            <div className="action-row">
              <button className="secondary-button" type="button" onClick={() => void updateStatus('returned_for_revision')} disabled={!canUpdateReview || reviewMutationLocked}>Return</button>
              <button className="primary-button" type="button" onClick={() => void updateStatus('reviewed')} disabled={!canUpdateReview || reviewMutationLocked}>Mark Reviewed</button>
              <button className="secondary-button" type="button" onClick={() => void requestApproval()} disabled={!canCreateApproval || reviewMutationLocked || detail.review_status !== 'reviewed'}>Request Approval</button>
              <button className="secondary-button" type="button" onClick={() => void createRevision()} disabled={!canCreateRevision}>Create New Revision</button>
            </div>
            <p className="muted-text">Buttons are hidden/disabled by frontend permission hints and rechecked by the backend. Submitted-for-approval and finalized reviews are locked from further status/comment mutation.</p>
          </section>
        </section>

        <section className="panel wide-panel">
          <div className="panel-heading"><h2>Structured checklist</h2><p>All blocking items must pass or be marked not_applicable before review can become reviewed.</p></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Gate</th><th>Status</th><th>Reviewer comment</th></tr></thead>
              <tbody>
                {checklistRows.map((row, index) => (
                  <tr key={row.key}>
                    <td>{row.key}</td>
                    <td>
                      <select value={row.status} onChange={(event) => updateChecklistRow(index, { status: event.target.value })} disabled={reviewMutationLocked || !canUpdateReview}>
                        <option value="pending">pending</option>
                        <option value="pass">pass</option>
                        <option value="not_applicable">not_applicable</option>
                        <option value="fail">fail</option>
                      </select>
                    </td>
                    <td><input value={row.comment} onChange={(event) => updateChecklistRow(index, { comment: event.target.value })} disabled={reviewMutationLocked || !canUpdateReview} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid-two">
          <form className="panel" onSubmit={addComment}>
            <h2>Threaded comments</h2>
            <label><span>Reply to comment ID</span><input value={parentCommentId} onChange={(event) => setParentCommentId(event.target.value)} placeholder="Optional parent comment_id" /></label>
            <label><span>Comment</span><textarea rows={4} value={comment} onChange={(event) => setComment(event.target.value)} /></label>
            <button className="primary-button" type="submit" disabled={!canComment || reviewMutationLocked || !comment.trim()}>Add Comment</button>
          </form>
          <section className="panel">
            <h2>Comment thread</h2>
            {(detail.comments ?? []).map((item) => (
              <article className="issue-card" key={item.comment_id ?? `${item.created_at}-${item.comment}`}>
                <p><strong>{item.comment_id ?? 'comment'}</strong> {item.parent_comment_id ? <span className="muted-text">reply to {item.parent_comment_id}</span> : null}</p>
                <p>{item.comment}</p>
                <p className="muted-text">{safeDate(item.created_at)} · {(item.author_roles ?? []).join(', ')}</p>
              </article>
            ))}
            {(detail.comments ?? []).length === 0 && <p>No review comments yet.</p>}
          </section>
        </section>

        <section className="grid-two">
          <section className="panel">
            <h2>Approve / reject</h2>
            <p>Open approval: {openApproval?.approval_code ?? 'none'}</p>
            <label><span>Approval comment</span><textarea rows={3} value={approvalComment} onChange={(event) => setApprovalComment(event.target.value)} /></label>
            <div className="action-row"><button className="primary-button" type="button" onClick={() => void approve(false)} disabled={!canApprove || !openApproval || !approvalComment.trim()}>Approve + Lock</button></div>
            <label><span>Rejection reason</span><textarea rows={3} value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} /></label>
            <button className="secondary-button" type="button" onClick={() => void reject()} disabled={!canReject || !openApproval || !rejectionReason.trim()}>Reject with Reason</button>
          </section>
          <section className="panel">
            <h2>Controlled override approval</h2>
            <p>Overrides require affected field, original value, override value, reason, and evidence reference.</p>
            <label><span>Affected field</span><input value={overrideField} onChange={(event) => setOverrideField(event.target.value)} /></label>
            <label><span>Original value</span><input value={overrideOriginal} onChange={(event) => setOverrideOriginal(event.target.value)} /></label>
            <label><span>Override value</span><input value={overrideValue} onChange={(event) => setOverrideValue(event.target.value)} /></label>
            <label><span>Reason</span><textarea rows={3} value={overrideReason} onChange={(event) => setOverrideReason(event.target.value)} /></label>
            <label><span>Evidence file ID</span><input value={overrideEvidenceFileId} onChange={(event) => setOverrideEvidenceFileId(event.target.value)} /></label>
            <button className="primary-button" type="button" onClick={() => void approve(true)} disabled={!canApprove || !openApproval || !overrideField || !overrideOriginal || !overrideValue || !overrideReason || !overrideEvidenceFileId}>Approve Override + Lock</button>
          </section>
        </section>

        <section className="panel wide-panel">
          <h2>Approvals and audit timeline</h2>
          <div className="timeline-list">
            {(detail.approvals ?? []).map((approval) => <article key={approval.approval_record_id}><strong>{approval.approval_code}</strong><p><span className={badgeClass(approval.approval_status)}>{approval.approval_status}</span> {approval.approval_type}</p><p>{approval.approval_comment}</p></article>)}
            {(detail.audit_trail ?? []).map((event, index) => <article key={`${String(event.id ?? index)}`}><strong>{String(event.event_type ?? 'audit.event')}</strong><p>{safeDate(String(event.created_at ?? event.timestamp ?? ''))}</p><p className="muted-text">{String(event.entity_type ?? '')} {String(event.entity_id ?? '')}</p></article>)}
          </div>
          {(detail.audit_trail ?? []).length === 0 && <p>No audit trail returned.</p>}
        </section>

        <section className="panel wide-panel"><h2>Raw detail fallback</h2><pre className="json-panel">{renderJson({ review: detail, checklistRows })}</pre></section>
      </>}
    </main>
  );
}
