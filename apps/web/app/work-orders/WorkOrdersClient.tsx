'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api-client';

type ReportRecord = {
  report_id: string;
  report_code?: string;
  report_status?: string;
};

type WorkOrder = {
  work_order_id: string;
  work_order_code?: string;
  title: string;
  status: string;
  priority?: string;
  gate_status?: string;
  gate_checklist?: unknown[];
  external_cmms_reference?: string | null;
};

function renderJson(value: unknown): string {
  try { return JSON.stringify(value, null, 2); } catch { return String(value); }
}

function messageFromPayload(payload: Record<string, unknown>): string {
  const error = payload.error as { message?: string; code?: string } | undefined;
  return error?.message ?? error?.code ?? 'Request failed.';
}

export default function WorkOrdersClient() {
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [sourceReportId, setSourceReportId] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);

  async function loadData() {
    const [reportsRes, ordersRes] = await Promise.all([
      apiFetch('/api/v1/reports', { cache: 'no-store' }),
      apiFetch('/api/v1/work-orders', { cache: 'no-store' })
    ]);
    const [reportsPayload, ordersPayload] = await Promise.all([reportsRes.json(), ordersRes.json()]);
    if (reportsRes.ok) {
      const rows = (reportsPayload.data ?? []) as ReportRecord[];
      setReports(rows);
      const issued = rows.find((report) => report.report_status === 'issued');
      if (!sourceReportId && issued?.report_id) setSourceReportId(issued.report_id);
    }
    if (ordersRes.ok) setOrders((ordersPayload.data ?? []) as WorkOrder[]);
  }

  useEffect(() => { void loadData(); }, []);

  async function createOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await apiFetch('/api/v1/work-orders', {
      method: 'POST',
      body: JSON.stringify({
        source_entity_type: 'report',
        source_entity_id: sourceReportId,
        action_source: 'issued_report_action',
        title: 'RC2 follow-up action from issued tank integrity report',
        description: 'Internal AIM fallback work order from issued report. External CMMS is out of MVP scope.',
        priority: 'high',
        recommended_action: 'Review low remaining life and FFS/RBI trigger candidates.',
        assigned_role: 'engineer',
        closure_evidence_required: false
      })
    });
    const payload = await response.json();
    setSelected(payload.data ?? payload.error ?? null);
    setMessage(response.ok ? 'Internal AIM work order created.' : messageFromPayload(payload));
    await loadData();
  }

  async function testExternalCmmsRejection() {
    const response = await apiFetch('/api/v1/work-orders', {
      method: 'POST',
      body: JSON.stringify({
        source_entity_type: 'report',
        source_entity_id: sourceReportId,
        title: 'External CMMS rejection check',
        priority: 'high',
        external_cmms_reference: 'SAP-PM-RC2-001'
      })
    });
    const payload = await response.json();
    setSelected(payload.data ?? payload.error ?? null);
    setMessage(response.ok ? 'Unexpected success: external CMMS reference accepted.' : messageFromPayload(payload));
  }

  async function closeOrder(workOrderId: string) {
    const response = await apiFetch(`/api/v1/work-orders/${workOrderId}/close`, {
      method: 'POST',
      body: JSON.stringify({ completion_note: 'RC2 close test through frontend; closure evidence is not required for this work order.' })
    });
    const payload = await response.json();
    setSelected(payload.data ?? payload.error ?? null);
    setMessage(response.ok ? 'Work order closed.' : messageFromPayload(payload));
    await loadData();
  }

  return (
    <main>
      <p>Phase 2.5 / RC2</p>
      <h1>Internal Work Orders</h1>
      <p>Internal AIM work order fallback is the MVP path. External CMMS references remain rejected. RC4-L adds detail-level closure readiness before close.</p>
      <nav><Link href="/login">Login</Link> | <Link href="/reports">Reports</Link> | <Link href="/integrity-decisions">Integrity Decisions</Link></nav>

      <section>
        <h2>Create From Issued Report</h2>
        <form onSubmit={createOrder}>
          <label>
            Issued Report
            <select value={sourceReportId} onChange={(event) => setSourceReportId(event.target.value)}>
              <option value="">Select issued report</option>
              {reports.map((report) => <option key={report.report_id} value={report.report_id}>{report.report_code ?? report.report_id} — {report.report_status}</option>)}
            </select>
          </label>
          <button type="submit" disabled={!sourceReportId}>Create Internal Work Order</button>
          <button type="button" disabled={!sourceReportId} onClick={testExternalCmmsRejection}>Test External CMMS Rejection</button>
        </form>
        {message && <p>{message}</p>}
      </section>

      <section>
        <h2>Work Order Register</h2>
        <table>
          <thead><tr><th>Work Order</th><th>Status</th><th>Gate</th><th>CMMS</th><th>Actions</th></tr></thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.work_order_id}>
                <td><Link href={`/work-orders/${order.work_order_id}`}>{order.work_order_code ?? order.work_order_id}</Link><br />{order.title}</td>
                <td>{order.status}</td>
                <td>{order.gate_status}<br /><small>{(order.gate_checklist ?? []).length} gate checks</small></td>
                <td>{order.external_cmms_reference ? `Unexpected: ${order.external_cmms_reference}` : 'internal AIM only'}</td>
                <td>
                  <button type="button" onClick={() => setSelected(order as unknown as Record<string, unknown>)}>View Gates</button>
                  <Link href={`/work-orders/${order.work_order_id}`}>Closure readiness</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Gate / API Response</h2>
        <pre>{selected ? renderJson(selected) : 'Select or create a work order.'}</pre>
      </section>
    </main>
  );
}
