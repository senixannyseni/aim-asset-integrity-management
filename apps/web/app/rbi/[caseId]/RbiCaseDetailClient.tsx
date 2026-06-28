'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../../lib/api-client';

type RbiCase = {
  id: string;
  case_id: string;
  asset_id: string;
  inspection_event_id?: string | null;
  calculation_run_id?: string | null;
  system: string;
  component: string;
  damage_mechanism: string;
  probability_driver: string;
  consequence_driver: string;
  risk_category: string;
  recommended_interval: string;
  inspection_plan_reference: string;
  evidence_links?: Array<Record<string, unknown>>;
  input_placeholders?: Record<string, unknown>;
  trigger_source: string;
  trigger_reason: string;
  trigger_rule_id: string;
  calculation_basis: string;
  calculation_basis_note: string;
  status: string;
  reviewer?: string | null;
  approver?: string | null;
  reviewed_at?: string | null;
  approved_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type CurrentUser = { permissions?: string[]; roles?: string[] };
type ApiErrorPayload = { error?: { code?: string; message?: string; details?: Array<{ field: string; message: string; severity?: string }> } };

const reviewStatuses = ['under_review', 'data_required', 'assessment_in_progress', 'ready_for_review'];

function renderJson(value: unknown): string {
  try {
    return JSON.stringify(value ?? null, null, 2);
  } catch {
    return String(value);
  }
}

function dateValue(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleString() : '-';
}

function hasPermission(user: CurrentUser | null, permission: string): boolean {
  return Boolean(user?.roles?.includes('admin') || user?.permissions?.includes(permission));
}

function sourceFindings(rbiCase: RbiCase | null): Array<Record<string, unknown>> {
  const value = rbiCase?.input_placeholders?.source_findings;
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null) : [];
}

function RiskSummary({ rbiCase }: { rbiCase: RbiCase }) {
  return (
    <div className="risk-matrix detail-risk-matrix">
      <div className="risk-cell risk-axis">RBI driver</div>
      <div className="risk-cell"><strong>{rbiCase.probability_driver}</strong><span>Probability driver</span></div>
      <div className="risk-cell"><strong>{rbiCase.consequence_driver}</strong><span>Consequence driver</span></div>
      <div className="risk-cell"><strong>{rbiCase.risk_category}</strong><span>Placeholder risk</span></div>
      <div className="risk-cell risk-axis">Governance</div>
      <div className="risk-cell"><strong>Display-only</strong><span>No API RP 581 quantitative formula</span></div>
      <div className="risk-cell"><strong>Formula Registry required</strong><span>For production quantitative rules</span></div>
      <div className="risk-cell"><strong>Human review</strong><span>Required before export/close</span></div>
    </div>
  );
}

