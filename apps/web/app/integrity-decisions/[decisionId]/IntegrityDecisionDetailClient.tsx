'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../../lib/api-client';

type CurrentUser = { permissions?: string[]; roles?: string[] };
type Gate = { gate_type: string; gate_status: string; blocking: boolean; message: string; metadata?: Record<string, unknown> };
type EvidenceLink = { evidence_link_id: string; evidence_file_id: string; evidence_code?: string; original_filename?: string; checksum_sha256?: string; upload_status?: string; link_reason?: string; created_at?: string };
type AuditEvent = { audit_log_id: string; event_type?: string; actor_role_codes?: string[]; created_at?: string; metadata?: unknown };
type IntegrityDecisionDetail = {
  integrity_decision_id: string;
  decision_code?: string;
  asset_id?: string;
  inspection_event_id?: string;
  calculation_run_id?: string;
  integrity_status?: string;
  decision_status?: string;
  decision_summary?: string;
  required_action?: string;
  operating_limitation?: string;
  due_date?: string;
  reviewed_at?: string;
  approved_at?: string;
  linked_evidence?: EvidenceLink[];
  audit_events?: AuditEvent[];
  linked_context?: Record<string, unknown>;
};
type DecisionReadiness = {
  ready_for_downstream_use: boolean;
  blocking_gate_count: number;
  gates: Gate[];
  blocking_gates: Gate[];
  linked_evidence: EvidenceLink[];
  evidence_counts?: Record<string, number>;
  linked_context?: Record<string, unknown>;
  audit_events?: AuditEvent[];
  read_only?: boolean;
  governance_boundary?: string;
};

type EvidenceRecord = { evidence_id: string; evidence_code?: string; original_filename?: string; file_name?: string };

function hasPermission(user: CurrentUser | null, permission: string): boolean {
  return Boolean(user?.roles?.includes('admin') || user?.permissions?.includes(permission));
}

function renderJson(value: unknown): string {
  try { return JSON.stringify(value, null, 2); } catch { return String(value); }
}

function safeDate(value?: string | null): string { return value ? value.slice(0, 19).replace('T', ' ') : '-'; }
function badgeClass(status?: string): string {
  const value = String(status ?? '').toLowerCase();
  if (value.includes('fail') || value.includes('reject') || value.includes('blocked')) return 'badge badge-danger';
  if (value.includes('pass') || value.includes('approved') || value.includes('ready')) return 'badge';
  return 'badge badge-warning';
}

function messageFromPayload(payload: Record<string, unknown>, fallback = 'Request failed.'): string {
  const error = payload.error as { message?: string; code?: string } | undefined;
  return error?.message ?? error?.code ?? fallback;
}

