'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api-client';

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
  entity_type: string;
  entity_id: string;
  calculation_run_id?: string;
  approval_status: string;
  approval_type: string;
  reason?: string;
  locked_flag: boolean;
};

function renderJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default function EngineeringReviewClient() {
  const [runs, setRuns] = useState<CalculationRun[]>([]);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([]);
  const [calculationRunId, setCalculationRunId] = useState('');
  const [comment, setComment] = useState('Engineer review checklist completed. Calculation output is ready for senior approval.');
  const [message, setMessage] = useState<string | null>(null);

  async function loadData() {
    const [runRes, reviewRes, approvalRes] = await Promise.all([
      apiFetch('/api/v1/engineering/calculations', { cache: 'no-store' }),
      apiFetch('/api/v1/engineering/reviews', { cache: 'no-store' }),
      apiFetch('/api/v1/approval-records', { cache: 'no-store' })
    ]);
    const runPayload = await runRes.json();
    const reviewPayload = await reviewRes.json();
    const approvalPayload = await approvalRes.json();
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
          validation_result_reviewed: true,
          evidence_traceability_reviewed: true,
          formula_version_reviewed: true,
          warnings_reviewed: true
        }
      })
    });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload?.error?.message ?? 'Review creation failed.');
      return;
    }
    setMessage(`Review ${payload.data.review_code} created.`);
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
        approval_comment: 'Submitted for senior engineer final approval.',
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

  async function approve(record: ApprovalRecord) {
    setMessage(null);
    const response = await apiFetch(`/api/v1/approval-records/${record.approval_record_id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approval_comment: 'Senior engineer approved final result and locked the calculation run.' })
    });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload?.error?.message ?? 'Approval failed.');
      return;
    }
    setMessage(`Approval ${payload.data.approval_code} approved and locked.`);
    await loadData();
  }

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Sprint 9</p>
          <h1>Engineering Review and Approval Workflow</h1>
          <p>Engineer review, senior engineer approval, override governance, comments, checklist, locking, and audit trail.</p>
        </div>
        <div className="action-row">
          <Link className="secondary-button" href="/calculations">Calculations</Link>
          <Link className="secondary-button" href="/ffs">FFS</Link>
          <Link className="secondary-button" href="/rbi">RBI</Link>
        </div>
      </header>

      <section className="grid-two">
        <form className="panel" onSubmit={createReview}>
          <div className="panel-heading">
            <h2>Create Review</h2>
            <p>Select a calculation run and submit an engineering review checklist.</p>
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
          <button className="primary-button" type="submit" disabled={!calculationRunId}>Create Engineering Review</button>
          {message && <div className="notice">{message}</div>}
        </form>

        <section className="panel">
          <div className="panel-heading">
            <h2>Approval Queue</h2>
            <p>Senior engineer approval locks final results. AI agents cannot approve, reject, or override.</p>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Review</th><th>Status</th><th>Revision</th><th>Action</th></tr></thead>
              <tbody>
                {reviews.map((review) => (
                  <tr key={review.review_id}>
                    <td>{review.review_code}<br /><small>{review.review_type}</small></td>
                    <td><span className="badge">{review.review_status}</span></td>
                    <td>{review.revision_no}</td>
                    <td><button className="secondary-button" type="button" onClick={() => void createApproval(review)} disabled={review.locked_flag}>Request Approval</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3>Approval Records</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Approval</th><th>Status</th><th>Type</th><th>Action</th></tr></thead>
              <tbody>
                {approvals.map((approval) => (
                  <tr key={approval.approval_record_id}>
                    <td>{approval.approval_code}</td>
                    <td><span className="badge">{approval.approval_status}</span></td>
                    <td>{approval.approval_type}</td>
                    <td><button className="primary-button" type="button" onClick={() => void approve(approval)} disabled={approval.locked_flag || approval.approval_status === 'approved'}>Approve + Lock</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3>Raw Audit Context</h3>
          <textarea readOnly rows={8} value={renderJson({ reviews, approvals })} />
        </section>
      </section>
    </main>
  );
}
