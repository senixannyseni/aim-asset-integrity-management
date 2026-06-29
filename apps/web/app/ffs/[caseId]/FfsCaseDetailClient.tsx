'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api-client';

type FfsCase = {
  id: string;
  case_id: string;
  asset_id: string;
  inspection_event_id?: string | null;
  calculation_run_id?: string | null;
  component?: string | null;
  damage_mechanism?: string | null;
  trigger_source?: string | null;
  trigger_reason?: string | null;
  trigger_rule_id?: string | null;
  severity?: string | null;
  status: string;
  due_date?: string | null;
  required_next_action?: string | null;
  final_disposition?: string | null;
  approval_record_id?: string | null;
  evidence_links?: unknown[];
  trigger_measurements?: unknown[];
};

type Gate = {
  gate_type: string;
  gate_status: 'pass' | 'warning' | 'fail';
  blocking: boolean;
  message: string;
  metadata?: Record<string, unknown>;
};

type TraceRow = {
  id?: string;
  code?: string;
  title?: string;
  status?: string;
  type?: string;
  severity?: string;
  created_at?: string;
  updated_at?: string;
};

type Readiness = {
  ffs_case_id: string;
  case_id: string;
  asset_id: string;
  inspection_event_id?: string | null;
  calculation_run_id?: string | null;
  final_disposition_ready: boolean;
  final_disposition_recorded: boolean;
  gate_summary?: Record<string, number>;
  readiness_gates: Gate[];
  evidence_traceability?: {
    linked_evidence_count?: number;
    snapshot_evidence_ids?: string[];
    linked_evidence?: TraceRow[];
  };
  linked_context?: {
    asset?: TraceRow | null;
    inspection_event?: TraceRow | null;
    calculation_run?: TraceRow | null;
    findings?: TraceRow[];
    engineering_reviews?: TraceRow[];
    approval_records?: TraceRow[];
    reports?: TraceRow[];
    work_orders?: TraceRow[];
  };
  audit_events?: TraceRow[];
  governance_notes?: string[];
};

function renderJson(value: unknown): string {
  try {
    return JSON.stringify(value ?? null, null, 2);
  } catch {
    return String(value);
  }
}

function traceLabel(row: TraceRow): string {
  return [row.code, row.title, row.status].filter(Boolean).join(' — ') || row.id || 'Trace record';
}

function traceRows(rows: TraceRow[] | undefined, empty: string) {
  if (!rows || rows.length === 0) return <p className="muted">{empty}</p>;
  return (
    <ul className="trace-list">
      {rows.map((row, index) => (
        <li key={`${row.id ?? row.code ?? index}`}>
          <strong>{traceLabel(row)}</strong>
          <span>{row.type ?? row.severity ?? row.created_at ?? ''}</span>
        </li>
      ))}
    </ul>
  );
}

