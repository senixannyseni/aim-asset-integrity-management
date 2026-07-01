'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../lib/api-client';
import { ActionModal, CompactDataTable, DetailDrawer, DetailGrid, KpiCard, PageHeader, StatusBadge, TechnicalJson } from '../components/ProgressiveDisclosure';

type CalculationRun = { calculation_run_id: string; run_id?: string; asset_id: string; inspection_event_id?: string; approval_status?: string; review_status?: string };
type EvidenceRecord = { evidence_id: string; evidence_code?: string; original_filename?: string; file_name?: string };
type IntegrityDecision = { integrity_decision_id: string; decision_code?: string; asset_id: string; calculation_run_id: string; integrity_status: string; decision_status: string; decision_summary?: string; evidence_count?: number };

function messageFromPayload(payload: Record<string, unknown>): string {
  const error = payload.error as { message?: string; code?: string } | undefined;
  return error?.message ?? error?.code ?? 'Request failed.';
}

export default function IntegrityDecisionsClient() {
  const [runs, setRuns] = useState<CalculationRun[]>([]);
  const [evidence, setEvidence] = useState<EvidenceRecord[]>([]);
  const [decisions, setDecisions] = useState<IntegrityDecision[]>([]);
  const [calculationRunId, setCalculationRunId] = useState('');
  const [evidenceId, setEvidenceId] = useState('');
  const [summary, setSummary] = useState('Integrity decision based on approved deterministic calculation and linked evidence.');
  const [message, setMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<IntegrityDecision | null>(null);
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [actionTarget, setActionTarget] = useState<IntegrityDecision | null>(null);

  async function loadData() {
    const [runRes, evidenceRes, decisionRes] = await Promise.all([
      apiFetch('/api/v1/engineering/calculations', { cache: 'no-store' }),
      apiFetch('/api/v1/evidence', { cache: 'no-store' }),
      apiFetch('/api/v1/integrity-decisions', { cache: 'no-store' })
    ]);
    const [runPayload, evidencePayload, decisionPayload] = await Promise.all([runRes.json(), evidenceRes.json(), decisionRes.json()]);
    if (runRes.ok) {
      const rows = (runPayload.data ?? []) as CalculationRun[];
      setRuns(rows);
      if (!calculationRunId && rows[0]?.calculation_run_id) setCalculationRunId(rows[0].calculation_run_id);
    }
    if (evidenceRes.ok) {
      const rows = (evidencePayload.data ?? []) as EvidenceRecord[];
      setEvidence(rows);
      if (!evidenceId && rows[0]?.evidence_id) setEvidenceId(rows[0].evidence_id);
    }
    if (decisionRes.ok) setDecisions((decisionPayload.data ?? []) as IntegrityDecision[]);
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(() => {
    const approved = decisions.filter((decision) => decision.decision_status === 'approved').length;
    const pending = decisions.filter((decision) => decision.decision_status !== 'approved' && decision.decision_status !== 'rejected').length;
    const blocked = decisions.filter((decision) => Number(decision.evidence_count ?? 0) === 0 || decision.decision_status === 'rejected').length;
    return { total: decisions.length, approved, pending, blocked };
  }, [decisions]);

  async function createDecision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const run = runs.find((item) => item.calculation_run_id === calculationRunId);
    const response = await apiFetch('/api/v1/integrity-decisions', {
      method: 'POST',
      body: JSON.stringify({
        asset_id: run?.asset_id,
        inspection_event_id: run?.inspection_event_id,
        calculation_run_id: calculationRunId,
        integrity_status: 'action_required',
        decision_summary: summary,
        required_action: 'Review warnings and decide whether follow-up workflow is required.',
        operating_limitation: 'Engineering review required before real operational use.'
      })
    });
    const payload = await response.json();
    setMessage(response.ok ? 'Integrity decision created. Link evidence before senior approval.' : messageFromPayload(payload));
    setCreateDrawerOpen(false);
    await loadData();
  }

  async function linkEvidence(decisionId: string) {
    if (!evidenceId) {
      setMessage('Select evidence before linking.');
      return;
    }
    const response = await apiFetch(`/api/v1/evidence/${evidenceId}/links`, {
      method: 'POST',
      body: JSON.stringify({ linked_entity_type: 'integrity_decision', linked_entity_id: decisionId, link_reason: 'Integrity decision direct evidence gate linkage.' })
    });
    const payload = await response.json();
    setMessage(response.ok ? 'Evidence linked to integrity decision.' : messageFromPayload(payload));
    await loadData();
  }

  async function approveDecision(decisionId: string) {
    const response = await apiFetch(`/api/v1/integrity-decisions/${decisionId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approval_comment: 'Senior approval after direct evidence linkage and approved calculation were checked.' })
    });
    const payload = await response.json();
    setMessage(response.ok ? 'Integrity decision approved.' : messageFromPayload(payload));
    setActionTarget(null);
    await loadData();
  }

  return (
    <main className="app-shell">
      <PageHeader
        eyebrow="Human-owned decisions"
        title="Integrity Decisions"
        description="Show decision status, asset, recommendation, reviewer state, and evidence gate by default. Rationale and linked technical records are available in drawers."
        status={counts.blocked > 0 ? 'blocked' : counts.pending > 0 ? 'pending_review' : 'approved'}
        actions={<><button className="primary-button" type="button" onClick={() => setCreateDrawerOpen(true)}>Create Decision</button><Link className="secondary-button" href="/calculations">Calculations</Link><Link className="secondary-button" href="/reports">Reports</Link><Link className="secondary-button" href="/work-orders">Work Orders</Link></>}
      />

      {message && <div className="notice">{message}</div>}

      <section className="pd-kpi-grid" aria-label="Decision summary">
        <KpiCard title="Decisions" value={counts.total} helper="human-created records" />
        <KpiCard title="Pending Review" value={counts.pending} helper="reviewer/approver action" status={counts.pending > 0 ? 'pending_review' : 'approved'} />
        <KpiCard title="Evidence Gaps" value={counts.blocked} helper="approval-blocking where missing" status={counts.blocked > 0 ? 'blocked' : 'approved'} />
        <KpiCard title="Approved" value={counts.approved} helper="final decision state" status="approved" />
      </section>

      <section className="panel wide-panel">
        <div className="panel-heading row-between">
          <div>
            <h2>Decision Register</h2>
            <p>Rationale, calculation basis, linked evidence, and audit response details are disclosed per decision.</p>
          </div>
          <label><span>Evidence for Linking</span><select value={evidenceId} onChange={(event) => setEvidenceId(event.target.value)}><option value="">Select evidence</option>{evidence.map((item) => <option key={item.evidence_id} value={item.evidence_id}>{item.evidence_code ?? item.evidence_id} - {item.original_filename ?? item.file_name}</option>)}</select></label>
        </div>
        <CompactDataTable
          rows={decisions}
          getRowKey={(decision) => decision.integrity_decision_id}
          emptyTitle="No integrity decisions"
          emptyMessage="Create one after inspection, evidence, NDT, and calculation gates are complete."
          columns={[
            { header: 'Decision', render: (decision) => <Link href={`/integrity-decisions/${decision.integrity_decision_id}`}>{decision.decision_code ?? decision.integrity_decision_id}</Link> },
            { header: 'Asset', render: (decision) => decision.asset_id },
            { header: 'Recommendation', render: (decision) => <StatusBadge status={decision.integrity_status} /> },
            { header: 'Review State', render: (decision) => <StatusBadge status={decision.decision_status} /> },
            { header: 'Evidence', render: (decision) => Number(decision.evidence_count ?? 0) > 0 ? <StatusBadge status="approved" label={`linked (${decision.evidence_count})`} /> : <StatusBadge status="blocked" label="missing" /> },
            { header: 'Action', className: 'pd-cell-actions', render: (decision) => <span className="pd-compact-actions"><button className="secondary-button" type="button" onClick={() => setSelected(decision)}>View details</button><button className="primary-button" type="button" disabled={Number(decision.evidence_count ?? 0) === 0 || decision.decision_status === 'approved'} onClick={() => setActionTarget(decision)}>Approve</button></span> }
          ]}
        />
      </section>

      <DetailDrawer
        open={createDrawerOpen}
        title="Create integrity decision"
        subtitle="Creation is backend controlled and requires reviewed calculation context."
        status="draft"
        onClose={() => setCreateDrawerOpen(false)}
        tabs={[{
          id: 'overview',
          label: 'Overview',
          content: <form className="form-grid" onSubmit={createDecision}>
            <label><span>Approved Calculation</span><select value={calculationRunId} onChange={(event) => setCalculationRunId(event.target.value)}><option value="">Select calculation</option>{runs.map((run) => <option key={run.calculation_run_id} value={run.calculation_run_id}>{run.run_id ?? run.calculation_run_id} - {run.review_status}/{run.approval_status}</option>)}</select></label>
            <label className="wide-field"><span>Decision Summary</span><input value={summary} onChange={(event) => setSummary(event.target.value)} /></label>
            <button className="primary-button wide-field" type="submit" disabled={!calculationRunId}>Create Decision</button>
          </form>
        }]}
      />

      <DetailDrawer
        open={Boolean(selected)}
        title={selected?.decision_code ?? selected?.integrity_decision_id ?? 'Decision details'}
        subtitle={selected?.asset_id}
        status={selected?.decision_status}
        onClose={() => setSelected(null)}
        tabs={selected ? [
          { id: 'overview', label: 'Overview', content: <DetailGrid items={[{ label: 'Decision ID', value: <code>{selected.integrity_decision_id}</code> }, { label: 'Asset', value: selected.asset_id }, { label: 'Integrity Status', value: <StatusBadge status={selected.integrity_status} /> }, { label: 'Decision Status', value: <StatusBadge status={selected.decision_status} /> }, { label: 'Evidence Count', value: selected.evidence_count ?? 0 }, { label: 'Calculation Run', value: selected.calculation_run_id }]} /> },
          { id: 'technical', label: 'Technical Data', content: <div className="pd-drawer-section"><h3>Rationale</h3><p>{selected.decision_summary ?? 'No rationale returned in list response.'}</p></div> },
          { id: 'evidence', label: 'Evidence', content: <div className="pd-compact-actions"><button className="secondary-button" type="button" onClick={() => void linkEvidence(selected.integrity_decision_id)}>Link Evidence</button><Link className="secondary-button" href={`/calculations/${selected.calculation_run_id}`}>Calculation</Link></div> },
          { id: 'gate', label: 'Gate Checklist', content: <DetailGrid items={[{ label: 'Evidence Gate', value: Number(selected.evidence_count ?? 0) > 0 ? 'linked' : 'missing' }, { label: 'Approval Gate', value: selected.decision_status }, { label: 'Calculation Basis', value: selected.calculation_run_id }]} /> },
          { id: 'audit', label: 'Audit Trail', content: <Link className="secondary-button" href={`/audit-logs?entity_type=integrity_decision&entity_id=${selected.integrity_decision_id}`}>Open audit trail</Link> },
          { id: 'raw', label: 'Raw Metadata', content: <TechnicalJson value={selected} /> }
        ] : []}
      />

      <ActionModal open={Boolean(actionTarget)} title={actionTarget ? `Approve ${actionTarget.decision_code ?? actionTarget.integrity_decision_id}` : 'Approve decision'} subtitle="Approval comment and final acceptance are controlled by backend." status={actionTarget?.decision_status} onClose={() => setActionTarget(null)}>
        {actionTarget && <><DetailGrid items={[{ label: 'Evidence', value: actionTarget.evidence_count ?? 0 }, { label: 'Calculation Run', value: actionTarget.calculation_run_id }, { label: 'Status', value: actionTarget.decision_status }]} /><label><span>Approval Comment</span><input defaultValue="Approved after evidence and calculation check." /></label><button className="primary-button" type="button" disabled={Number(actionTarget.evidence_count ?? 0) === 0} onClick={() => void approveDecision(actionTarget.integrity_decision_id)}>Approve Decision</button></>}
      </ActionModal>
    </main>
  );
}
