'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../../lib/api-client';

type CurrentUser = { permissions?: string[]; roles?: string[] };
type WorkOrder = {
  work_order_id: string;
  work_order_code?: string;
  asset_id?: string;
  inspection_event_id?: string | null;
  integrity_decision_id?: string | null;
  report_id?: string | null;
  source_entity_type?: string;
  source_entity_id?: string;
  action_source?: string;
  title?: string;
  description?: string;
  priority?: string;
  status?: string;
  recommended_action?: string;
  assigned_to?: string | null;
  assigned_role?: string | null;
  due_date?: string | null;
  preliminary_internal_flag?: boolean;
  external_cmms_reference?: string | null;
  external_cmms_status?: string | null;
  gate_status?: string;
  gate_checklist?: unknown;
  closure_evidence_required?: boolean;
  closure_evidence_link_id?: string | null;
  closure_summary?: string | null;
  created_at?: string;
  closed_at?: string | null;
  linked_evidence?: EvidenceLink[];
  audit_events?: AuditEvent[];
  source_traceability?: Record<string, unknown>;
};
type Gate = { gate_type: string; gate_status: string; blocking: boolean; message: string; metadata?: Record<string, unknown> };
type EvidenceLink = {
  evidence_link_id: string;
  evidence_file_id?: string;
  evidence_code?: string;
  original_filename?: string;
  link_reason?: string;
  checksum_sha256?: string;
  created_at?: string;
};
type AuditEvent = { audit_log_id: string; event_type?: string; actor_role_codes?: string[]; request_id?: string | null; metadata?: unknown; created_at?: string };
type ClosureReadiness = {
  ready_to_close: boolean;
  ready_to_close_after_completion_note: boolean;
  completion_note_required: boolean;
  closure_evidence_required: boolean;
  blocking_gate_count: number;
  blocking_gate_count_excluding_completion_note: number;
  gates: Gate[];
  blocking_gates: Gate[];
  linked_evidence?: EvidenceLink[];
  audit_events?: AuditEvent[];
  source_traceability?: Record<string, unknown>;
  external_cmms_integration_implemented?: boolean;
};

type UpdateForm = {
  title: string;
  priority: string;
  status: string;
  assigned_role: string;
  due_date: string;
  recommended_action: string;
};

function hasPermission(user: CurrentUser | null, permission: string): boolean {
  return Boolean(user?.roles?.includes('admin') || user?.permissions?.includes(permission));
}

function renderJson(value: unknown): string {
  try { return JSON.stringify(value, null, 2); } catch { return String(value); }
}

function safeDate(value?: string | null): string { return value ? value.slice(0, 19).replace('T', ' ') : '-'; }
function badgeClass(status?: string): string {
  const value = String(status ?? '').toLowerCase();
  if (value.includes('fail') || value.includes('blocked') || value.includes('critical')) return 'badge badge-danger';
  if (value.includes('open') || value.includes('progress') || value.includes('high') || value.includes('pending')) return 'badge badge-warning';
  return 'badge';
}

function messageFromPayload(payload: Record<string, unknown>, fallback = 'Request failed.'): string {
  const error = payload.error as { message?: string; code?: string } | undefined;
  return error?.message ?? error?.code ?? fallback;
}

