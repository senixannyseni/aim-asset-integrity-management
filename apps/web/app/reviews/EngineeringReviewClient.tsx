'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../lib/api-client';

type CurrentUser = { permissions?: string[]; roles?: string[] };
type CalculationRun = {
  calculation_run_id: string;
  run_id: string;
  asset_id: string;
  review_status: string;
  approval_status: string;
  locked_flag: boolean;
  created_at: string;
};

type ReviewRecord = {
  review_id: string;
  review_code: string;
  entity_type: string;
  entity_id: string;
  calculation_run_id?: string;
  review_status: string;
  review_type: string;
  review_comment?: string;
  locked_flag: boolean;
  revision_no: number;
};

type ApprovalRecord = {
  approval_record_id: string;
  approval_code: string;
  review_id?: string;
  entity_type: string;
  entity_id: string;
  calculation_run_id?: string;
  approval_status: string;
  approval_type: string;
  reason?: string;
  locked_flag: boolean;
};

function hasPermission(user: CurrentUser | null, permission: string): boolean {
  return Boolean(user?.roles?.includes('admin') || user?.permissions?.includes(permission));
}

function badgeClass(status?: string): string {
  const value = String(status ?? '').toLowerCase();
  if (value.includes('reject') || value.includes('locked')) return 'badge badge-danger';
  if (value.includes('review') || value.includes('submit') || value.includes('draft')) return 'badge badge-warning';
  return 'badge';
}

