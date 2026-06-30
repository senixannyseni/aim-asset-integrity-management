import { Router, type Request, type Response } from 'express';
import type { PoolClient } from 'pg';
import { pool } from '../db/client.js';
import { requirePermission } from '../middleware/rbac.js';
import { appendTenantWhereClause, requireTenantContextFromRequest, tenantIdForInsert } from '../modules/tenancy/tenant-scope.js';
import {
  asDateString,
  asInteger,
  asNumber,
  asString,
  isPlainObject,
  normalizeLengthToMeters,
  normalizeLengthToMillimeters,
  validateGeometryPayload,
  validateShellCoursePayload,
  validateTankAssetPayload,
  type ValidationIssue
} from '../modules/assets/validation.js';

export const assetsRouter = Router();

type ApiResponse = Response<Record<string, unknown>>;

type DbRow = Record<string, unknown>;


type AssetReadinessGate = {
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

function assetReadinessGate(
  gateType: string,
  pass: boolean,
  message: string,
  metadata: Record<string, unknown> = {},
  blocking = true,
  warningWhenFailed = false
): AssetReadinessGate {
  return {
    gate_type: gateType,
    gate_status: pass ? 'pass' : warningWhenFailed ? 'warning' : 'fail',
    blocking,
    message,
    metadata
  };
}

function assetGateSummary(gates: AssetReadinessGate[]): Record<string, number> {
  return {
    total: gates.length,
    pass: gates.filter((gate) => gate.gate_status === 'pass').length,
    warning: gates.filter((gate) => gate.gate_status === 'warning').length,
    fail: gates.filter((gate) => gate.gate_status === 'fail').length,
    blocking: gates.filter((gate) => gate.blocking && gate.gate_status !== 'pass').length
  };
}

function mapTraceRow(row: DbRow): Record<string, unknown> {
  return {
    id: row.id,
    code: row.inspection_code ?? row.measurement_code ?? row.finding_code ?? row.run_id ?? row.decision_code ?? row.report_code ?? row.work_order_code ?? row.review_code ?? row.approval_code ?? row.evidence_code,
    title: row.title ?? row.report_title ?? row.input_name ?? row.review_type ?? row.approval_type ?? row.original_filename ?? row.component,
    status: row.status ?? row.validation_status ?? row.reviewer_status ?? row.review_status ?? row.approval_status ?? row.decision_status ?? row.report_status ?? row.integrity_status,
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

function mapAssetEvidence(row: DbRow): Record<string, unknown> {
  return {
    evidence_file_id: row.evidence_file_id ?? row.id,
    evidence_code: row.evidence_code,
    original_filename: row.original_filename,
    file_type: row.file_type ?? row.file_extension,
    checksum_sha256: row.checksum_sha256,
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

function mapAssetAuditEvent(row: DbRow): Record<string, unknown> {
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

function validationError(res: ApiResponse, issues: ValidationIssue[]): void {
  res.status(400).json({
    error: {
      code: 'VALIDATION_FAILED',
      message: 'Request validation failed.',
      details: issues
    }
  });
}

function ensureBody(req: Request, res: ApiResponse): Record<string, unknown> | undefined {
  if (!isPlainObject(req.body)) {
    validationError(res, [{ field: 'body', message: 'JSON object body is required.', severity: 'error' }]);
    return undefined;
  }
  return req.body;
}

function nullIfEmpty(value: string | undefined): string | null {
  return value && value.length > 0 ? value : null;
}

function actorUserId(req: Request): string | null {
  const id = req.user?.id;
  if (!id || id === '00000000-0000-0000-0000-000000000000') return null;
  return id;
}

function actorRoles(req: Request): string[] {
  return req.user?.roles ?? [];
}

async function writeAudit(
  client: PoolClient,
  req: Request,
  eventType: string,
  entityType: string,
  entityId: string | null,
  before: unknown,
  after: unknown,
  metadata: Record<string, unknown> = {}
): Promise<string | undefined> {
  const tenant = requireTenantContextFromRequest(req);
  const result = await client.query<{ id: string }>(
    `insert into audit_logs(
      tenant_id,
      event_type,
      actor_user_id,
      actor_role_codes,
      entity_type,
      entity_id,
      request_id,
      before_json,
      after_json,
      metadata_json
    ) values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb)
    returning id`,
    [
      tenant.tenantId,
      eventType,
      actorUserId(req),
      actorRoles(req),
      entityType,
      entityId,
      req.header('x-request-id') ?? null,
      JSON.stringify(before ?? null),
      JSON.stringify(after ?? null),
      JSON.stringify(metadata)
    ]
  );
  return result.rows[0]?.id;
}

function mapMaterial(row: DbRow): Record<string, unknown> {
  return {
    material_id: row.id,
    material_code: row.material_code,
    material_name: row.material_name,
    material_specification: row.material_specification,
    material_family: row.material_family ?? null,
    notes: row.notes ?? null,
    is_active: row.is_active ?? true
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
    tank_type: row.tank_type ?? row.asset_type,
    construction_year: row.asset_construction_year ?? row.construction_year,
    original_design_code: row.original_design_code ?? row.design_code,
    current_assessment_code: row.current_assessment_code,
    code_edition: row.code_edition ?? row.design_code_edition,
    owner: row.owner,
    operating_status: row.operating_status,
    inspection_due_date: row.inspection_due_date,
    record_status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function mapGeometry(row: DbRow | undefined): Record<string, unknown> | null {
  if (!row) return null;
  return {
    geometry_id: row.id,
    asset_id: row.asset_id,
    diameter: row.diameter_m,
    diameter_unit: 'm',
    shell_height: row.shell_height_m ?? row.height_m,
    shell_height_unit: 'm',
    number_of_courses: row.number_of_courses,
    design_liquid_level: row.design_liquid_level_m,
    design_liquid_level_unit: 'm',
    nominal_capacity: row.nominal_capacity_m3,
    nominal_capacity_unit: 'm3',
    specific_gravity: row.specific_gravity,
    design_temperature: row.design_temperature_c,
    design_temperature_unit: 'C',
    design_pressure: row.design_pressure_kpa,
    design_pressure_unit: 'kPa',
    vacuum_design_basis: row.vacuum_design_basis,
    bottom_type: row.bottom_type,
    roof_type: row.roof_type,
    foundation_type: row.foundation_type,
    status: row.status,
    updated_at: row.updated_at
  };
}

function mapShellCourse(row: DbRow): Record<string, unknown> {
  return {
    shell_course_id: row.id,
    asset_id: row.asset_id,
    course_no: row.course_no,
    course_height: row.course_height_mm !== null && row.course_height_mm !== undefined ? Number(row.course_height_mm) / 1000 : null,
    course_height_unit: 'm',
    course_height_mm: row.course_height_mm ?? row.height_mm,
    nominal_thickness: row.nominal_thickness_mm,
    nominal_thickness_unit: 'mm',
    measured_min_thickness: row.measured_min_thickness_mm,
    measured_min_thickness_unit: 'mm',
    material_id: row.material_id,
    material_code: row.material_code ?? null,
    material_name: row.material_name ?? null,
    material_specification: row.material_specification ?? row.material_master_specification ?? null,
    joint_efficiency: row.joint_efficiency,
    corrosion_allowance: row.corrosion_allowance_mm,
    corrosion_allowance_unit: 'mm',
    coating_lining_status: row.coating_lining_status,
    status: row.status,
    updated_at: row.updated_at
  };
}

async function getAssetBundle(assetId: string, tenantId: string): Promise<Record<string, unknown> | null> {
  const assetResult = await pool.query<DbRow>(
    `select a.*, coalesce(a.construction_year, tg.construction_year) as asset_construction_year
     from assets a
     left join tank_geometry tg on tg.asset_id = a.id
     where a.id = $1 and a.tenant_id = $2 and a.deleted_at is null`,
    [assetId, tenantId]
  );
  const asset = assetResult.rows[0];
  if (!asset) return null;

  const geometryResult = await pool.query<DbRow>('select * from tank_geometry where asset_id = $1', [assetId]);
  const shellCourseResult = await pool.query<DbRow>(
    `select sc.*, m.material_code, m.material_name, m.material_specification as material_master_specification
     from shell_courses sc
     left join materials m on m.id = sc.material_id
     where sc.asset_id = $1
     order by sc.course_no asc`,
    [assetId]
  );

  return {
    ...mapAsset(asset),
    geometry: mapGeometry(geometryResult.rows[0]),
    shell_courses: shellCourseResult.rows.map(mapShellCourse)
  };
}


async function buildAssetIntegrityReadiness(client: PoolClient, assetId: string, tenantId: string): Promise<Record<string, unknown> | null> {
  const assetResult = await client.query<DbRow>(
    `select a.*, coalesce(a.construction_year, tg.construction_year) as asset_construction_year
       from assets a
       left join tank_geometry tg on tg.asset_id = a.id
      where a.id = $1::uuid and a.tenant_id = $2::uuid and a.deleted_at is null
      limit 1`,
    [assetId, tenantId]
  );
  const asset = assetResult.rows[0];
  if (!asset) return null;

  const [geometry, shellCourses, evidence, inspections, ndt, findings, calculations, decisions, reports, workOrders, reviews, approvals, auditEvents] = await Promise.all([
    client.query<DbRow>('select * from tank_geometry where asset_id = $1::uuid limit 1', [assetId]),
    client.query<DbRow>(
      `select sc.*, m.material_code, m.material_name, m.material_specification as material_master_specification
         from shell_courses sc
         left join materials m on m.id = sc.material_id
        where sc.asset_id = $1::uuid
        order by sc.course_no asc
        limit 50`,
      [assetId]
    ),
    client.query<DbRow>(
      `select distinct
          ef.id as evidence_file_id,
          ef.evidence_code,
          ef.original_filename,
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
        where ef.asset_id = $1::uuid
           or (el.linked_entity_type = 'asset' and el.linked_entity_id = $1::uuid)
        order by created_at desc
        limit 75`,
      [assetId]
    ),
    client.query<DbRow>(
      `select id, inspection_code, inspection_type, inspection_date, status, summary, created_at, updated_at
         from inspection_events
        where asset_id = $1::uuid
        order by inspection_date desc, created_at desc
        limit 50`,
      [assetId]
    ),
    client.query<DbRow>(
      `select id, measurement_code, component, method, reviewer_status, validation_status, reading_date, created_at, updated_at
         from ndt_measurements
        where asset_id = $1::uuid
        order by created_at desc
        limit 75`,
      [assetId]
    ),
    client.query<DbRow>(
      `select id, finding_code, title, finding_type, severity, status, source_type, created_at, updated_at, reviewed_at, closed_at
         from findings
        where asset_id = $1::uuid
        order by created_at desc
        limit 75`,
      [assetId]
    ),
    client.query<DbRow>(
      `select id, id as run_id, status, created_at, reviewed_at, approved_at, locked_at
         from calculation_runs
        where asset_id = $1::uuid
        order by created_at desc
        limit 75`,
      [assetId]
    ),
    client.query<DbRow>(
      `select id, decision_code, decision_status, integrity_status, decision_type, created_at, reviewed_at, approved_at
         from integrity_decisions
        where asset_id = $1::uuid
        order by created_at desc
        limit 75`,
      [assetId]
    ),
    client.query<DbRow>(
      `select id, report_code, report_title, report_status, created_at, reviewed_at, approved_at, issued_at
         from reports
        where asset_id = $1::uuid
        order by created_at desc
        limit 75`,
      [assetId]
    ),
    client.query<DbRow>(
      `select id, work_order_code, title, status, priority, source_entity_type, source_entity_id, created_at, closed_at
         from internal_work_orders
        where asset_id = $1::uuid
        order by created_at desc
        limit 75`,
      [assetId]
    ),
    client.query<DbRow>(
      `select er.id, er.entity_type, er.entity_id, er.review_type, er.review_status, er.reviewed_at, er.reviewed_at as created_at
         from engineering_reviews er
        where (er.entity_type = 'asset' and er.entity_id = $1::uuid)
           or (er.entity_type = 'inspection_event' and er.entity_id in (select id from inspection_events where asset_id = $1::uuid))
           or (er.entity_type = 'ndt_measurement' and er.entity_id in (select id from ndt_measurements where asset_id = $1::uuid))
           or (er.entity_type = 'calculation_run' and er.entity_id in (select id from calculation_runs where asset_id = $1::uuid))
           or (er.entity_type = 'integrity_decision' and er.entity_id in (select id from integrity_decisions where asset_id = $1::uuid))
        order by er.reviewed_at desc
        limit 75`,
      [assetId]
    ),
    client.query<DbRow>(
      `select ar.id, ar.entity_type, ar.entity_id, ar.approval_status, ar.approved_at, ar.approved_at as created_at
         from approval_records ar
        where (ar.entity_type = 'asset' and ar.entity_id = $1::uuid)
           or (ar.entity_type = 'inspection_event' and ar.entity_id in (select id from inspection_events where asset_id = $1::uuid))
           or (ar.entity_type = 'ndt_measurement' and ar.entity_id in (select id from ndt_measurements where asset_id = $1::uuid))
           or (ar.entity_type = 'calculation_run' and ar.entity_id in (select id from calculation_runs where asset_id = $1::uuid))
           or (ar.entity_type = 'integrity_decision' and ar.entity_id in (select id from integrity_decisions where asset_id = $1::uuid))
        order by ar.approved_at desc
        limit 75`,
      [assetId]
    ),
    client.query<DbRow>(
      `select id as audit_log_id, event_type, actor_user_id, actor_role_codes, entity_type, entity_id, created_at, metadata_json
         from audit_logs
        where (entity_type = 'asset' and entity_id = $1::uuid)
           or (entity_type = 'tank_geometry' and (metadata_json ->> 'asset_id') = $1::text)
           or (entity_type = 'shell_course' and (metadata_json ->> 'asset_id') = $1::text)
           or (entity_type = 'inspection_event' and entity_id in (select id from inspection_events where asset_id = $1::uuid))
           or (entity_type = 'ndt_measurement' and entity_id in (select id from ndt_measurements where asset_id = $1::uuid))
           or (entity_type = 'calculation_run' and entity_id in (select id from calculation_runs where asset_id = $1::uuid))
           or (entity_type = 'integrity_decision' and entity_id in (select id from integrity_decisions where asset_id = $1::uuid))
        order by created_at desc
        limit 75`,
      [assetId]
    )
  ]);

  const assetRecord = mapAsset(asset);
  const geometryRecord = mapGeometry(geometry.rows[0]);
  const shellCourseRecords = shellCourses.rows.map(mapShellCourse);
  const masterFields = ['asset_tag', 'asset_name', 'facility', 'service_fluid', 'tank_type', 'owner', 'operating_status'];
  const missingMasterFields = masterFields.filter((field) => !assetRecord[field]);
  const shellCoursesWithMaterials = shellCourseRecords.filter((course) => Boolean(course.material_id || course.material_code)).length;
  const evidenceCount = evidence.rows.length;
  const inspectionCount = inspections.rows.length;
  const ndtCount = ndt.rows.length;
  const findingCount = findings.rows.length;
  const calculationCount = calculations.rows.length;
  const decisionCount = decisions.rows.length;
  const reportWorkOrderCount = reports.rows.length + workOrders.rows.length;
  const reviewApprovalCount = reviews.rows.length + approvals.rows.length;
  const activeFindingCount = findings.rows.filter((row) => !['closed', 'resolved', 'rejected_duplicate'].includes(String(row.status ?? '').toLowerCase())).length;

  const gates = [
    assetReadinessGate('asset_recorded', true, 'Asset exists in AIM PostgreSQL and is the integrity package anchor.', { asset_id: assetId }),
    assetReadinessGate('asset_master_data_complete', missingMasterFields.length === 0, 'Asset master fields should be complete before downstream integrity use.', { missing_fields: missingMasterFields }),
    assetReadinessGate('geometry_recorded', Boolean(geometryRecord), 'Tank geometry should be recorded for integrity package context.', { geometry_id: geometryRecord?.geometry_id ?? null }, true),
    assetReadinessGate('shell_courses_present', shellCourseRecords.length > 0, 'Shell-course records should be present for tank integrity package traceability.', { shell_course_count: shellCourseRecords.length }, true),
    assetReadinessGate('material_traceability_visible', shellCourseRecords.length === 0 ? false : shellCoursesWithMaterials === shellCourseRecords.length, 'Shell courses should show material traceability where available.', { shell_courses_with_materials: shellCoursesWithMaterials, shell_course_count: shellCourseRecords.length }, false, true),
    assetReadinessGate('evidence_package_linked', evidenceCount > 0, 'Asset integrity package should have direct same-asset evidence metadata or evidence_links.', { evidence_count: evidenceCount }, true),
    assetReadinessGate('inspection_history_visible', inspectionCount > 0, 'Inspection history should be visible before asset integrity package use.', { inspection_event_count: inspectionCount }, false, true),
    assetReadinessGate('ndt_measurement_coverage_visible', ndtCount > 0, 'NDT measurement coverage should be visible when asset data is used downstream.', { ndt_measurement_count: ndtCount }, false, true),
    assetReadinessGate('finding_triage_visible', findingCount > 0, 'Finding/anomaly triage should be visible when conditions requiring disposition exist.', { finding_count: findingCount, active_finding_count: activeFindingCount }, false, true),
    assetReadinessGate('calculation_traceability_visible', calculationCount > 0, 'Deterministic calculation traceability should be visible when asset data has been used in calculations.', { calculation_run_count: calculationCount }, false, true),
    assetReadinessGate('integrity_decision_trace_visible', decisionCount > 0, 'Integrity decision traceability should be visible when asset readiness has produced decisions.', { integrity_decision_count: decisionCount }, false, true),
    assetReadinessGate('report_work_order_trace_visible', reportWorkOrderCount > 0, 'Report and work-order traceability should be visible when downstream outputs exist.', { report_count: reports.rows.length, internal_work_order_count: workOrders.rows.length }, false, true),
    assetReadinessGate('review_or_approval_trace_present', reviewApprovalCount > 0 || ['approved', 'active'].includes(String(asset.status ?? '').toLowerCase()), 'Human review/approval trace should be visible before final downstream use.', { review_count: reviews.rows.length, approval_count: approvals.rows.length, asset_status: asset.status ?? null }, false, true),
    assetReadinessGate('ai_n8n_finalization_absent', true, 'AI/n8n/service actors cannot approve, calculate, issue, close, or finalize asset integrity package readiness.', { finalization_actor_allowed: false }, false)
  ];
  const summary = assetGateSummary(gates);

  return {
    asset_id: assetId,
    tank_tag: asset.asset_tag,
    ready_for_integrity_use: summary.blocking === 0,
    gate_summary: summary,
    asset: assetRecord,
    geometry: geometryRecord,
    shell_courses: shellCourseRecords,
    readiness_gates: gates,
    evidence_traceability: {
      direct_evidence_count: evidenceCount,
      linked_evidence: evidence.rows.map(mapAssetEvidence)
    },
    package_counts: {
      shell_courses: shellCourseRecords.length,
      evidence_files: evidenceCount,
      inspection_events: inspectionCount,
      ndt_measurements: ndtCount,
      findings: findingCount,
      active_findings: activeFindingCount,
      calculation_runs: calculationCount,
      engineering_reviews: reviews.rows.length,
      approval_records: approvals.rows.length,
      integrity_decisions: decisionCount,
      reports: reports.rows.length,
      internal_work_orders: workOrders.rows.length,
      audit_events: auditEvents.rows.length
    },
    linked_context: {
      inspection_events: inspections.rows.map(mapTraceRow),
      ndt_measurements: ndt.rows.map(mapTraceRow),
      findings: findings.rows.map(mapTraceRow),
      calculation_runs: calculations.rows.map(mapTraceRow),
      engineering_reviews: reviews.rows.map(mapTraceRow),
      approval_records: approvals.rows.map(mapTraceRow),
      integrity_decisions: decisions.rows.map(mapTraceRow),
      reports: reports.rows.map(mapTraceRow),
      internal_work_orders: workOrders.rows.map(mapTraceRow)
    },
    audit_events: auditEvents.rows.map(mapAssetAuditEvent),
    governance_notes: [
      'RC4-R asset integrity package readiness is read-only and does not approve, reject, calculate, issue reports, close work orders, upload evidence, or update assets.',
      'Asset readiness summarizes AIM PostgreSQL records, evidence metadata, and traceability links only.',
      'No API 579/API 581/FFS/RBI/corrosion-rate/remaining-life formula is executed by this endpoint.',
      'AI/n8n/service actors cannot finalize asset integrity package readiness.'
    ]
  };
}

assetsRouter.get('/materials', requirePermission('asset.read'), async (_req, res, next) => {
  try {
    const result = await pool.query<DbRow>(
      `select id, material_code, material_name, material_specification, material_family, notes, is_active
       from materials
       where is_active = true
       order by material_code asc`
    );
    res.json({ data: result.rows.map(mapMaterial) });
  } catch (error) {
    next(error);
  }
});

assetsRouter.get('/assets', requirePermission('asset.read'), async (req, res, next) => {
  try {
    const search = asString(req.query.search);
    const tenant = requireTenantContextFromRequest(req);
    const values: string[] = [];
    let where = 'where a.deleted_at is null';
    if (search) {
      values.push(`%${search}%`);
      where += ` and (a.asset_tag ilike $${values.length} or a.asset_name ilike $${values.length} or a.facility ilike $${values.length})`;
    }

    const scoped = appendTenantWhereClause({ baseWhere: where, alias: 'a', params: values, tenant });
    const result = await pool.query<DbRow>(
      `select a.*, coalesce(a.construction_year, tg.construction_year) as asset_construction_year
       from assets a
       left join tank_geometry tg on tg.asset_id = a.id
       ${scoped.clause}
       order by a.asset_tag asc`,
      scoped.params
    );

    res.json({ data: result.rows.map(mapAsset) });
  } catch (error) {
    next(error);
  }
});


assetsRouter.get('/assets/:assetId/readiness', requirePermission('asset.read'), async (req, res: ApiResponse, next) => {
  const assetId = req.params.assetId;
  if (!isUuid(assetId)) {
    controlledError(res, 400, 'ASSET_ID_INVALID', 'assetId must be a UUID.');
    return;
  }

  try {
    const client = await pool.connect();
    try {
      const tenant = requireTenantContextFromRequest(req);
      const readiness = await buildAssetIntegrityReadiness(client, assetId, tenant.tenantId);
      if (!readiness) {
        controlledError(res, 404, 'ASSET_NOT_FOUND', 'Tank asset not found.');
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

assetsRouter.post('/assets', requirePermission('asset.create'), async (req, res, next) => {
  const body = ensureBody(req, res);
  if (!body) return;

  const validation = validateTankAssetPayload(body);
  if (!validation.ok) {
    validationError(res, validation.issues);
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('begin');
    const result = await client.query<DbRow>(
      `insert into assets(
        tenant_id,
        asset_tag,
        asset_name,
        asset_type,
        facility,
        area,
        location,
        service_fluid,
        status,
        tank_type,
        construction_year,
        design_code,
        design_code_edition,
        original_design_code,
        current_assessment_code,
        code_edition,
        owner,
        operating_status,
        inspection_due_date
      ) values ($1, $2, $3, 'aboveground_storage_tank', $4, $5, $5, $6, 'draft', $7, $8, $9, $11, $9, $10, $11, $12, $13, $14)
      returning *`,
      [
        tenantIdForInsert(req),
        asString(body.tank_tag),
        asString(body.asset_name),
        asString(body.facility),
        asString(body.location),
        asString(body.service_fluid),
        asString(body.tank_type),
        asInteger(body.construction_year),
        asString(body.original_design_code),
        asString(body.current_assessment_code),
        asString(body.code_edition),
        asString(body.owner),
        asString(body.operating_status),
        asDateString(body.inspection_due_date)
      ]
    );

    const asset = result.rows[0];
    const auditLogId = asset?.id
      ? await writeAudit(client, req, 'ASSET_CREATED', 'asset', String(asset.id), null, mapAsset(asset), {
          module: 'tank_asset_register',
          sprint: 'asset_master_data'
        })
      : undefined;
    await client.query('commit');
    res.status(201).json({ data: mapAsset(asset ?? {}), auditLogId });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});

assetsRouter.get('/assets/:assetId', requirePermission('asset.read'), async (req, res, next) => {
  try {
    const assetId = req.params.assetId;

    if (!assetId) {
      return res.status(400).json({
        error: {
          code: 'MISSING_ROUTE_PARAM',
          message: 'Missing required route parameter: assetId'
        }
      });
    }

    const tenant = requireTenantContextFromRequest(req);
    const data = await getAssetBundle(assetId, tenant.tenantId);

    if (!data) {
      res.status(404).json({
        error: {
          code: 'ASSET_NOT_FOUND',
          message: 'Tank asset not found.'
        }
      });
      return;
    }

    res.json({ data });
  } catch (error) {
    next(error);
  }
});

assetsRouter.patch('/assets/:assetId', requirePermission('asset.update'), async (req, res, next) => {
  const assetId = req.params.assetId;

  if (!assetId) {
    res.status(400).json({
      error: {
        code: 'MISSING_ROUTE_PARAM',
        message: 'Missing required route parameter: assetId'
      }
    });
    return;
  }

  const body = ensureBody(req, res);
  if (!body) return;

  const validation = validateTankAssetPayload(body);
  if (!validation.ok) {
    validationError(res, validation.issues);
    return;
  }

  const client = await pool.connect();

  try {
    await client.query('begin');

    const beforeResult = await client.query<DbRow>(
      'select * from assets where id = $1 and tenant_id = $2 and deleted_at is null',
      [assetId, tenantIdForInsert(req)]
    );

    const before = beforeResult.rows[0];

    if (!before) {
      await client.query('rollback');
      res.status(404).json({
        error: {
          code: 'ASSET_NOT_FOUND',
          message: 'Tank asset not found.'
        }
      });
      return;
    }

    const result = await client.query<DbRow>(
      `update assets set
        asset_tag = $2,
        asset_name = $3,
        facility = $4,
        area = $5,
        location = $5,
        service_fluid = $6,
        tank_type = $7,
        construction_year = $8,
        design_code = $9,
        original_design_code = $9,
        current_assessment_code = $10,
        design_code_edition = $11,
        code_edition = $11,
        owner = $12,
        operating_status = $13,
        inspection_due_date = $14,
        updated_at = now()
       where id = $1 and tenant_id = $15 and deleted_at is null
       returning *`,
      [
        assetId,
        asString(body.tank_tag),
        asString(body.asset_name),
        asString(body.facility),
        asString(body.location),
        asString(body.service_fluid),
        asString(body.tank_type),
        asInteger(body.construction_year),
        asString(body.original_design_code),
        asString(body.current_assessment_code),
        asString(body.code_edition),
        asString(body.owner),
        asString(body.operating_status),
        asDateString(body.inspection_due_date),
        tenantIdForInsert(req)
      ]
    );

    const asset = result.rows[0];

    const auditLogId = await writeAudit(
      client,
      req,
      'ASSET_UPDATED',
      'asset',
      assetId,
      mapAsset(before),
      mapAsset(asset ?? {}),
      {
        module: 'tank_asset_register'
      }
    );

    await client.query('commit');

    res.json({
      data: mapAsset(asset ?? {}),
      auditLogId
    });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});

assetsRouter.delete('/assets/:assetId', requirePermission('asset.delete'), async (req, res, next) => {
  const assetId = req.params.assetId;

  if (!assetId) {
    res.status(400).json({
      error: {
        code: 'MISSING_ROUTE_PARAM',
        message: 'Missing required route parameter: assetId'
      }
    });
    return;
  }

  const client = await pool.connect();

  try {
    await client.query('begin');

    const beforeResult = await client.query<DbRow>(
      'select * from assets where id = $1 and tenant_id = $2 and deleted_at is null',
      [assetId, tenantIdForInsert(req)]
    );

    const before = beforeResult.rows[0];

    if (!before) {
      await client.query('rollback');
      res.status(404).json({
        error: {
          code: 'ASSET_NOT_FOUND',
          message: 'Tank asset not found.'
        }
      });
      return;
    }

    const result = await client.query<DbRow>(
      `update assets set status = 'retired', operating_status = 'retired', deleted_at = now(), deleted_by = $2, updated_at = now()
       where id = $1 and tenant_id = $3 and deleted_at is null
       returning *`,
      [assetId, actorUserId(req), tenantIdForInsert(req)]
    );

    const after = result.rows[0];

    const auditLogId = await writeAudit(
      client,
      req,
      'ASSET_DELETED',
      'asset',
      assetId,
      mapAsset(before),
      mapAsset(after ?? {}),
      {
        deletion_type: 'soft_delete',
        module: 'tank_asset_register'
      }
    );

    await client.query('commit');

    res.json({
      data: mapAsset(after ?? {}),
      auditLogId
    });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});

assetsRouter.get('/assets/:assetId/geometry', requirePermission('asset.read'), async (req, res, next) => {
  try {
    const result = await pool.query<DbRow>('select * from tank_geometry where asset_id = $1', [req.params.assetId]);
    res.json({ data: mapGeometry(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

assetsRouter.put('/assets/:assetId/geometry', requirePermission('asset.update'), async (req, res, next) => {
  const body = ensureBody(req, res);
  if (!body) return;

  const validation = validateGeometryPayload(body);
  if (!validation.ok) {
    validationError(res, validation.issues);
    return;
  }

  const diameterM = normalizeLengthToMeters(asNumber(body.diameter) ?? 0, asString(body.diameter_unit) ?? 'm');
  const shellHeightM = normalizeLengthToMeters(asNumber(body.shell_height) ?? 0, asString(body.shell_height_unit) ?? 'm');
  const designLiquidLevelM = normalizeLengthToMeters(asNumber(body.design_liquid_level) ?? 0, asString(body.design_liquid_level_unit) ?? 'm');

  const client = await pool.connect();
  try {
    await client.query('begin');
    const assetExists = await client.query('select 1 from assets where id = $1 and tenant_id = $2 and deleted_at is null', [req.params.assetId, tenantIdForInsert(req)]);
    if ((assetExists.rowCount ?? 0) === 0) {
      await client.query('rollback');
      res.status(404).json({ error: { code: 'ASSET_NOT_FOUND', message: 'Tank asset not found.' } });
      return;
    }

    const beforeResult = await client.query<DbRow>('select * from tank_geometry where asset_id = $1', [req.params.assetId]);
    const before = beforeResult.rows[0];
    const result = await client.query<DbRow>(
      `insert into tank_geometry(
        asset_id,
        diameter_m,
        height_m,
        shell_height_m,
        number_of_courses,
        nominal_capacity_m3,
        design_liquid_level_m,
        bottom_type,
        roof_type,
        foundation_type,
        construction_year,
        design_pressure_kpa,
        design_temperature_c,
        specific_gravity,
        vacuum_design_basis,
        status
      ) values ($1, $2, $3, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'draft')
      on conflict (asset_id) do update set
        diameter_m = excluded.diameter_m,
        height_m = excluded.height_m,
        shell_height_m = excluded.shell_height_m,
        number_of_courses = excluded.number_of_courses,
        nominal_capacity_m3 = excluded.nominal_capacity_m3,
        design_liquid_level_m = excluded.design_liquid_level_m,
        bottom_type = excluded.bottom_type,
        roof_type = excluded.roof_type,
        foundation_type = excluded.foundation_type,
        construction_year = excluded.construction_year,
        design_pressure_kpa = excluded.design_pressure_kpa,
        design_temperature_c = excluded.design_temperature_c,
        specific_gravity = excluded.specific_gravity,
        vacuum_design_basis = excluded.vacuum_design_basis,
        updated_at = now()
      returning *`,
      [
        req.params.assetId,
        diameterM,
        shellHeightM,
        asInteger(body.number_of_courses),
        asNumber(body.nominal_capacity),
        designLiquidLevelM,
        asString(body.bottom_type),
        asString(body.roof_type),
        asString(body.foundation_type),
        asInteger(body.construction_year),
        asNumber(body.design_pressure),
        asNumber(body.design_temperature),
        asNumber(body.specific_gravity),
        asString(body.vacuum_design_basis)
      ]
    );
    const geometry = result.rows[0];
    const auditLogId = await writeAudit(client, req, before ? 'TANK_GEOMETRY_UPDATED' : 'TANK_GEOMETRY_CREATED', 'tank_geometry', String(geometry?.id), mapGeometry(before), mapGeometry(geometry), {
      asset_id: req.params.assetId,
      unit_normalization: 'geometry length values stored internally in meters'
    });
    await client.query('commit');
    res.json({ data: mapGeometry(geometry), auditLogId });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});

assetsRouter.get('/assets/:assetId/shell-courses', requirePermission('asset.read'), async (req, res, next) => {
  try {
    const result = await pool.query<DbRow>(
      `select sc.*, m.material_code, m.material_name, m.material_specification as material_master_specification
       from shell_courses sc
       left join materials m on m.id = sc.material_id
       where sc.asset_id = $1
       order by sc.course_no asc`,
      [req.params.assetId]
    );
    res.json({ data: result.rows.map(mapShellCourse) });
  } catch (error) {
    next(error);
  }
});

assetsRouter.post('/assets/:assetId/shell-courses', requirePermission('asset.update'), async (req, res, next) => {
  const body = ensureBody(req, res);
  if (!body) return;

  const validation = validateShellCoursePayload(body);
  if (!validation.ok) {
    validationError(res, validation.issues);
    return;
  }

  const courseHeightMm = normalizeLengthToMillimeters(asNumber(body.course_height) ?? 0, asString(body.course_height_unit) ?? 'm');

  const client = await pool.connect();
  try {
    await client.query('begin');
    const materialResult = await client.query<DbRow>('select * from materials where id = $1 and is_active = true', [asString(body.material_id)]);
    const material = materialResult.rows[0];
    if (!material) {
      await client.query('rollback');
      validationError(res, [{ field: 'material_id', message: 'Selected material does not exist or is inactive.', severity: 'error' }]);
      return;
    }

    const result = await client.query<DbRow>(
      `insert into shell_courses(
        asset_id,
        course_no,
        material_id,
        nominal_thickness_mm,
        measured_min_thickness_mm,
        height_mm,
        course_height_mm,
        material_specification,
        joint_efficiency,
        corrosion_allowance_mm,
        coating_lining_status,
        status
      ) values ($1, $2, $3, $4, $5, $6, $6, $7, $8, $9, $10, 'draft')
      returning *`,
      [
        req.params.assetId,
        asInteger(body.course_no),
        asString(body.material_id),
        asNumber(body.nominal_thickness),
        asNumber(body.measured_min_thickness),
        courseHeightMm,
        asString(body.material_specification) ?? String(material.material_specification ?? ''),
        asNumber(body.joint_efficiency),
        asNumber(body.corrosion_allowance),
        asString(body.coating_lining_status)
      ]
    );
    const shellCourse = result.rows[0];
    const auditLogId = await writeAudit(client, req, 'SHELL_COURSE_CREATED', 'shell_course', String(shellCourse?.id), null, mapShellCourse({ ...shellCourse, ...material }), {
      asset_id: req.params.assetId,
      unit_normalization: 'course height stored internally in mm; thickness stored internally in mm'
    });
    await client.query('commit');
    res.status(201).json({ data: mapShellCourse({ ...shellCourse, ...material }), auditLogId });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});

assetsRouter.patch('/assets/:assetId/shell-courses/:courseId', requirePermission('asset.update'), async (req, res, next) => {
  const assetId = req.params.assetId;
  const courseId = req.params.courseId;

  if (!assetId || !courseId) {
    res.status(400).json({
      error: {
        code: 'MISSING_ROUTE_PARAM',
        message: 'Missing required route parameter: assetId or courseId'
      }
    });
    return;
  }

  const body = ensureBody(req, res);
  if (!body) return;

  const courseHeightMm = normalizeLengthToMillimeters(asNumber(body.course_height) ?? 0, asString(body.course_height_unit) ?? 'm');
  const courseNo = asInteger(body.course_no);
  const materialId = asString(body.material_id);
  const nominalThickness = asNumber(body.nominal_thickness);
  const measuredMinThickness = asNumber(body.measured_min_thickness);
  const materialSpecification = asString(body.material_specification);
  const jointEfficiency = asNumber(body.joint_efficiency);
  const corrosionAllowance = asNumber(body.corrosion_allowance);
  const coatingLiningStatus = asString(body.coating_lining_status);

  if (
    courseNo === undefined ||
    !materialId ||
    nominalThickness === undefined ||
    measuredMinThickness === undefined ||
    jointEfficiency === undefined
  ) {
    validationError(res, [
      {
        field: 'shell_course',
        message: 'Missing required shell course field after validation.',
        severity: 'error'
      }
    ]);
    return;
  }
  const client = await pool.connect();
  try {
    await client.query('begin');
    const beforeResult = await client.query<DbRow>('select * from shell_courses where id = $1 and asset_id = $2', [courseId, assetId]);
    const before = beforeResult.rows[0];
    if (!before) {
      await client.query('rollback');
      res.status(404).json({ error: { code: 'SHELL_COURSE_NOT_FOUND', message: 'Shell course not found.' } });
      return;
    }

  const materialResult = await client.query<DbRow>(
    'select * from materials where id = $1 and is_active = true',
    [materialId]
  );
    const material = materialResult.rows[0];
    if (!material) {
      await client.query('rollback');
      validationError(res, [{ field: 'material_id', message: 'Selected material does not exist or is inactive.', severity: 'error' }]);
      return;
    }

    const result = await client.query<DbRow>(
      `update shell_courses set
        course_no = $3,
        material_id = $4,
        nominal_thickness_mm = $5,
        measured_min_thickness_mm = $6,
        height_mm = $7,
        course_height_mm = $7,
        material_specification = $8,
        joint_efficiency = $9,
        corrosion_allowance_mm = $10,
        coating_lining_status = $11,
        updated_at = now()
       where id = $1 and asset_id = $2
       returning *`,
      [
        courseId,
        assetId,
        courseNo,
        materialId,
        nominalThickness,
        measuredMinThickness,
        courseHeightMm,
        materialSpecification ?? String(material.material_specification ?? ''),
        jointEfficiency,
        corrosionAllowance ?? null,
        coatingLiningStatus ?? null
      ]
    );
    const shellCourse = result.rows[0];

    if (!shellCourse) {
      await client.query('rollback');
      res.status(404).json({
        error: {
          code: 'SHELL_COURSE_NOT_FOUND',
          message: 'Shell course not found after update.'
        }
      });
      return;
    }

    const auditLogId = await writeAudit(
      client,
      req,
      'SHELL_COURSE_UPDATED',
      'shell_course',
      courseId,
      mapShellCourse(before),
      mapShellCourse(shellCourse),
      {
        asset_id: assetId
      }
    );
    await client.query('commit');
    res.json({ data: mapShellCourse({ ...shellCourse, ...material }), auditLogId });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});

assetsRouter.delete('/assets/:assetId/shell-courses/:courseId', requirePermission('asset.update'), async (req, res, next) => {
  const assetId = req.params.assetId;
  const courseId = req.params.courseId;

  if (!assetId || !courseId) {
    res.status(400).json({
      error: {
        code: 'MISSING_ROUTE_PARAM',
        message: 'Missing required route parameter: assetId or courseId'
      }
    });
    return;
  }

  const client = await pool.connect();
  
  try {
    await client.query('begin');
    const beforeResult = await client.query<DbRow>(
      'select * from shell_courses where id = $1 and asset_id = $2',
      [courseId, assetId]
    );
    const before = beforeResult.rows[0];
    if (!before) {
      await client.query('rollback');
      res.status(404).json({ error: { code: 'SHELL_COURSE_NOT_FOUND', message: 'Shell course not found.' } });
      return;
    }
    await client.query('delete from shell_courses where id = $1 and asset_id = $2', [courseId, assetId]);
    const auditLogId = await writeAudit(client, req, 'SHELL_COURSE_DELETED', 'shell_course', courseId, mapShellCourse(before), null, {
      asset_id: assetId
    });
    await client.query('commit');
    res.json({ data: { shell_course_id: courseId, deleted: true }, auditLogId });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});