export default function WorkOrderDetailClient({ workOrderId }: { workOrderId: string }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [detail, setDetail] = useState<WorkOrder | null>(null);
  const [readiness, setReadiness] = useState<ClosureReadiness | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [completionNote, setCompletionNote] = useState('Work completed and closure evidence/traceability reviewed in AIM internal work-order fallback workflow.');
  const [closureEvidenceLinkId, setClosureEvidenceLinkId] = useState('');
  const [updateForm, setUpdateForm] = useState<UpdateForm>({ title: '', priority: 'medium', status: 'open', assigned_role: '', due_date: '', recommended_action: '' });

  const canUpdate = hasPermission(user, 'work_order.update');
  const canClose = hasPermission(user, 'work_order.close');
  const workOrderClosed = detail?.status === 'closed';
  const linkedEvidence = readiness?.linked_evidence ?? detail?.linked_evidence ?? [];
  const closureBlockedWithoutCompletionNote = useMemo(() => readiness?.blocking_gates?.filter((gate) => gate.gate_type !== 'completion_note_present') ?? [], [readiness]);

  async function loadDetail() {
    const [meRes, detailRes, readinessRes] = await Promise.all([
      apiFetch('/api/v1/auth/me', { cache: 'no-store' }),
      apiFetch(`/api/v1/work-orders/${workOrderId}`, { cache: 'no-store' }),
      apiFetch(`/api/v1/work-orders/${workOrderId}/closure-readiness`, { cache: 'no-store' })
    ]);
    const [mePayload, detailPayload, readinessPayload] = await Promise.all([
      meRes.json().catch(() => ({})),
      detailRes.json().catch(() => ({})),
      readinessRes.json().catch(() => ({}))
    ]);
    if (meRes.ok) setUser(mePayload.data?.user ?? null);
    if (detailRes.ok) {
      const loaded = detailPayload.data as WorkOrder;
      setDetail(loaded);
      setUpdateForm({
        title: loaded.title ?? '',
        priority: loaded.priority ?? 'medium',
        status: loaded.status ?? 'open',
        assigned_role: loaded.assigned_role ?? '',
        due_date: loaded.due_date?.slice(0, 10) ?? '',
        recommended_action: loaded.recommended_action ?? ''
      });
      if (!closureEvidenceLinkId && loaded.closure_evidence_link_id) setClosureEvidenceLinkId(loaded.closure_evidence_link_id);
    } else setMessage(messageFromPayload(detailPayload, 'Work order detail could not be loaded.'));
    if (readinessRes.ok) {
      const loadedReadiness = readinessPayload.data as ClosureReadiness;
      setReadiness(loadedReadiness);
      const firstLink = loadedReadiness.linked_evidence?.[0]?.evidence_link_id;
      if (!closureEvidenceLinkId && firstLink) setClosureEvidenceLinkId(firstLink);
    }
  }

  useEffect(() => { void loadDetail(); }, [workOrderId]);

  async function updateWorkOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const body: Record<string, string> = {
      title: updateForm.title,
      priority: updateForm.priority,
      status: updateForm.status,
      assigned_role: updateForm.assigned_role,
      due_date: updateForm.due_date,
      recommended_action: updateForm.recommended_action
    };
    const response = await apiFetch(`/api/v1/work-orders/${workOrderId}`, { method: 'PATCH', body: JSON.stringify(body) });
    const payload = await response.json().catch(() => ({}));
    setSelected(payload.data ?? payload.error ?? null);
    setMessage(response.ok ? 'Work order updated in AIM internal fallback workflow.' : messageFromPayload(payload));
    await loadDetail();
  }

  async function closeWorkOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const response = await apiFetch(`/api/v1/work-orders/${workOrderId}/close`, {
      method: 'POST',
      body: JSON.stringify({ completion_note: completionNote, closure_evidence_link_id: closureEvidenceLinkId || undefined })
    });
    const payload = await response.json().catch(() => ({}));
    setSelected(payload.data ?? payload.error ?? null);
    setMessage(response.ok ? 'Work order closed and audit logged.' : messageFromPayload(payload));
    await loadDetail();
  }

  if (!detail) {
    return <main><p>Loading work order detail...</p>{message && <p>{message}</p>}<Link href="/work-orders">Back to work orders</Link></main>;
  }

  return (
    <main>
      <p>RC4-L work order detail and closure readiness</p>
      <h1>{detail.work_order_code ?? detail.work_order_id}</h1>
      <p>{detail.title}</p>
      <nav><Link href="/work-orders">Work Orders</Link> | <Link href="/reports">Reports</Link> | <Link href="/integrity-decisions">Integrity Decisions</Link> | <Link href="/evidence">Evidence</Link></nav>

      <section className="panel-grid">
        <article className="summary-card"><strong>Status</strong><br /><span className={badgeClass(detail.status)}>{detail.status}</span><p>{workOrderClosed ? `Closed at ${safeDate(detail.closed_at)}` : 'Open internal AIM work-order fallback.'}</p></article>
        <article className="summary-card"><strong>Closure readiness</strong><br /><span className={badgeClass(readiness?.ready_to_close_after_completion_note ? 'pass' : 'fail')}>{readiness?.ready_to_close_after_completion_note ? 'Ready after completion note' : 'Blocked'}</span><p>{readiness?.blocking_gate_count_excluding_completion_note ?? '-'} blocking gate(s) excluding completion note.</p></article>
        <article className="summary-card"><strong>CMMS boundary</strong><br /><span className="badge">internal AIM only</span><p>{readiness?.external_cmms_integration_implemented ? 'Unexpected external integration flag.' : 'No SAP/Maximo/CMMS write.'}</p></article>
      </section>

      {message && <section><p>{message}</p></section>}

      <section>
        <h2>Closure Readiness Gates</h2>
        <p>Read-only preview from <code>/api/v1/work-orders/{'{workOrderId}'}/closure-readiness</code>. The close endpoint remains authoritative and requires a completion note.</p>
        <table>
          <thead><tr><th>Gate</th><th>Status</th><th>Blocking</th><th>Message</th></tr></thead>
          <tbody>{(readiness?.gates ?? []).map((gate) => <tr key={gate.gate_type}><td>{gate.gate_type}</td><td><span className={badgeClass(gate.gate_status)}>{gate.gate_status}</span></td><td>{gate.blocking ? 'yes' : 'no'}</td><td>{gate.message}</td></tr>)}</tbody>
        </table>
      </section>

      <section className="panel-grid">
        <article>
          <h2>Update Work Order</h2>
          <form onSubmit={updateWorkOrder}>
            <label>Title<input value={updateForm.title} onChange={(event) => setUpdateForm({ ...updateForm, title: event.target.value })} /></label>
            <label>Priority<select value={updateForm.priority} onChange={(event) => setUpdateForm({ ...updateForm, priority: event.target.value })}><option value="low">low</option><option value="medium">medium</option><option value="high">high</option><option value="critical">critical</option></select></label>
            <label>Status<select value={updateForm.status} onChange={(event) => setUpdateForm({ ...updateForm, status: event.target.value })}><option value="open">open</option><option value="in_progress">in_progress</option><option value="on_hold">on_hold</option></select></label>
            <label>Assigned role<input value={updateForm.assigned_role} onChange={(event) => setUpdateForm({ ...updateForm, assigned_role: event.target.value })} /></label>
            <label>Due date<input type="date" value={updateForm.due_date} onChange={(event) => setUpdateForm({ ...updateForm, due_date: event.target.value })} /></label>
            <label>Recommended action<textarea value={updateForm.recommended_action} onChange={(event) => setUpdateForm({ ...updateForm, recommended_action: event.target.value })} /></label>
            <button type="submit" disabled={!canUpdate || workOrderClosed}>Update</button>
          </form>
        </article>
        <article>
          <h2>Close Work Order</h2>
          <form onSubmit={closeWorkOrder}>
            <label>Completion note<textarea value={completionNote} onChange={(event) => setCompletionNote(event.target.value)} /></label>
            <label>Closure evidence link<select value={closureEvidenceLinkId} onChange={(event) => setClosureEvidenceLinkId(event.target.value)}><option value="">Use existing/non-required evidence</option>{linkedEvidence.map((item) => <option key={item.evidence_link_id} value={item.evidence_link_id}>{item.evidence_code ?? item.evidence_link_id} — {item.original_filename}</option>)}</select></label>
            <button type="submit" disabled={!canClose || workOrderClosed || closureBlockedWithoutCompletionNote.length > 0}>Close and audit</button>
          </form>
          <p>{detail.closure_evidence_required ? 'Closure evidence required.' : 'Closure evidence not required.'}</p>
        </article>
      </section>

      <section>
        <h2>Linked Closure Evidence</h2>
        <table><thead><tr><th>Evidence</th><th>Filename</th><th>Reason</th><th>Checksum</th></tr></thead><tbody>{linkedEvidence.map((item) => <tr key={item.evidence_link_id}><td><Link href={`/evidence/${item.evidence_file_id}`}>{item.evidence_code ?? item.evidence_link_id}</Link></td><td>{item.original_filename}</td><td>{item.link_reason}</td><td>{item.checksum_sha256 ?? '-'}</td></tr>)}</tbody></table>
      </section>

      <section>
        <h2>Source Traceability</h2>
        <div className="grid-two"><article><h3>Work order source</h3><pre>{renderJson(readiness?.source_traceability ?? detail.source_traceability)}</pre></article><article><h3>Gate checklist snapshot</h3><pre>{renderJson(detail.gate_checklist)}</pre></article></div>
      </section>

      <section>
        <h2>Audit Timeline</h2>
        <div className="timeline-list">{(readiness?.audit_events ?? detail.audit_events ?? []).map((event) => <article key={event.audit_log_id}><strong>{event.event_type}</strong><br /><small>{safeDate(event.created_at)} — {(event.actor_role_codes ?? []).join(', ') || 'system'}</small><pre>{renderJson(event.metadata)}</pre></article>)}</div>
      </section>

      <section><h2>Gate/API Response</h2><pre>{selected ? renderJson(selected) : renderJson(readiness)}</pre></section>
    </main>
  );
}