export default function EngineeringReviewClient() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [runs, setRuns] = useState<CalculationRun[]>([]);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([]);
  const [calculationRunId, setCalculationRunId] = useState('');
  const [comment, setComment] = useState('Engineer review checklist created. Complete the structured checklist in review detail before requesting approval.');
  const [message, setMessage] = useState<string | null>(null);

  const canCreateReview = hasPermission(user, 'engineering_review.create');
  const canCreateApproval = hasPermission(user, 'approval_record.create');
  const canApprove = hasPermission(user, 'approval_record.approve');
  const canReject = hasPermission(user, 'approval_record.reject');
  const canRead = hasPermission(user, 'engineering_review.read');

  async function loadData() {
    const [meRes, runRes, reviewRes, approvalRes] = await Promise.all([
      apiFetch('/api/v1/auth/me', { cache: 'no-store' }),
      apiFetch('/api/v1/engineering/calculations', { cache: 'no-store' }),
      apiFetch('/api/v1/engineering/reviews', { cache: 'no-store' }),
      apiFetch('/api/v1/approval-records', { cache: 'no-store' })
    ]);
    const [mePayload, runPayload, reviewPayload, approvalPayload] = await Promise.all([
      meRes.json().catch(() => ({})),
      runRes.json().catch(() => ({})),
      reviewRes.json().catch(() => ({})),
      approvalRes.json().catch(() => ({}))
    ]);
    if (meRes.ok) setUser(mePayload.data?.user ?? null);
    if (runRes.ok) {
      const rows = (runPayload.data ?? []) as CalculationRun[];
      setRuns(rows);
      if (!calculationRunId && rows[0]?.calculation_run_id) setCalculationRunId(rows[0].calculation_run_id);
    }
    if (reviewRes.ok) setReviews((reviewPayload.data ?? []) as ReviewRecord[]);
    if (approvalRes.ok) setApprovals((approvalPayload.data ?? []) as ApprovalRecord[]);
  }

  useEffect(() => {
    void loadData();
  }, []);

  const reviewedRows = useMemo(() => reviews.filter((review) => review.review_status === 'reviewed' && !review.locked_flag), [reviews]);

  async function createReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const response = await apiFetch('/api/v1/engineering/reviews', {
      method: 'POST',
      body: JSON.stringify({
        entity_type: 'calculation_run',
        entity_id: calculationRunId,
        calculation_run_id: calculationRunId,
        review_type: 'calculation_result_review',
        review_status: 'submitted_for_review',
        review_comment: comment,
        checklist: {
          validation_result_reviewed: { status: 'pending', comment: '' },
          evidence_traceability_reviewed: { status: 'pending', comment: '' },
          formula_version_reviewed: { status: 'pending', comment: '' },
          warnings_reviewed: { status: 'pending', comment: '' }
        }
      })
    });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload?.error?.message ?? 'Review creation failed.');
      return;
    }
    setMessage(`Review ${payload.data.review_code} created. Open the detail page to complete checklist, comments, and approval.`);
    await loadData();
  }

  async function createApproval(review: ReviewRecord) {
    setMessage(null);
    const response = await apiFetch('/api/v1/approval-records', {
      method: 'POST',
      body: JSON.stringify({
        review_id: review.review_id,
        entity_type: review.entity_type,
        entity_id: review.entity_id,
        calculation_run_id: review.calculation_run_id,
        approval_type: 'final_result',
        approval_comment: 'Submitted for senior/lead engineer final approval after structured review checklist passed.',
        checklist: {
          review_status_confirmed: review.review_status,
          override_not_requested: true
        }
      })
    });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload?.error?.message ?? 'Approval request failed.');
      return;
    }
    setMessage(`Approval ${payload.data.approval_code} requested.`);
    await loadData();
  }

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">RC4-J Engineering Review</p>
          <h1>Engineering Review and Approval Workflow</h1>
          <p>Structured checklist review, threaded comments, rejection with reason, controlled overrides, revision creation, and permission-aware approval visibility.</p>
        </div>
        <div className="action-row">
          <Link className="secondary-button" href="/calculations">Calculations</Link>
          <Link className="secondary-button" href="/ffs">FFS</Link>
          <Link className="secondary-button" href="/rbi">RBI</Link>
        </div>
      </header>

      {message && <div className="notice">{message}</div>}
      {!canRead && <section className="error-list"><h2>Permission warning</h2><p>Your account could not confirm engineering_review.read. Backend permissions remain authoritative.</p></section>}

      <section className="grid-two">
        <form className="panel" onSubmit={createReview}>
          <div className="panel-heading">
            <h2>Create Review</h2>
            <p>Creates a review shell. The review cannot be submitted for approval until its detail checklist is completed as pass/not applicable.</p>
          </div>
          <label>
            <span>Calculation Run</span>
            <select value={calculationRunId} onChange={(event) => setCalculationRunId(event.target.value)} required>
              {runs.map((run) => (
                <option key={run.calculation_run_id} value={run.calculation_run_id}>{run.run_id} — {run.review_status}/{run.approval_status}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Review comment</span>
            <textarea rows={5} value={comment} onChange={(event) => setComment(event.target.value)} />
          </label>
          <button className="primary-button" type="submit" disabled={!calculationRunId || !canCreateReview}>Create Engineering Review</button>
          {!canCreateReview && <p className="muted-text">Hidden/disabled because engineering_review.create is not present for this user.</p>}
        </form>

        <section className="panel">
          <div className="panel-heading">
            <h2>Approval Requests</h2>
            <p>Only reviews with status <code>reviewed</code> can be submitted for final approval. AI agents cannot approve, reject, or override.</p>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Review</th><th>Status</th><th>Revision</th><th>Actions</th></tr></thead>
              <tbody>
                {reviews.map((review) => (
                  <tr key={review.review_id}>
                    <td><Link href={`/reviews/${review.review_id}`}>{review.review_code}</Link><br /><small>{review.review_type}</small></td>
                    <td><span className={badgeClass(review.review_status)}>{review.review_status}</span></td>
                    <td>{review.revision_no}</td>
                    <td className="action-row">
                      <Link className="secondary-button" href={`/reviews/${review.review_id}`}>Open</Link>
                      <button className="secondary-button" type="button" onClick={() => void createApproval(review)} disabled={!canCreateApproval || review.locked_flag || review.review_status !== 'reviewed'}>Request Approval</button>
                    </td>
                  </tr>
                ))}
                {reviews.length === 0 && <tr><td colSpan={4}>No engineering reviews found.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="muted-text">Ready for approval: {reviewedRows.length}. Approval button is permission-aware and backend-gated.</p>
        </section>
      </section>

      <section className="panel wide-panel">
        <div className="panel-heading">
          <h2>Approval Records</h2>
          <p>Use the detail page for reject reasons and override evidence. This list shows current approval state.</p>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Approval</th><th>Review</th><th>Status</th><th>Type</th><th>Authority</th></tr></thead>
            <tbody>
              {approvals.map((approval) => (
                <tr key={approval.approval_record_id}>
                  <td>{approval.approval_code}</td>
                  <td>{approval.review_id ? <Link href={`/reviews/${approval.review_id}`}>{approval.review_id}</Link> : '-'}</td>
                  <td><span className={badgeClass(approval.approval_status)}>{approval.approval_status}</span></td>
                  <td>{approval.approval_type}</td>
                  <td>{canApprove || canReject ? 'approve/reject visible in detail' : 'read-only for this user'}</td>
                </tr>
              ))}
              {approvals.length === 0 && <tr><td colSpan={5}>No approval records found.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
