'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../lib/api-client';
import { ActionModal, CompactDataTable, DetailDrawer, DetailGrid, GateSummary, KpiCard, PageHeader, StatusBadge, TechnicalJson } from '../components/ProgressiveDisclosure';

type ReportRecord = { report_id: string; report_code?: string; report_status?: string };
type WorkOrder = {
  work_order_id: string;
  work_order_code?: string;
  title: string;
  status: string;
  priority?: string;
  gate_status?: string;
  gate_checklist?: unknown[];
  external_cmms_reference?: string | null;
  assigned_role?: string | null;
  due_date?: string | null;
  asset_id?: string | null;
  source_entity_type?: string | null;
  source_entity_id?: string | null;
  description?: string | null;
};

function messageFromPayload(payload: Record<string, unknown>): string {
  const error = payload.error as { message?: string; code?: string } | undefined;
  return error?.message ?? error?.code ?? 'Request failed.';
}

function dateValue(value?: string | null): string {
  return value ? value.slice(0, 10) : '-';
}

export default function WorkOrdersClient() {
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [sourceReportId, setSourceReportId] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<WorkOrder | null>(null);
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [closeTarget, setCloseTarget] = useState<WorkOrder | null>(null);

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

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(() => {
    const blocked = orders.filter((order) => order.status === 'blocked' || order.gate_status === 'blocked').length;
    const closed = orders.filter((order) => order.status === 'closed').length;
    const high = orders.filter((order) => order.priority === 'high').length;
    return { total: orders.length, blocked, closed, high };
  }, [orders]);

  async function createOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await apiFetch('/api/v1/work-orders', {
      method: 'POST',
      body: JSON.stringify({
        source_entity_type: 'report',
        source_entity_id: sourceReportId,
        action_source: 'issued_report_action',
        title: 'Follow-up action from issued tank integrity report',
        description: 'Internal AIM fallback work order from issued report. External CMMS is out of MVP scope.',
        priority: 'high',
        recommended_action: 'Review low remaining life and FFS/RBI trigger candidates.',
        assigned_role: 'engineer',
        closure_evidence_required: false
      })
    });
    const payload = await response.json();
    setMessage(response.ok ? 'Internal AIM work order created.' : messageFromPayload(payload));
    setCreateDrawerOpen(false);
    await loadData();
  }

  async function testExternalCmmsRejection() {
    const response = await apiFetch('/api/v1/work-orders', {
      method: 'POST',
      body: JSON.stringify({ source_entity_type: 'report', source_entity_id: sourceReportId, title: 'External CMMS rejection check', priority: 'high', external_cmms_reference: 'SAP-PM-RC2-001' })
    });
    const payload = await response.json();
    setMessage(response.ok ? 'Unexpected success: external CMMS reference accepted.' : messageFromPayload(payload));
  }

  async function closeOrder(workOrderId: string) {
    const response = await apiFetch(`/api/v1/work-orders/${workOrderId}/close`, {
      method: 'POST',
      body: JSON.stringify({ completion_note: 'Close through frontend; closure evidence is not required for this work order.' })
    });
    const payload = await response.json();
    setMessage(response.ok ? 'Work order closed.' : messageFromPayload(payload));
    setCloseTarget(null);
    await loadData();
  }

  return (
    <main className="app-shell">
      <PageHeader
        eyebrow="Internal CMMS fallback"
        title="Work Orders"
        description="Track work order number, asset, priority, status, due date, and owner by default. Source decision, full description, closure notes, evidence, and audit trail are in drawers."
        status={counts.blocked > 0 ? 'blocked' : 'pending_review'}
        actions={<><button className="primary-button" type="button" onClick={() => setCreateDrawerOpen(true)}>Create Work Order</button><Link className="secondary-button" href="/reports">Reports</Link><Link className="secondary-button" href="/integrity-decisions">Integrity Decisions</Link></>}
      />

      {message && <div className="notice">{message}</div>}

      <section className="pd-kpi-grid" aria-label="Work order summary">
        <KpiCard title="Work Orders" value={counts.total} helper="internal AIM records" />
        <KpiCard title="High Priority" value={counts.high} helper="visible operational risk" status={counts.high > 0 ? 'needs_review' : 'approved'} />
        <KpiCard title="Blocked" value={counts.blocked} helper="gate or execution blockers" status={counts.blocked > 0 ? 'blocked' : 'approved'} />
        <KpiCard title="Closed" value={counts.closed} helper="completed internal actions" status="closed" />
      </section>

      <section className="panel wide-panel">
        <div className="panel-heading">
          <h2>Work Order Register</h2>
          <p>External CMMS references remain out of MVP scope. Drawer shows source and closure details.</p>
        </div>
        <CompactDataTable
          rows={orders}
          getRowKey={(order) => order.work_order_id}
          emptyTitle="No work orders"
          emptyMessage="Create an internal work order from an action-required decision or finding."
          columns={[
            { header: 'Work Order', render: (order) => <Link href={`/work-orders/${order.work_order_id}`}>{order.work_order_code ?? order.work_order_id}</Link> },
            { header: 'Asset', render: (order) => order.asset_id ?? order.source_entity_id ?? '-' },
            { header: 'Priority', render: (order) => <StatusBadge status={order.priority === 'high' ? 'needs_review' : 'draft'} label={order.priority ?? '-'} /> },
            { header: 'Status', render: (order) => <StatusBadge status={order.status} /> },
            { header: 'Due Date', render: (order) => dateValue(order.due_date) },
            { header: 'Owner', render: (order) => order.assigned_role ?? 'engineer' },
            { header: 'Action', className: 'pd-cell-actions', render: (order) => <span className="pd-compact-actions"><button className="secondary-button" type="button" onClick={() => setSelected(order)}>View details</button><button className="primary-button" type="button" disabled={order.status === 'closed'} onClick={() => setCloseTarget(order)}>Close</button></span> }
          ]}
        />
      </section>

      <DetailDrawer
        open={createDrawerOpen}
        title="Create work order"
        subtitle="Internal AIM fallback from issued report. External CMMS integration is not used here."
        status="draft"
        onClose={() => setCreateDrawerOpen(false)}
        tabs={[{
          id: 'overview',
          label: 'Overview',
          content: <form className="form-grid" onSubmit={createOrder}>
            <label><span>Issued Report</span><select value={sourceReportId} onChange={(event) => setSourceReportId(event.target.value)}><option value="">Select issued report</option>{reports.map((report) => <option key={report.report_id} value={report.report_id}>{report.report_code ?? report.report_id} - {report.report_status}</option>)}</select></label>
            <button className="primary-button wide-field" type="submit" disabled={!sourceReportId}>Create Internal Work Order</button>
            <button className="secondary-button wide-field" type="button" disabled={!sourceReportId} onClick={() => void testExternalCmmsRejection()}>Test External CMMS Rejection</button>
          </form>
        }]}
      />

      <DetailDrawer
        open={Boolean(selected)}
        title={selected?.work_order_code ?? selected?.work_order_id ?? 'Work order details'}
        subtitle={selected?.title}
        status={selected?.status}
        onClose={() => setSelected(null)}
        tabs={selected ? [
          { id: 'overview', label: 'Overview', content: <DetailGrid items={[{ label: 'Work Order ID', value: <code>{selected.work_order_id}</code> }, { label: 'Asset', value: selected.asset_id ?? '-' }, { label: 'Priority', value: selected.priority ?? '-' }, { label: 'Owner', value: selected.assigned_role ?? 'engineer' }, { label: 'Due Date', value: dateValue(selected.due_date) }, { label: 'CMMS', value: selected.external_cmms_reference ? `Unexpected: ${selected.external_cmms_reference}` : 'internal AIM only' }]} /> },
          { id: 'technical', label: 'Technical Data', content: <div className="pd-drawer-section"><h3>Description</h3><p>{selected.description ?? selected.title}</p><DetailGrid items={[{ label: 'Source Type', value: selected.source_entity_type ?? 'report' }, { label: 'Source ID', value: selected.source_entity_id ?? '-' }]} /></div> },
          { id: 'gate', label: 'Gate Checklist', content: <GateSummary pass={selected.gate_status === 'pass' ? selected.gate_checklist?.length ?? 1 : 0} warning={selected.gate_status && selected.gate_status !== 'pass' && selected.gate_status !== 'blocked' ? 1 : 0} fail={selected.gate_status === 'blocked' ? 1 : 0} /> },
          { id: 'evidence', label: 'Evidence', content: <Link className="secondary-button" href={`/evidence?linked_entity_id=${selected.work_order_id}`}>Open evidence links</Link> },
          { id: 'audit', label: 'Audit Trail', content: <Link className="secondary-button" href={`/audit-logs?entity_type=work_order&entity_id=${selected.work_order_id}`}>Open audit trail</Link> },
          { id: 'raw', label: 'Raw Metadata', content: <TechnicalJson value={selected} /> }
        ] : []}
      />

      <ActionModal open={Boolean(closeTarget)} title={closeTarget ? `Close ${closeTarget.work_order_code ?? closeTarget.work_order_id}` : 'Close work order'} subtitle="Closure remains backend controlled and auditable." status={closeTarget?.status} onClose={() => setCloseTarget(null)}>
        {closeTarget && <><DetailGrid items={[{ label: 'Work Order', value: closeTarget.title }, { label: 'Gate Status', value: closeTarget.gate_status ?? '-' }]} /><label><span>Completion Note</span><input defaultValue="Closure checked." /></label><button className="primary-button" type="button" onClick={() => void closeOrder(closeTarget.work_order_id)}>Close Work Order</button></>}
      </ActionModal>
    </main>
  );
}
