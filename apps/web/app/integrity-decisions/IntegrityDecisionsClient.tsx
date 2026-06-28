'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api-client';

type CalculationRun = {
  calculation_run_id: string;
  run_id?: string;
  asset_id: string;
  inspection_event_id?: string;
  approval_status?: string;
  review_status?: string;
};

type EvidenceRecord = {
  evidence_id: string;
  evidence_code?: string;
  original_filename?: string;
  file_name?: string;
};

type IntegrityDecision = {
  integrity_decision_id: string;
  decision_code?: string;
  asset_id: string;
  calculation_run_id: string;
  integrity_status: string;
  decision_status: string;
  decision_summary?: string;
  evidence_count?: number;
};

function renderJson(value: unknown): string {
  try { return JSON.stringify(value, null, 2); } catch { return String(value); }
}

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
  const [summary, setSummary] = useState('RC2 integrity decision based on approved deterministic calculation and linked evidence.');
  const [message, setMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);

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

  useEffect(() => { void loadData(); }, []);

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
        required_action: 'Review warnings and decide whether FFS/RBI follow-up workflow is required.',
        operating_limitation: 'Engineering review required before real operational use.'
      })
    });
    const payload = await response.json();
    setSelected(payload.data ?? payload.error ?? null);
    setMessage(response.ok ? 'Integrity decision created. Link evidence before senior approval.' : messageFromPayload(payload));
    await loadData();
  }

  async function linkEvidence(decisionId: string) {
    if (!evidenceId) {
      setMessage('Select evidence before linking.');
      return;
    }
    const response = await apiFetch(`/api/v1/evidence/${evidenceId}/links`, {
      method: 'POST',
      body: JSON.stringify({
        linked_entity_type: 'integrity_decision',
        linked_entity_id: decisionId,
        link_reason: 'RC2 integrity decision direct evidence gate linkage.'
      })
    });
    const payload = await response.json();
    setSelected(payload.data ?? payload.error ?? null);
    setMessage(response.ok ? 'Evidence linked to integrity decision.' : messageFromPayload(payload));
    await loadData();
  }

  async function approveDecision(decisionId: string) {
    const response = await apiFetch(`/api/v1/integrity-decisions/${decisionId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approval_comment: 'RC2 senior approval after direct evidence linkage and approved calculation were checked.' })
    });
    const payload = await response.json();
    setSelected(payload.data ?? payload.error ?? null);
    setMessage(response.ok ? 'Integrity decision approved.' : messageFromPayload(payload));
    await loadData();
  }

  return (
    <main>
      <p>Phase 2.5 / RC2</p>
      <h1>Integrity Decisions</h1>
      <p>Human-created integrity decisions require an approved calculation and direct evidence link before senior approval. Missing evidence returns INTEGRITY_DECISION_EVIDENCE_REQUIRED. RC4-N adds detail-level decision readiness before report/work-order downstream use.</p>
      <nav>
        <Link href="/login">Login</Link> | <Link href="/evidence">Evidence</Link> | <Link href="/reports">Reports</Link> | <Link href="/work-orders">Work Orders</Link> | <Link href="/evidence-traceability">Evidence Traceability</Link>
      </nav>

      <section>
        <h2>Create Integrity Decision</h2>
        <form onSubmit={createDecision}>
          <label>
            Approved Calculation
            <select value={calculationRunId} onChange={(event) => setCalculationRunId(event.target.value)}>
              <option value="">Select calculation</option>
              {runs.map((run) => <option key={run.calculation_run_id} value={run.calculation_run_id}>{run.run_id ?? run.calculation_run_id} — {run.review_status}/{run.approval_status}</option>)}
            </select>
          </label>
          <label>
            Decision Summary
            <textarea value={summary} onChange={(event) => setSummary(event.target.value)} />
          </label>
          <button type="submit" disabled={!calculationRunId}>Create Decision</button>
        </form>
        {message && <p>{message}</p>}
      </section>

      <section>
        <h2>Direct Evidence Link</h2>
        <label>
          Evidence
          <select value={evidenceId} onChange={(event) => setEvidenceId(event.target.value)}>
            <option value="">Select evidence</option>
            {evidence.map((item) => <option key={item.evidence_id} value={item.evidence_id}>{item.evidence_code ?? item.evidence_id} — {item.original_filename ?? item.file_name}</option>)}
          </select>
        </label>
      </section>

      <section>
        <h2>Decision Register</h2>
        <table>
          <thead><tr><th>Decision</th><th>Status</th><th>Integrity</th><th>Evidence</th><th>Actions</th></tr></thead>
          <tbody>
            {decisions.map((decision) => {
              const hasEvidence = Number(decision.evidence_count ?? 0) > 0;
              return (
                <tr key={decision.integrity_decision_id}>
                  <td><Link href={`/integrity-decisions/${decision.integrity_decision_id}`}>{decision.decision_code ?? decision.integrity_decision_id}</Link><br />{decision.calculation_run_id}</td>
                  <td>{decision.decision_status}</td>
                  <td>{decision.integrity_status}</td>
                  <td>{hasEvidence ? `linked (${decision.evidence_count})` : 'missing direct evidence'}</td>
                  <td>
                    <Link href={`/integrity-decisions/${decision.integrity_decision_id}`}>Decision readiness</Link> <button type="button" onClick={() => setSelected(decision as unknown as Record<string, unknown>)}>View</button>
                    <button type="button" onClick={() => linkEvidence(decision.integrity_decision_id)}>Link Evidence</button>
                    <button type="button" disabled={!hasEvidence || decision.decision_status === 'approved'} onClick={() => approveDecision(decision.integrity_decision_id)}>Approve</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Gate / API Response</h2>
        <pre>{selected ? renderJson(selected) : 'Select, create, link, or approve a decision.'}</pre>
      </section>
    </main>
  );
}
