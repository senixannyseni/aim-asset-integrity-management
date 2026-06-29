import { Router, type Request, type Response } from 'express';
import { pool } from '../db/client.js';
import { requirePermission } from '../middleware/rbac.js';

export const integrityWorkspaceRouter = Router();

type ApiResponse = Response<Record<string, unknown>>;
type DbRow = Record<string, unknown>;
type CountRow = DbRow & { total_count: string };
type Queryable = {
  query: <T extends DbRow = DbRow>(text: string, values?: unknown[]) => Promise<{ rows: T[]; rowCount: number | null }>;
};

type IntegrityWorkspaceGate = {
  gate_type: string;
  gate_status: 'pass' | 'warning' | 'fail';
  blocking: boolean;
  message: string;
  metadata?: Record<string, unknown>;
};

const SERVICE_WORKSPACE_BLOCKED_ROLES = new Set([
  'ai_agent',
  'n8n_service',
  'integration_service',
  'workflow_service',
  'system_service'
]);

function isUuid(value: string | undefined | null): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isServiceWorkspaceActor(req: Request): boolean {
  const roles = req.user?.roles ?? [];
  const email = req.user?.email?.toLowerCase() ?? '';
  return (
    roles.some((role) => SERVICE_WORKSPACE_BLOCKED_ROLES.has(role)) ||
    email.includes('n8n') ||
    email.includes('service') ||
    email.includes('integration')
  );
}

function enforceHumanWorkspaceViewer(req: Request, res: ApiResponse): boolean {
  if (isServiceWorkspaceActor(req)) {
    res.status(403).json({
      error: {
        code: 'INTEGRITY_WORKSPACE_SERVICE_ACTOR_BLOCKED',
        message: 'AI, n8n, service, workflow, and integration actors cannot access the consolidated integrity package workspace.'
      }
    });
    return false;
  }
  return true;
}

function controlledError(res: ApiResponse, status: number, code: string, message: string): void {
  res.status(status).json({ error: { code, message } });
}

function asCount(row: CountRow | undefined): number {
  return Number.parseInt(row?.total_count ?? '0', 10);
}

function readinessGate(
  gateType: string,
  pass: boolean,
  message: string,
  metadata: Record<string, unknown> = {},
  blocking = true,
  warningWhenFailed = false
): IntegrityWorkspaceGate {
  return {
    gate_type: gateType,
    gate_status: pass ? 'pass' : warningWhenFailed ? 'warning' : 'fail',
    blocking,
    message,
    metadata
  };
}

function gateSummary(gates: IntegrityWorkspaceGate[]): Record<string, number> {
  return {
    total: gates.length,
    pass: gates.filter((gate) => gate.gate_status === 'pass').length,
    warning: gates.filter((gate) => gate.gate_status === 'warning').length,
    fail: gates.filter((gate) => gate.gate_status === 'fail').length,
    blocking: gates.filter((gate) => gate.blocking && gate.gate_status !== 'pass').length
  };
}