export default function RbiCaseDetailClient({ caseId }: { caseId: string }) {
  const [rbiCase, setRbiCase] = useState<RbiCase | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const canUpdate = hasPermission(user, 'rbi.interface.update');
  const canReview = hasPermission(user, 'rbi.interface.review');
  const canApprove = hasPermission(user, 'rbi.interface.approve');
  const canExport = hasPermission(user, 'rbi.interface.export');

  const findings = useMemo(() => sourceFindings(rbiCase), [rbiCase]);

  async function loadUser() {
    try {
      const response = await apiFetch('/api/v1/auth/me', { cache: 'no-store' });
      const payload = await response.json();
      if (response.ok) setUser(payload?.data?.user ?? null);
    } catch {
      setUser(null);
    }
  }

  async function loadCase() {
    setLoading(true);
    const response = await apiFetch(`/api/v1/rbi/cases/${encodeURIComponent(caseId)}`, { cache: 'no-store' });
    const payload = await response.json() as { data?: RbiCase } & ApiErrorPayload;
    setLoading(false);
    if (!response.ok) {
      setMessage(payload.error?.message ?? 'RBI case detail could not be loaded.');
      return;
    }
    setRbiCase(payload.data ?? null);
  }

  useEffect(() => {
    void loadUser();
    void loadCase();
  }, [caseId]);

  async function statusUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const status = String(new FormData(form).get('status') ?? 'under_review');
    setActionLoading(true);
    setMessage(null);
    const response = await apiFetch(`/api/v1/rbi/cases/${encodeURIComponent(caseId)}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    const payload = await response.json() as { data?: RbiCase } & ApiErrorPayload;
    setActionLoading(false);
    if (!response.ok) {
      setMessage(payload.error?.message ?? 'Status update failed.');
      return;
    }
    setMessage(`Status updated to ${payload.data?.status}.`);
    setRbiCase(payload.data ?? null);
  }

  async function reviewCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const status = String(data.get('review_status') ?? 'ready_for_review');
    const comment = String(data.get('comment') ?? '').trim();
    setActionLoading(true);
    setMessage(null);
    const response = await apiFetch(`/api/v1/rbi/cases/${encodeURIComponent(caseId)}/review`, { method: 'POST', body: JSON.stringify({ status, comment }) });
    const payload = await response.json() as { data?: RbiCase } & ApiErrorPayload;
    setActionLoading(false);
    if (!response.ok) {
      setMessage(payload.error?.message ?? 'Review action failed.');
      return;
    }
    setMessage(`Review recorded with status ${payload.data?.status}.`);
    setRbiCase(payload.data ?? null);
  }

  async function finalAction(path: 'approve' | 'export' | 'close', body: Record<string, unknown>) {
    setActionLoading(true);
    setMessage(null);
    const response = await apiFetch(`/api/v1/rbi/cases/${encodeURIComponent(caseId)}/${path}`, { method: 'POST', body: JSON.stringify(body) });
    const payload = await response.json() as { data?: RbiCase } & ApiErrorPayload;
    setActionLoading(false);
    if (!response.ok) {
      setMessage(payload.error?.message ?? `RBI ${path} action failed.`);
      return;
    }
    setMessage(`RBI case ${payload.data?.case_id} ${path} action recorded. Status: ${payload.data?.status}.`);
    setRbiCase(payload.data ?? null);
  }

  function closeCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const comment = String(new FormData(event.currentTarget).get('closure_comment') ?? '').trim();
    void finalAction('close', { closure_comment: comment });
  }

  if (loading) return <main className="app-shell"><div className="notice">Loading RBI case detail...</div></main>;
  if (!rbiCase) return <main className="app-shell"><div className="error-list">{message ?? 'RBI case not found.'}</div><Link href="/rbi">Back to RBI workflow</Link></main>;

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">RC4-I RBI detail</p>
          <h1>{rbiCase.case_id}</h1>
          <p>{rbiCase.trigger_reason}</p>
        </div>
        <div className="action-row"><Link className="secondary-button" href="/rbi">Back to RBI</Link><Link className="secondary-button" href={`/audit-logs?entity_type=rbi_case&entity_id=${rbiCase.id}`}>Audit log</Link></div>
      </header>

      {message && <div className="notice">{message}</div>}

      <section className="grid-two">
        <section className="panel">
          <div className="panel-heading"><h2>Case Summary</h2><p>Human-reviewed RBI interface record. It is not a quantitative API RP 581 calculation.</p></div>
          <div className="stat-row">
            <div className="stat-card"><strong>{rbiCase.status}</strong><span>Status</span></div>
            <div className="stat-card"><strong>{rbiCase.risk_category}</strong><span>Risk category</span></div>
            <div className="stat-card"><strong>{rbiCase.trigger_source}</strong><span>Trigger source</span></div>
          </div>
          <table><tbody>
            <tr><th>Asset</th><td><Link href={`/assets/${rbiCase.asset_id}`}>{rbiCase.asset_id}</Link></td></tr>
            <tr><th>Calculation</th><td>{rbiCase.calculation_run_id ? <Link href={`/calculations/${rbiCase.calculation_run_id}`}>{rbiCase.calculation_run_id}</Link> : '-'}</td></tr>
            <tr><th>Component</th><td>{rbiCase.component}</td></tr>
            <tr><th>Damage mechanism</th><td>{rbiCase.damage_mechanism}</td></tr>
            <tr><th>Recommended interval</th><td>{rbiCase.recommended_interval}</td></tr>
            <tr><th>Inspection plan reference</th><td>{rbiCase.inspection_plan_reference}</td></tr>
            <tr><th>Reviewed at</th><td>{dateValue(rbiCase.reviewed_at)}</td></tr>
            <tr><th>Approved at</th><td>{dateValue(rbiCase.approved_at)}</td></tr>
          </tbody></table>
        </section>

        <section className="panel">
          <div className="panel-heading"><h2>Placeholder Risk Matrix</h2><p>Display-only: no proprietary API RP 581 probability or consequence formulas are implemented.</p></div>
          <RiskSummary rbiCase={rbiCase} />
          <div className="notice">Production quantitative RBI requires approved Formula Registry rules and licensed engineering governance.</div>
        </section>
      </section>

      <section className="grid-two">
        <form className="panel" onSubmit={statusUpdate}>
          <div className="panel-heading"><h2>Status Update</h2><p>Non-final workflow status update. Final states use approval/export/close actions.</p></div>
          <label><span>Status</span><select name="status" defaultValue="under_review">{reviewStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
          <button className="primary-button" disabled={actionLoading || !canUpdate} type="submit">Update status</button>
          {!canUpdate && <p className="error-list">Permission required: rbi.interface.update</p>}
        </form>

        <form className="panel" onSubmit={reviewCase}>
          <div className="panel-heading"><h2>Review Action</h2><p>Engineer/QA review records reviewer, timestamp, comment, and audit event.</p></div>
          <label><span>Review status</span><select name="review_status" defaultValue="ready_for_review">{reviewStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
          <label><span>Comment</span><input name="comment" placeholder="Review note" /></label>
          <button className="primary-button" disabled={actionLoading || !canReview} type="submit">Record review</button>
          {!canReview && <p className="error-list">Permission required: rbi.interface.review</p>}
        </form>
      </section>

      <section className="grid-two">
        <section className="panel">
          <div className="panel-heading"><h2>Final Actions</h2><p>Visible only when RBAC permission is available. Backend still enforces senior-engineer/lead-engineer/admin authority and blocks AI actors.</p></div>
          <div className="action-row">
            {canApprove && <button className="primary-button" disabled={actionLoading} onClick={() => void finalAction('approve', { status: 'approved', comment: 'Approved from RBI detail page.' })}>Approve</button>}
            {canExport && <button className="secondary-button" disabled={actionLoading} onClick={() => void finalAction('export', { comment: 'Export action from RBI detail page.' })}>Export</button>}
            {!canApprove && !canExport && <p className="error-list">Permissions required: rbi.interface.approve / rbi.interface.export</p>}
          </div>
        </section>
        <form className="panel" onSubmit={closeCase}>
          <div className="panel-heading"><h2>Close Case</h2><p>Closure requires a comment/reason and senior-engineer/lead-engineer/admin authority.</p></div>
          <label><span>Closure comment</span><input name="closure_comment" required placeholder="Reason for closing this RBI interface case" /></label>
          <button className="primary-button" disabled={actionLoading || !canApprove} type="submit">Close RBI case</button>
        </form>
      </section>

      <section className="grid-two">
        <section className="panel">
          <div className="panel-heading"><h2>Evidence Links</h2><p>Evidence lineage from manual input, calculation inputs, or repeated findings history.</p></div>
          {(rbiCase.evidence_links ?? []).length === 0 ? <p>No evidence links stored on this RBI case.</p> : <div className="table-wrap"><table><thead><tr><th>Evidence</th><th>Source entity</th><th>Calculation</th></tr></thead><tbody>{(rbiCase.evidence_links ?? []).map((link, index) => <tr key={`${link.evidence_file_id}-${index}`}><td>{String(link.evidence_file_id ?? '-')}</td><td>{String(link.source_entity_type ?? '-')} {String(link.source_entity_id ?? '')}</td><td>{String(link.source_calculation_run_id ?? '-')}</td></tr>)}</tbody></table></div>}
        </section>
        <section className="panel">
          <div className="panel-heading"><h2>Finding History Source</h2><p>When created from repeated anomaly history, source findings are shown here.</p></div>
          {findings.length === 0 ? <p>No source findings embedded in this RBI case.</p> : <div className="table-wrap"><table><thead><tr><th>Finding</th><th>Type</th><th>Severity</th><th>Status</th></tr></thead><tbody>{findings.map((finding) => <tr key={String(finding.finding_id ?? finding.finding_code)}><td><Link href={`/findings/${finding.finding_code ?? finding.finding_id}`}>{String(finding.finding_code ?? finding.finding_id)}</Link></td><td>{String(finding.finding_type ?? '-')}</td><td>{String(finding.severity ?? '-')}</td><td>{String(finding.status ?? '-')}</td></tr>)}</tbody></table></div>}
        </section>
      </section>

      <section className="panel wide-panel">
        <div className="panel-heading"><h2>Input placeholders and governance metadata</h2><p>Read-only traceability payload. These placeholders are not engineering-approved quantitative formulas.</p></div>
        <pre>{renderJson(rbiCase.input_placeholders)}</pre>
      </section>
    </main>
  );
}
