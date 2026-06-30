import { Router, type Response } from 'express';
import type { PoolClient } from 'pg';
import { pool } from '../db/client.js';
import { requirePermission } from '../middleware/rbac.js';
import { requireTenantContextFromRequest } from '../modules/tenancy/tenant-scope.js';

export const inspectionsRouter = Router();

type ApiResponse = Response<Record<string, unknown>>;
type DbRow = Record<string, unknown>;

type InspectionReadinessGate = {
  gate_type: string;
  gate_status: 'pass' | 'warning' | 'fail';
  blocking: boolean;
  message: string;
  metadata?: Record<string, unknown>;
};

function isUuid(value: string | undefined): value is string {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

function controlledError(res: ApiResponse, status: number, code: string, message: string): void {
  res.status(status).json({ error: { code, message } });
}

function mapInspection(row: DbRow): Record<string, unknown> {
  return {
    inspection_event_id: row.id,
    inspection_code: row.inspection_code,
    asset_id: row.asset_id,
    asset_tag: row.asset_tag,
    asset_name: row.asset_name,
    inspection_type: row.inspection_type,
    inspection_date: row.inspection_date,
    inspector_user_id: row.inspector_user_id,
    summary: row.summary,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function mapTraceRow(row: DbRow): Record<string, unknown> {
  return {
    id: row.id,
    code: row.inspection_code ?? row.measurement_code ?? row.finding_code ?? row.run_id ?? row.decision_code ?? row.report_code ?? row.work_order_code ?? row.review_code ?? row.approval_code ?? row.evidence_code,
    title: row.title ?? row.report_title ?? row.input_name ?? row.review_type ?? row.approval_type ?? row.original_filename ?? row.file_name ?? row.component,
    status: row.status ?? row.validation_status ?? row.reviewer_status ?? row.review_status ?? row.approval_status ?? row.decision_status ?? row.report_status,
    severity: row.severity,
    type: row.inspection_type ?? row.method ?? row.finding_type ?? row.source_type ?? row.entity_type ?? row.source_entity_type,
    created_at: row.created_at,
    updated_at: row.updated_at,
    reviewed_at: row.reviewed_at,
    approved_at: row.approved_at,
    issued_at: row.issued_at,
    closed_at: row.closed_at
  };
}

function mapEvidence(row: DbRow): Record<string, unknown> {
  return {
    evidence_file_id: row.evidence_file_id ?? row.id,
    evidence_code: row.evidence_code,
    original_filename: row.original_filename ?? row.file_name,
    file_type: row.file_type ?? row.file_extension,
    checksum_sha256: row.checksum_sha256 ?? row.checksum,
    evidence_status: row.evidence_status ?? row.status,
    method: row.method,
    component: row.component,
    cml_tml_grid_reference: row.cml_tml_grid_reference,
    inspection_date: row.inspection_date,
    link_reason: row.link_reason,
    linked_entity_type: row.linked_entity_type,
    linked_entity_id: row.linked_entity_id,
    created_at: row.created_at
  };
}

function mapAuditEvent(row: DbRow): Record<string, unknown> {
  return {
    audit_log_id: row.audit_log_id ?? row.id,
    event_type: row.event_type,
    actor_user_id: row.actor_user_id,
    actor_role_codes: row.actor_role_codes,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    created_at: row.created_at,
    metadata: row.metadata_json ?? row.metadata
  };
}

function inspectionReadinessGate(
  gateType: string,
  pass: boolean,
  message: string,
  metadata: Record<string, unknown> = {},
  blocking = true,
  warningWhenFailed = false
): InspectionReadinessGate {
  return {
    gate_type: gateType,
    gate_status: pass ? 'pass' : warningWhenFailed ? 'warning' : 'fail',
    blocking,
    message,
    metadata
  };
}

function gateSummary(gates: InspectionReadinessGate[]): Record<string, number> {
  return {
    total: gates.length,
    pass: gates.filter((gate) => gate.gate_status === 'pass').length,
    warning: gates.filter((gate) => gate.gate_status === 'warning').length,
    fail: gates.filter((gate) => gate.gate_status === 'fail').length,
    blocking: gates.filter((gate) => gate.blocking && gate.gate_status !== 'pass').length
  };
}

async function loadInspectionEvent(client: PoolClient, inspectionEventId: string, tenantId: string): Promise<DbRow | null> {
  const result = await client.query<DbRow>(
    `select ie.*, a.asset_tag, a.asset_name
       from inspection_events ie
       left join assets a on a.id = ie.asset_id and a.tenant_id = $2::uuid
      where ie.id = $1::uuid
        and ie.tenant_id = $2::uuid
      limit 1`,
    [inspectionEventId, tenantId]
  );
  return result.rows[0] ?? null;
}

async function buildInspectionPackageReadiness(client: PoolClient, inspectionEventId: string, tenantId: string): Promise<Record<string, unknown> | null> {
  const inspection = await loadInspectionEvent(client, inspectionEventId, tenantId);
  if (!inspection) return null;
  const assetId = String(inspection.asset_id);

  const [evidence, ndt, findings, calculations, reviews, approvals, decisions, reports, workOrders, auditEvents] = await Promise.all([
    client.query<DbRow>(
      `select distinct
          ef.id as evidence_file_id,
          ef.evidence_code,
          ef.original_filename,
          ef.file_name,
          ef.file_extension as file_type,
          ef.checksum_sha256,
          ef.status as evidence_status,
          ef.method,
          ef.component,
          ef.cml_tml_grid_reference,
          ef.inspection_date,
          el.link_reason,
          el.linked_entity_type,
          el.linked_entity_id,
          coalesce(el.created_at, ef.created_at) as created_at
         from evidence_files ef
         left join evidence_links el on el.evidence_file_id = ef.id
        where ef.asset_id = $2::uuid
          and ef.tenant_id = $3::uuid
          and (
            ef.inspection_event_id = $1::uuid
            or (el.linked_entity_type = 'inspection_event' and el.linked_entity_id = $1::uuid)
          )
        order by created_at desc
        limit 50`,
      [inspectionEventId, assetId, tenantId]
    ),
    client.query<DbRow>(
      `select id, measurement_code, component, method, reviewer_status, validation_status, reading_date, created_at, updated_at
         from ndt_measurements
        where inspection_event_id = $1::uuid and asset_id = $2::uuid and tenant_id = $3::uuid
        order by created_at desc
        limit 50`,
      [inspectionEventId, assetId, tenantId]
    ),
    client.query<DbRow>(
      `select id, finding_code, title, finding_type, severity, status, source_type, created_at, updated_at, reviewed_at, closed_at
         from findings
        where inspection_event_id = $1::uuid and asset_id = $2::uuid and tenant_id = $3::uuid
        order by created_at desc
        limit 50`,
      [inspectionEventId, assetId, tenantId]
    ),
    client.query<DbRow>(
      `select id, id as run_id, status, created_at, reviewed_at, approved_at, locked_at
         from calculation_runs
        where inspection_event_id = $1::uuid and asset_id = $2::uuid and tenant_id = $3::uuid
        order by created_at desc
        limit 50`,
      [inspectionEventId, assetId, tenantId]
    ),
    client.query<DbRow>(
      `select er.id, er.entity_type, er.entity_id, er.review_type, er.review_status, er.reviewed_at, er.reviewed_at as created_at
         from engineering_reviews er
        where er.tenant_id = $2::uuid
          and (
            (er.entity_type = 'inspection_event' and er.entity_id = $1::uuid)
            or (er.entity_type = 'ndt_measurement' and er.entity_id in (select id from ndt_measurements where inspection_event_id = $1::uuid and tenant_id = $2::uuid))
            or (er.entity_type = 'calculation_run' and er.entity_id in (select id from calculation_runs where inspection_event_id = $1::uuid and tenant_id = $2::uuid))
          )
        order by er.reviewed_at desc
        limit 50`,
      [inspectionEventId, tenantId]
    ),
    client.query<DbRow>(
      `select ar.id, ar.entity_type, ar.entity_id, ar.approval_status, ar.approved_at, ar.approved_at as created_at
         from approval_records ar
        where ar.tenant_id = $2::uuid
          and (
            (ar.entity_type = 'inspection_event' and ar.entity_id = $1::uuid)
            or (ar.entity_type = 'ndt_measurement' and ar.entity_id in (select id from ndt_measurements where inspection_event_id = $1::uuid and tenant_id = $2::uuid))
            or (ar.entity_type = 'calculation_run' and ar.entity_id in (select id from calculation_runs where inspection_event_id = $1::uuid and tenant_id = $2::uuid))
          )
        order by ar.approved_at desc
        limit 50`,
      [inspectionEventId, tenantId]
    ),
    client.query<DbRow>(
      `select id, decision_code, decision_status, integrity_status, decision_type, created_at, reviewed_at, approved_at
         from integrity_decisions
        where asset_id = $2::uuid
          and tenant_id = $3::uuid
          and (
            inspection_event_id = $1::uuid
            or calculation_run_id in (select id from calculation_runs where inspection_event_id = $1::uuid and tenant_id = $3::uuid)
          )
        order by created_at desc
        limit 50`,
      [inspectionEventId, assetId, tenantId]
    ),
    client.query<DbRow>(
      `select r.id, r.report_code, r.report_title, r.report_status, r.created_at, r.reviewed_at, r.approved_at, r.issued_at
         from reports r
        where r.asset_id = $2::uuid
          and r.tenant_id = $3::uuid
          and r.calculation_run_id in (select id from calculation_runs where inspection_event_id = $1::uuid and tenant_id = $3::uuid)
        order by r.created_at desc
        limit 50`,
      [inspectionEventId, assetId, tenantId]
    ),
    client.query<DbRow>(
      `select iwo.id, iwo.work_order_code, iwo.title, iwo.status, iwo.priority, iwo.source_entity_type, iwo.source_entity_id, iwo.created_at, iwo.closed_at
         from internal_work_orders iwo
        where iwo.asset_id = $2::uuid
          and iwo.tenant_id = $3::uuid
          and (
            (iwo.source_entity_type = 'inspection_event' and iwo.source_entity_id = $1::uuid)
            or (iwo.source_entity_type = 'ndt_measurement' and iwo.source_entity_id in (select id from ndt_measurements where inspection_event_id = $1::uuid and tenant_id = $3::uuid))
            or (iwo.source_entity_type = 'finding' and iwo.source_entity_id in (select id from findings where inspection_event_id = $1::uuid and tenant_id = $3::uuid))
            or (iwo.source_entity_type = 'calculation_run' and iwo.source_entity_id in (select id from calculation_runs where inspection_event_id = $1::uuid and tenant_id = $3::uuid))
            or (iwo.source_entity_type = 'integrity_decision' and iwo.source_entity_id in (select id from integrity_decisions where inspection_event_id = $1::uuid and tenant_id = $3::uuid))
          )
        order by iwo.created_at desc
        limit 50`,
      [inspectionEventId, assetId, tenantId]
    ),
    client.query<DbRow>(
      `select id as audit_log_id, event_type, actor_user_id, actor_role_codes, entity_type, entity_id, created_at, metadata_json
         from audit_logs
        where tenant_id = $2::uuid
          and (
            entity_id = $1::uuid
            or (entity_type = 'ndt_measurement' and entity_id in (select id from ndt_measurements where inspection_event_id = $1::uuid and tenant_id = $2::uuid))
            or (entity_type = 'calculation_run' and entity_id in (select id from calculation_runs where inspection_event_id = $1::uuid and tenant_id = $2::uuid))
          )
        order by created_at desc
        limit 50`,
      [inspectionEventId, tenantId]
    )
  ]);

  const directEvidenceCount = evidence.rows.length;
  const ndtCount = ndt.rows.length;
  const findingCount = findings.rows.length;
  const calculationCount = calculations.rows.length;
  const reviewApprovalCount = reviews.rows.length + approvals.rows.length;
  const downstreamCount = decisions.rows.length + reports.rows.length + workOrders.rows.length;
  const status = String(inspection.status ?? '').toLowerCase();

  const gates = [
    inspectionReadinessGate('inspection_event_recorded', true, 'Inspection event exists in AIM PostgreSQL and is the package anchor.', { inspection_event_id: inspectionEventId }),
    inspectionReadinessGate('asset_context_linked', Boolean(inspection.asset_id), 'Inspection package must stay linked to an AIM asset.', { asset_id: inspection.asset_id ?? null }),
    inspectionReadinessGate('inspection_status_ready', ['in_review', 'approved', 'closed'].includes(status), 'Inspection status should be in_review, approved, or closed before downstream engineering use.', { status: inspection.status ?? null }, true),
    inspectionReadinessGate('package_evidence_linked', directEvidenceCount > 0, 'Inspection package should have direct same-asset evidence metadata or evidence_links.', { evidence_count: directEvidenceCount }, true),
    inspectionReadinessGate('ndt_measurement_coverage_present', ndtCount > 0, 'Inspection package should show NDT measurement coverage when it is used downstream.', { ndt_measurement_count: ndtCount }, false, true),
    inspectionReadinessGate('finding_triage_visible', findingCount > 0, 'Finding/anomaly traceability should be visible when inspection outputs identify conditions requiring disposition.', { finding_count: findingCount }, false, true),
    inspectionReadinessGate('calculation_traceability_visible', calculationCount > 0, 'Calculation traceability should be visible when inspection data has been used by deterministic calculation runs.', { calculation_run_count: calculationCount }, false, true),
    inspectionReadinessGate('review_or_approval_trace_present', reviewApprovalCount > 0 || ['approved', 'closed'].includes(status), 'Human review/approval trace should be visible before final downstream use.', { review_count: reviews.rows.length, approval_count: approvals.rows.length, inspection_status: inspection.status ?? null }, false, true),
    inspectionReadinessGate('downstream_traceability_visible', downstreamCount > 0, 'Downstream integrity decisions, reports, or work orders should be visible when created from this inspection package.', { downstream_count: downstreamCount }, false, true),
    inspectionReadinessGate('ai_n8n_finalization_absent', true, 'AI/n8n/service actors cannot approve, issue, close, calculate, or finalize inspection package readiness.', { finalization_actor_allowed: false }, false)
  ];

  const summary = gateSummary(gates);

  return {
    inspection_event_id: inspectionEventId,
    inspection_code: inspection.inspection_code,
    asset_id: inspection.asset_id,
    ready_for_downstream_use: summary.blocking === 0,
    gate_summary: summary,
    inspection_event: mapInspection(inspection),
    readiness_gates: gates,
    evidence_traceability: {
      direct_evidence_count: directEvidenceCount,
      linked_evidence: evidence.rows.map(mapEvidence)
    },
    package_counts: {
      ndt_measurements: ndtCount,
      findings: findingCount,
      calculation_runs: calculationCount,
      engineering_reviews: reviews.rows.length,
      approval_records: approvals.rows.length,
      integrity_decisions: decisions.rows.length,
      reports: reports.rows.length,
      internal_work_orders: workOrders.rows.length,
      audit_events: auditEvents.rows.length
    },
    linked_context: {
      ndt_measurements: ndt.rows.map(mapTraceRow),
      findings: findings.rows.map(mapTraceRow),
      calculation_runs: calculations.rows.map(mapTraceRow),
      engineering_reviews: reviews.rows.map(mapTraceRow),
      approval_records: approvals.rows.map(mapTraceRow),
      integrity_decisions: decisions.rows.map(mapTraceRow),
      reports: reports.rows.map(mapTraceRow),
      internal_work_orders: workOrders.rows.map(mapTraceRow)
    },
    audit_events: auditEvents.rows.map(mapAuditEvent),
    governance_notes: [
      'RC4-Q inspection package readiness is read-only and does not approve, reject, close, calculate, issue reports, or create work orders.',
      'Inspection package readiness summarizes AIM PostgreSQL records and evidence metadata only.',
      'No API 579/API 581/FFS/RBI/corrosion-rate/remaining-life formula is executed by this endpoint.',
      'AI/n8n/service actors cannot finalize inspection package readiness.'
    ]
  };
}

inspectionsRouter.get('/inspections', requirePermission('inspection.read'), async (req, res: ApiResponse, next) => {
  const assetId = typeof req.query.asset_id === 'string' ? req.query.asset_id : undefined;
  if (assetId && !isUuid(assetId)) {
    controlledError(res, 400, 'INSPECTION_ASSET_ID_INVALID', 'asset_id must be a UUID when provided.');
    return;
  }

  try {
    const tenant = requireTenantContextFromRequest(req);
    const values: string[] = [tenant.tenantId];
    const filters: string[] = ['ie.tenant_id = $1::uuid'];
    if (assetId) {
      values.push(assetId);
      filters.push(`ie.asset_id = $${values.length}::uuid`);
    }
    const where = filters.length > 0 ? `where ${filters.join(' and ')}` : '';
    const result = await pool.query<DbRow>(
      `select ie.*, a.asset_tag, a.asset_name
         from inspection_events ie
         left join assets a on a.id = ie.asset_id and a.tenant_id = $1::uuid
        ${where}
        order by ie.inspection_date desc, ie.created_at desc
        limit 100`,
      values
    );
    res.json({ data: result.rows.map(mapInspection) });
  } catch (error) {
    next(error);
  }
});

inspectionsRouter.get('/inspections/:inspectionEventId/readiness', requirePermission('inspection.read'), async (req, res: ApiResponse, next) => {
  const inspectionEventId = req.params.inspectionEventId;
  if (!isUuid(inspectionEventId)) {
    controlledError(res, 400, 'INSPECTION_EVENT_ID_INVALID', 'inspectionEventId must be a UUID.');
    return;
  }

  try {
    const tenant = requireTenantContextFromRequest(req);
    const client = await pool.connect();
    try {
      const readiness = await buildInspectionPackageReadiness(client, inspectionEventId, tenant.tenantId);
      if (!readiness) {
        controlledError(res, 404, 'INSPECTION_EVENT_NOT_FOUND', 'Inspection event was not found.');
        return;
      }
      res.json({ data: readiness });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});