function mapAsset(row: DbRow): Record<string, unknown> {
  return {
    asset_id: row.id,
    tank_tag: row.asset_tag,
    asset_name: row.asset_name,
    facility: row.facility,
    location: row.location ?? row.area,
    service_fluid: row.service_fluid,
    operating_status: row.operating_status ?? row.status,
    inspection_due_date: row.inspection_due_date,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function mapTraceRow(row: DbRow): Record<string, unknown> {
  return {
    id: row.id,
    code: row.inspection_code ?? row.measurement_code ?? row.finding_code ?? row.run_id ?? row.decision_code ?? row.case_id ?? row.report_code ?? row.work_order_code ?? row.review_code ?? row.approval_code ?? row.evidence_code,
    title: row.title ?? row.report_title ?? row.asset_name ?? row.review_type ?? row.approval_type ?? row.original_filename ?? row.component ?? row.trigger_reason,
    status: row.status ?? row.review_status ?? row.approval_status ?? row.decision_status ?? row.report_status ?? row.integrity_status ?? row.reviewer_status ?? row.validation_status,
    type: row.inspection_type ?? row.method ?? row.finding_type ?? row.entity_type ?? row.source_entity_type ?? row.trigger_source,
    severity: row.severity,
    created_at: row.created_at,
    updated_at: row.updated_at,
    reviewed_at: row.reviewed_at,
    approved_at: row.approved_at,
    issued_at: row.issued_at,
    closed_at: row.closed_at
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

async function countSql(client: Queryable, sql: string, values: unknown[] = []): Promise<number> {
  const result = await client.query<CountRow>(sql, values);
  return asCount(result.rows[0]);
}

async function assetExists(client: Queryable, assetId: string): Promise<boolean> {
  if (!isUuid(assetId)) return false;
  const result = await client.query('select id from assets where id = $1::uuid and deleted_at is null limit 1', [assetId]);
  return (result.rowCount ?? 0) > 0;
}

async function buildIntegrityWorkspaceReadiness(client: Queryable, assetId: string): Promise<Record<string, unknown> | null> {
  const assetResult = await client.query<DbRow>('select * from assets where id = $1::uuid and deleted_at is null limit 1', [assetId]);
  const asset = assetResult.rows[0];
  if (!asset) return null;

  const [
    geometryResult,
    shellCourseResult,
    inspectionResult,
    evidenceResult,
    ndtResult,
    findingResult,
    calculationResult,
    decisionResult,
    ffsResult,
    rbiResult,
    reportResult,
    workOrderResult,
    reviewResult,
    approvalResult,
    auditResult
  ] = await Promise.all([
    client.query<DbRow>('select * from tank_geometry where asset_id = $1::uuid order by updated_at desc limit 1', [assetId]),
    client.query<DbRow>('select * from shell_courses where asset_id = $1::uuid order by course_no asc limit 20', [assetId]),
    client.query<DbRow>('select * from inspection_events where asset_id = $1::uuid order by inspection_date desc, created_at desc limit 20', [assetId]),
    client.query<DbRow>("select * from evidence_files where asset_id = $1::uuid and status <> 'deleted' order by created_at desc limit 20", [assetId]),
    client.query<DbRow>('select * from ndt_measurements where asset_id = $1::uuid order by reading_date desc, created_at desc limit 20', [assetId]),
    client.query<DbRow>('select * from findings where asset_id = $1::uuid order by created_at desc limit 20', [assetId]),
    client.query<DbRow>('select * from calculation_runs where asset_id = $1::uuid order by created_at desc limit 20', [assetId]),
    client.query<DbRow>('select * from integrity_decisions where asset_id = $1::uuid order by created_at desc limit 20', [assetId]),
    client.query<DbRow>('select * from ffs_cases where asset_id = $1::uuid order by created_at desc limit 20', [assetId]),
    client.query<DbRow>('select * from rbi_cases where asset_id = $1::uuid order by created_at desc limit 20', [assetId]),
    client.query<DbRow>('select * from reports where asset_id = $1::uuid order by created_at desc limit 20', [assetId]),
    client.query<DbRow>('select * from internal_work_orders where asset_id = $1::uuid order by created_at desc limit 20', [assetId]),
    client.query<DbRow>('select * from engineering_reviews where asset_id = $1::uuid or (entity_type = $2 and entity_id = $1::uuid) order by created_at desc limit 20', [assetId, 'asset']),
    client.query<DbRow>('select * from approval_records where asset_id = $1::uuid or (entity_type = $2 and entity_id = $1::uuid) order by created_at desc limit 20', [assetId, 'asset']),
    client.query<DbRow>(
      `select * from audit_logs
       where entity_id = $1::uuid
          or (entity_type = 'asset' and entity_id = $1::uuid)
       order by created_at desc
       limit 25`,
      [assetId]
    )
  ]);

  const counts = {
    shell_courses: shellCourseResult.rows.length,
    inspections: inspectionResult.rows.length,
    evidence_files: evidenceResult.rows.length,
    ndt_measurements: ndtResult.rows.length,
    findings: findingResult.rows.length,
    calculation_runs: calculationResult.rows.length,
    integrity_decisions: decisionResult.rows.length,
    ffs_cases: ffsResult.rows.length,
    rbi_cases: rbiResult.rows.length,
    reports: reportResult.rows.length,
    work_orders: workOrderResult.rows.length,
    engineering_reviews: reviewResult.rows.length,
    approval_records: approvalResult.rows.length,
    audit_events: auditResult.rows.length
  };

  const approvedDecisions = decisionResult.rows.filter((row) => row.decision_status === 'approved').length;
  const issuedReports = reportResult.rows.filter((row) => row.report_status === 'issued').length;
  const openCriticalWorkOrders = workOrderResult.rows.filter((row) => row.priority === 'critical' && !['completed', 'closed', 'cancelled'].includes(String(row.status))).length;

  const gates = [
    readinessGate('asset_readiness_visible', true, 'Asset readiness is visible from the consolidated integrity workspace.', { asset_id: assetId }, false),
    readinessGate('asset_integrity_package_visible', true, 'RC4-R asset integrity package readiness remains the authoritative asset-level readiness preview.', { link: `/assets/${assetId}` }, false),
    readinessGate('inspection_package_trace_visible', counts.inspections > 0, 'Inspection package trace is visible for the selected asset.', { inspection_count: counts.inspections }),
    readinessGate('evidence_traceability_visible', counts.evidence_files > 0, 'Evidence repository linkage is visible for the selected asset.', { evidence_count: counts.evidence_files }),
    readinessGate('ndt_measurement_trace_visible', counts.ndt_measurements > 0, 'NDT measurement coverage is visible for the selected asset.', { ndt_measurement_count: counts.ndt_measurements }),
    readinessGate('findings_triage_trace_visible', counts.findings > 0, 'Findings/anomaly triage trace is visible when findings exist for the asset.', { finding_count: counts.findings }, false, true),
    readinessGate('calculation_traceability_visible', counts.calculation_runs > 0, 'Deterministic calculation run traceability is visible without executing formulas.', { calculation_run_count: counts.calculation_runs }),
    readinessGate('engineering_review_trace_visible', counts.engineering_reviews + counts.approval_records > 0, 'Human review and approval traceability is visible for downstream engineering use.', { engineering_review_count: counts.engineering_reviews, approval_record_count: counts.approval_records }),
    readinessGate('integrity_decision_trace_visible', counts.integrity_decisions > 0, 'Integrity decision traceability is visible for the asset.', { integrity_decision_count: counts.integrity_decisions, approved_decision_count: approvedDecisions }),
    readinessGate('ffs_rbi_trace_visible', counts.ffs_cases + counts.rbi_cases > 0, 'FFS/RBI interface traceability is visible when trigger cases exist.', { ffs_case_count: counts.ffs_cases, rbi_case_count: counts.rbi_cases }, false, true),
    readinessGate('report_issue_trace_visible', counts.reports > 0, 'Report traceability is visible for asset integrity package outputs.', { report_count: counts.reports, issued_report_count: issuedReports }, false, true),
    readinessGate('work_order_closure_trace_visible', counts.work_orders > 0, 'Internal work-order fallback and closure traceability is visible when actions exist.', { work_order_count: counts.work_orders, open_critical_work_order_count: openCriticalWorkOrders }, false, true),
    readinessGate('audit_trail_visible', counts.audit_events > 0, 'Audit events are visible for asset/package governance review.', { audit_event_count: counts.audit_events }, false, true),
    readinessGate('no_formula_execution', true, 'No API 579/API 581/FFS/RBI/corrosion-rate/remaining-life formula is executed by this consolidated workspace endpoint.', { formula_execution: false, read_only: true }, false),
    readinessGate('ai_n8n_finalization_absent', true, 'AI, n8n, service, workflow, and integration actors cannot finalize the end-to-end integrity package workspace.', { ai_can_finalize: false, n8n_can_finalize: false, service_actor_can_finalize: false })
  ];

  const summary = gateSummary(gates);

  return {
    asset_id: assetId,
    generated_at: new Date().toISOString(),
    ready_for_release_candidate_review: summary.blocking === 0,
    gate_summary: summary,
    asset: mapAsset(asset),
    readiness_gates: gates,
    end_to_end_chain: [
      { step: 'Asset', href: `/assets/${assetId}`, count: 1, authoritative_module: 'RC4-R Asset Integrity Package Readiness' },
      { step: 'Inspection', href: '/inspections', count: counts.inspections, authoritative_module: 'RC4-Q Inspection Package Readiness' },
      { step: 'Evidence', href: '/evidence-traceability', count: counts.evidence_files, authoritative_module: 'RC4-M Evidence Traceability Matrix' },
      { step: 'NDT', href: '/ndt', count: counts.ndt_measurements, authoritative_module: 'RC4-P NDT Measurement Readiness' },
      { step: 'Findings', href: '/findings', count: counts.findings, authoritative_module: 'RC4-H Findings / Anomaly Foundation' },
      { step: 'Calculation', href: '/calculations', count: counts.calculation_runs, authoritative_module: 'RC4-O Calculation Formula Traceability Readiness' },
      { step: 'Review / Approval', href: '/reviews', count: counts.engineering_reviews + counts.approval_records, authoritative_module: 'RC4-J Engineering Review Approval Detail' },
      { step: 'Integrity Decision', href: '/integrity-decisions', count: counts.integrity_decisions, authoritative_module: 'RC4-N Integrity Decision Readiness' },
      { step: 'FFS / RBI', href: '/ffs', count: counts.ffs_cases + counts.rbi_cases, authoritative_module: 'RC4-S FFS and RC4-I RBI interface readiness' },
      { step: 'Report', href: '/reports', count: counts.reports, authoritative_module: 'RC4-K Report Issue Readiness' },
      { step: 'Work Order', href: '/work-orders', count: counts.work_orders, authoritative_module: 'RC4-L Work Order Closure Readiness' }
    ],
    module_traceability: {
      geometry: geometryResult.rows[0] ? mapTraceRow(geometryResult.rows[0]) : null,
      shell_courses: shellCourseResult.rows.map(mapTraceRow),
      inspections: inspectionResult.rows.map(mapTraceRow),
      evidence_files: evidenceResult.rows.map(mapTraceRow),
      ndt_measurements: ndtResult.rows.map(mapTraceRow),
      findings: findingResult.rows.map(mapTraceRow),
      calculation_runs: calculationResult.rows.map(mapTraceRow),
      engineering_reviews: reviewResult.rows.map(mapTraceRow),
      approval_records: approvalResult.rows.map(mapTraceRow),
      integrity_decisions: decisionResult.rows.map(mapTraceRow),
      ffs_cases: ffsResult.rows.map(mapTraceRow),
      rbi_cases: rbiResult.rows.map(mapTraceRow),
      reports: reportResult.rows.map(mapTraceRow),
      work_orders: workOrderResult.rows.map(mapTraceRow)
    },
    audit_events: auditResult.rows.map(mapAuditEvent),
    governance_notes: [
      'RC4-T is a read-only consolidated end-to-end integrity package workspace.',
      'Asset, inspection, evidence, NDT, calculation, review, decision, FFS/RBI, report, and work-order modules remain authoritative for their own gates.',
      'No API 579/API 581/FFS/RBI/corrosion-rate/remaining-life formula is executed by this consolidated workspace endpoint.',
      'AI/n8n/service actors cannot finalize release candidate readiness or engineering package readiness.'
    ]
  };
}

integrityWorkspaceRouter.get('/integrity-workspace', requirePermission('asset.read'), async (req, res, next) => {
  try {
    if (!enforceHumanWorkspaceViewer(req, res)) return;

    const assetsResult = await pool.query<DbRow>(
      `select a.id, a.asset_tag, a.asset_name, a.facility, coalesce(a.location, a.area) as location, a.service_fluid, a.operating_status, a.inspection_due_date, a.status, a.created_at, a.updated_at,
              count(distinct ie.id)::text as inspection_count,
              count(distinct ef.id)::text as evidence_count,
              count(distinct nm.id)::text as ndt_measurement_count,
              count(distinct f.id)::text as finding_count,
              count(distinct cr.id)::text as calculation_count,
              count(distinct idc.id)::text as integrity_decision_count,
              count(distinct rp.id)::text as report_count,
              count(distinct iwo.id)::text as work_order_count
       from assets a
       left join inspection_events ie on ie.asset_id = a.id
       left join evidence_files ef on ef.asset_id = a.id and ef.status <> 'deleted'
       left join ndt_measurements nm on nm.asset_id = a.id
       left join findings f on f.asset_id = a.id
       left join calculation_runs cr on cr.asset_id = a.id
       left join integrity_decisions idc on idc.asset_id = a.id
       left join reports rp on rp.asset_id = a.id
       left join internal_work_orders iwo on iwo.asset_id = a.id
       where a.deleted_at is null
       group by a.id
       order by a.updated_at desc, a.created_at desc
       limit 50`
    );

    const totalAssets = await countSql(pool, 'select count(*)::text as total_count from assets where deleted_at is null');
    const assetsWithInspection = await countSql(pool, 'select count(distinct asset_id)::text as total_count from inspection_events');
    const assetsWithEvidence = await countSql(pool, "select count(distinct asset_id)::text as total_count from evidence_files where asset_id is not null and status <> 'deleted'");
    const assetsWithCalculations = await countSql(pool, 'select count(distinct asset_id)::text as total_count from calculation_runs');
    const assetsWithDecisions = await countSql(pool, 'select count(distinct asset_id)::text as total_count from integrity_decisions');
    const assetsWithReports = await countSql(pool, 'select count(distinct asset_id)::text as total_count from reports');

    res.json({
      data: {
        generated_at: new Date().toISOString(),
        read_only: true,
        permission_required: 'asset.read',
        workspace: 'RC4-T End-to-End Integrity Package Workspace + Release Candidate Consolidation',
        summary: {
          assets_total: totalAssets,
          assets_with_inspection: assetsWithInspection,
          assets_with_evidence: assetsWithEvidence,
          assets_with_calculations: assetsWithCalculations,
          assets_with_integrity_decisions: assetsWithDecisions,
          assets_with_reports: assetsWithReports
        },
        assets: assetsResult.rows.map((row) => ({
          asset: mapAsset(row),
          counts: {
            inspections: Number.parseInt(String(row.inspection_count ?? '0'), 10),
            evidence_files: Number.parseInt(String(row.evidence_count ?? '0'), 10),
            ndt_measurements: Number.parseInt(String(row.ndt_measurement_count ?? '0'), 10),
            findings: Number.parseInt(String(row.finding_count ?? '0'), 10),
            calculation_runs: Number.parseInt(String(row.calculation_count ?? '0'), 10),
            integrity_decisions: Number.parseInt(String(row.integrity_decision_count ?? '0'), 10),
            reports: Number.parseInt(String(row.report_count ?? '0'), 10),
            work_orders: Number.parseInt(String(row.work_order_count ?? '0'), 10)
          },
          links: {
            asset_readiness: `/assets/${row.id}`,
            consolidated_readiness: `/integrity-workspace/${row.id}`
          }
        })),
        governance_notes: [
          'Read-only release candidate consolidation view only; module-specific endpoints remain authoritative.',
          'No API 579/API 581/FFS/RBI/corrosion-rate/remaining-life formula is executed.',
          'AI/n8n/service actors cannot finalize end-to-end integrity package readiness.'
        ]
      }
    });
  } catch (error) {
    next(error);
  }
});

integrityWorkspaceRouter.get('/integrity-workspace/assets/:assetId/readiness', requirePermission('asset.read'), async (req, res, next) => {
  try {
    if (!enforceHumanWorkspaceViewer(req, res)) return;
    const assetId = req.params.assetId;
    if (!isUuid(assetId)) {
      controlledError(res, 400, 'VALIDATION_FAILED', 'assetId must be a UUID.');
      return;
    }
    if (!(await assetExists(pool, assetId))) {
      controlledError(res, 404, 'ASSET_NOT_FOUND', 'Asset was not found.');
      return;
    }
    const readiness = await buildIntegrityWorkspaceReadiness(pool, assetId);
    if (!readiness) {
      controlledError(res, 404, 'ASSET_NOT_FOUND', 'Asset was not found.');
      return;
    }
    res.json({ data: readiness });
  } catch (error) {
    next(error);
  }
});