export default function IntegrityDecisionDetailClient({ decisionId }: { decisionId: string }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [detail, setDetail] = useState<IntegrityDecisionDetail | null>(null);
  const [readiness, setReadiness] = useState<DecisionReadiness | null>(null);
  const [evidence, setEvidence] = useState<EvidenceRecord[]>([]);
  const [evidenceId, setEvidenceId] = useState('');
  const [approvalComment, setApprovalComment] = useState('Senior/lead engineer approval after direct evidence, calculation, review, and decision-readiness checks passed.');
  const [message, setMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);

  const canApprove = hasPermission(user, 'integrity_decision.approve');
  const canLinkEvidence = hasPermission(user, 'evidence.link');
  const approved = detail?.decision_status === 'approved';
  const blockingBeforeApprovalComment = useMemo(() => readiness?.blocking_gates ?? [], [readiness]);
  const linkedEvidence = readiness?.linked_evidence ?? detail?.linked_evidence ?? [];

  async function loadDetail() {
    const [meRes, detailRes, readinessRes, evidenceRes] = await Promise.all([
      apiFetch('/api/v1/auth/me', { cache: 'no-store' }),
      apiFetch(`/api/v1/integrity-decisions/${decisionId}`, { cache: 'no-store' }),
      apiFetch(`/api/v1/integrity-decisions/${decisionId}/readiness`, { cache: 'no-store' }),
      apiFetch('/api/v1/evidence', { cache: 'no-store' })
    ]);
    const [mePayload, detailPayload, readinessPayload, evidencePayload] = await Promise.all([
      meRes.json().catch(() => ({})),
      detailRes.json().catch(() => ({})),
      readinessRes.json().catch(() => ({})),
      evidenceRes.json().catch(() => ({}))
    ]);
    if (meRes.ok) setUser(mePayload.data?.user ?? null);
    if (detailRes.ok) setDetail(detailPayload.data as IntegrityDecisionDetail);
    else setMessage(messageFromPayload(detailPayload, 'Integrity decision detail could not be loaded.'));
    if (readinessRes.ok) setReadiness(readinessPayload.data as DecisionReadiness);
    if (evidenceRes.ok) {
      const rows = (evidencePayload.data ?? []) as EvidenceRecord[];
      setEvidence(rows);
      if (!evidenceId && rows[0]?.evidence_id) setEvidenceId(rows[0].evidence_id);
    }
  }

  useEffect(() => { void loadDetail(); }, [decisionId]);

  async function linkEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    if (!evidenceId) {
      setMessage('Select evidence before linking.');
      return;
    }
    const response = await apiFetch(`/api/v1/evidence/${evidenceId}/links`, {
      method: 'POST',
      body: JSON.stringify({
        linked_entity_type: 'integrity_decision',
        linked_entity_id: decisionId,
        link_reason: 'RC4-N integrity decision detail direct evidence linkage.'
      })
    });
    const payload = await response.json().catch(() => ({}));
    setSelected(payload.data ?? payload.error ?? null);
    setMessage(response.ok ? 'Evidence linked to integrity decision.' : messageFromPayload(payload));
    await loadDetail();
  }

  async function approveDecision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const response = await apiFetch(`/api/v1/integrity-decisions/${decisionId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approval_comment: approvalComment })
    });
    const payload = await response.json().catch(() => ({}));
    setSelected(payload.data ?? payload.error ?? null);
    setMessage(response.ok ? 'Integrity decision approved and audit logged.' : messageFromPayload(payload));
    await loadDetail();
  }

  if (!detail) {
    return <main><p>Loading integrity decision detail...</p>{message && <p>{message}</p>}<Link href="/integrity-decisions">Back to integrity decisions</Link></main>;
  }

  return (
    <main>
      <p>RC4-N integrity decision detail and decision readiness</p>
      <h1>{detail.decision_code ?? detail.integrity_decision_id}</h1>
      <p>{detail.decision_summary}</p>
      <nav><Link href="/integrity-decisions">Integrity Decisions</Link> | <Link href={`/calculations/${detail.calculation_run_id}`}>Calculation</Link> | <Link href="/reports">Reports</Link> | <Link href="/work-orders">Work Orders</Link> | <Link href="/evidence">Evidence</Link></nav>

      <section className="panel-grid">
        <article className="summary-card"><strong>Decision status</strong><br /><span className={badgeClass(detail.decision_status)}>{detail.decision_status}</span><p>{approved ? `Approved at ${safeDate(detail.approved_at)}` : 'Awaiting senior human approval.'}</p></article>
        <article className="summary-card"><strong>Downstream readiness</strong><br /><span className={badgeClass(readiness?.ready_for_downstream_use ? 'ready' : 'blocked')}>{readiness?.ready_for_downstream_use ? 'ready' : 'blocked'}</span><p>{readiness?.blocking_gate_count ?? '-'} blocking gate(s).</p></article>
        <article className="summary-card"><strong>Evidence</strong><br /><span className={badgeClass(linkedEvidence.length > 0 ? 'pass' : 'fail')}>{linkedEvidence.length} direct link(s)</span><p>Direct integrity-decision evidence remains mandatory before approval.</p></article>
      </section>

      {message && <section><p>{message}</p></section>}

      <section>
        <h2>Decision Readiness Gates</h2>
        <p>Read-only preview from <code>/api/v1/integrity-decisions/{'{decisionId}'}/readiness</code>. Approval, report issue, and work-order creation endpoints remain authoritative.</p>
        <table>
          <thead><tr><th>Gate</th><th>Status</th><th>Blocking</th><th>Message</th></tr></thead>
          <tbody>{(readiness?.gates ?? []).map((gate) => <tr key={gate.gate_type}><td>{gate.gate_type}</td><td><span className={badgeClass(gate.gate_status)}>{gate.gate_status}</span></td><td>{gate.blocking ? 'yes' : 'no'}</td><td>{gate.message}</td></tr>)}</tbody>
        </table>
      </section>

      <section className="panel-grid">
        <article>
          <h2>Link Direct Evidence</h2>
          <form onSubmit={linkEvidence}>
            <label>Evidence<select value={evidenceId} onChange={(event) => setEvidenceId(event.target.value)}><option value="">Select evidence</option>{evidence.map((item) => <option key={item.evidence_id} value={item.evidence_id}>{item.evidence_code ?? item.evidence_id} — {item.original_filename ?? item.file_name}</option>)}</select></label>
            <button type="submit" disabled={!canLinkEvidence}>Link evidence</button>
          </form>
        </article>
        <article>
          <h2>Approve Decision</h2>
          <form onSubmit={approveDecision}>
            <label>Approval comment<textarea value={approvalComment} onChange={(event) => setApprovalComment(event.target.value)} /></label>
            <button type="submit" disabled={!canApprove || approved || blockingBeforeApprovalComment.some((gate) => gate.gate_type !== 'decision_approved_for_downstream_use')}>Approve and audit</button>
          </form>
          <p>AI/n8n/service actors cannot approve final integrity decisions.</p>
        </article>
      </section>

      <section>
        <h2>Linked Evidence</h2>
        <table><thead><tr><th>Evidence</th><th>Filename</th><th>Reason</th><th>Checksum</th></tr></thead><tbody>{linkedEvidence.map((item) => <tr key={item.evidence_link_id}><td><Link href={`/evidence/${item.evidence_file_id}`}>{item.evidence_code ?? item.evidence_link_id}</Link></td><td>{item.original_filename ?? '-'}</td><td>{item.link_reason ?? '-'}</td><td>{item.checksum_sha256 ?? '-'}</td></tr>)}</tbody></table>
      </section>

      <section>
        <h2>Decision Traceability</h2>
        <div className="grid-two"><article><h3>Source and downstream context</h3><pre>{renderJson(readiness?.linked_context ?? detail.linked_context)}</pre></article><article><h3>Decision fields</h3><pre>{renderJson({ integrity_status: detail.integrity_status, required_action: detail.required_action, operating_limitation: detail.operating_limitation, due_date: detail.due_date })}</pre></article></div>
      </section>

      <section>
        <h2>Audit Timeline</h2>
        <div className="timeline-list">{(readiness?.audit_events ?? detail.audit_events ?? []).map((event) => <article key={event.audit_log_id}><strong>{event.event_type}</strong><br /><small>{safeDate(event.created_at)} — {(event.actor_role_codes ?? []).join(', ') || 'system'}</small><pre>{renderJson(event.metadata)}</pre></article>)}</div>
      </section>

      <section><h2>Gate/API Response</h2><pre>{selected ? renderJson(selected) : renderJson(readiness)}</pre></section>
    </main>
  );
}