export default function FfsCaseDetailClient({ caseId }: { caseId: string }) {
  const [ffsCase, setFfsCase] = useState<FfsCase | null>(null);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [finalDisposition, setFinalDisposition] = useState('Senior engineer disposition pending.');
  const [approvalComment, setApprovalComment] = useState('Senior engineer reviewed FFS case evidence and approved final disposition.');
  const [message, setMessage] = useState<string | null>(null);

  async function loadDetail() {
    setMessage(null);
    const [caseResponse, readinessResponse] = await Promise.all([
      apiFetch(`/api/v1/ffs/cases/${encodeURIComponent(caseId)}`, { cache: 'no-store' }),
      apiFetch(`/api/v1/ffs/cases/${encodeURIComponent(caseId)}/readiness`, { cache: 'no-store' })
    ]);
    const casePayload = await caseResponse.json();
    const readinessPayload = await readinessResponse.json();
    if (caseResponse.ok) setFfsCase(casePayload.data as FfsCase);
    if (readinessResponse.ok) setReadiness(readinessPayload.data as Readiness);
    if (!caseResponse.ok || !readinessResponse.ok) {
      setMessage(casePayload?.error?.message ?? readinessPayload?.error?.message ?? 'Unable to load FFS case detail.');
    }
  }

  useEffect(() => {
    void loadDetail();
  }, [caseId]);

  async function approveFinalDisposition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const response = await apiFetch(`/api/v1/ffs/cases/${encodeURIComponent(caseId)}/close`, {
      method: 'POST',
      body: JSON.stringify({ final_disposition: finalDisposition, approval_comment: approvalComment })
    });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload?.error?.message ?? 'Final FFS disposition approval failed.');
      return;
    }
    setMessage('Final FFS disposition approved and case closed.');
    await loadDetail();
  }

  const gates = readiness?.readiness_gates ?? [];
  const context = readiness?.linked_context ?? {};

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">RC4-S</p>
          <h1>FFS Disposition Readiness</h1>
          <p>
            FFS case detail, supporting evidence, calculation trigger trace, human review and approval trace, and downstream report/work-order traceability.
            No API 579/API 581/FFS/RBI/corrosion-rate/remaining-life formula is executed by this page.
          </p>
        </div>
        <div className="action-row">
          <Link className="secondary-button" href="/ffs">FFS Cases</Link>
          {ffsCase?.asset_id && <Link className="secondary-button" href={`/assets/${ffsCase.asset_id}`}>Asset</Link>}
          {ffsCase?.calculation_run_id && <Link className="secondary-button" href={`/calculations/${ffsCase.calculation_run_id}`}>Calculation</Link>}
        </div>
      </header>

      {message && <div className="notice">{message}</div>}

      <section className="grid-two">
        <section className="panel">
          <div className="panel-heading">
            <h2>{ffsCase?.case_id ?? 'FFS case'}</h2>
            <p>Final FFS disposition remains senior human-gated. AI/n8n/service actors cannot approve final FFS disposition.</p>
          </div>
          <div className="metric-grid">
            <div className="metric-card"><span>Status</span><strong>{ffsCase?.status ?? 'loading'}</strong></div>
            <div className="metric-card"><span>Severity</span><strong>{ffsCase?.severity ?? 'n/a'}</strong></div>
            <div className="metric-card"><span>Ready</span><strong>{readiness?.final_disposition_ready ? 'Yes' : 'No'}</strong></div>
            <div className="metric-card"><span>Recorded</span><strong>{readiness?.final_disposition_recorded ? 'Yes' : 'No'}</strong></div>
          </div>
          <dl className="detail-grid">
            <dt>Component</dt><dd>{ffsCase?.component ?? 'n/a'}</dd>
            <dt>Damage mechanism</dt><dd>{ffsCase?.damage_mechanism ?? 'n/a'}</dd>
            <dt>Trigger source</dt><dd>{ffsCase?.trigger_source ?? 'n/a'}</dd>
            <dt>Trigger rule</dt><dd>{ffsCase?.trigger_rule_id ?? 'n/a'}</dd>
            <dt>Due date</dt><dd>{ffsCase?.due_date ?? 'n/a'}</dd>
            <dt>Final disposition</dt><dd>{ffsCase?.final_disposition ?? 'Not recorded'}</dd>
          </dl>
          <h3>Trigger Reason</h3>
          <p>{ffsCase?.trigger_reason ?? 'No trigger reason loaded.'}</p>
          <h3>Required Next Action</h3>
          <p>{ffsCase?.required_next_action ?? 'No next action loaded.'}</p>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <h2>Final Disposition Action</h2>
            <p>Uses the existing senior_engineer/admin close endpoint. Readiness preview does not approve or mutate records.</p>
          </div>
          <form onSubmit={approveFinalDisposition} className="stacked-form">
            <label>
              <span>Final disposition</span>
              <textarea value={finalDisposition} onChange={(event) => setFinalDisposition(event.target.value)} rows={4} required />
            </label>
            <label>
              <span>Approval comment</span>
              <textarea value={approvalComment} onChange={(event) => setApprovalComment(event.target.value)} rows={4} required />
            </label>
            <button className="primary-button" type="submit" disabled={ffsCase?.status === 'closed'}>Approve Final FFS Disposition</button>
          </form>
        </section>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Readiness Gates</h2>
          <p>Blocking gates must be clear before final disposition should be approved.</p>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Gate</th><th>Status</th><th>Blocking</th><th>Message</th></tr></thead>
            <tbody>
              {gates.map((gate) => (
                <tr key={gate.gate_type}>
                  <td>{gate.gate_type}</td>
                  <td><span className="badge">{gate.gate_status}</span></td>
                  <td>{gate.blocking ? 'Yes' : 'No'}</td>
                  <td>{gate.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid-two">
        <section className="panel">
          <div className="panel-heading"><h2>Evidence Linkage</h2><p>Supporting evidence linked to the FFS case.</p></div>
          {traceRows(readiness?.evidence_traceability?.linked_evidence, 'No linked FFS evidence found.')}
          <h3>Evidence Snapshot IDs</h3>
          <textarea readOnly value={renderJson(readiness?.evidence_traceability?.snapshot_evidence_ids ?? [])} rows={5} />
        </section>
        <section className="panel">
          <div className="panel-heading"><h2>Calculation Trigger Trace</h2><p>Deterministic calculation context that triggered the FFS case, when applicable.</p></div>
          {context.calculation_run ? traceRows([context.calculation_run], 'No calculation trigger trace found.') : <p className="muted">No calculation trigger trace found.</p>}
          <h3>Supporting Measurements</h3>
          <textarea readOnly value={renderJson(ffsCase?.trigger_measurements ?? [])} rows={6} />
        </section>
      </section>

      <section className="grid-two">
        <section className="panel">
          <div className="panel-heading"><h2>Review / Approval Trace</h2><p>Human review and senior disposition approval records.</p></div>
          <h3>Engineering Reviews</h3>
          {traceRows(context.engineering_reviews, 'No engineering reviews found.')}
          <h3>Approval Records</h3>
          {traceRows(context.approval_records, 'No approval records found.')}
        </section>
        <section className="panel">
          <div className="panel-heading"><h2>Downstream Traceability</h2><p>Findings, reports, and internal work orders linked to this FFS case context.</p></div>
          <h3>Findings</h3>
          {traceRows(context.findings, 'No findings linked to this FFS case context.')}
          <h3>Reports</h3>
          {traceRows(context.reports, 'No reports linked to this FFS case context.')}
          <h3>Work Orders</h3>
          {traceRows(context.work_orders, 'No work orders linked to this FFS case context.')}
        </section>
      </section>

      <section className="panel">
        <div className="panel-heading"><h2>Audit Timeline</h2><p>Read-only audit trace for the FFS case and calculation trigger.</p></div>
        {traceRows(readiness?.audit_events, 'No audit events found.')}
      </section>
    </main>
  );
}
