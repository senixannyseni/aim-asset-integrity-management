import { Router, type Request, type Response } from 'express';
import type { PoolClient } from 'pg';
import { pool } from '../db/client.js';
import { objectStorageService, redactSignedUrl, sha256Hex } from '../modules/object-storage/object-storage-service.js';
import { buildReportExportObjectKey, reportExportMimeType } from '../modules/object-storage/report-storage.js';
import { config } from '../config/env.js';
import { requirePermission } from '../middleware/rbac.js';
import { requireTenantContextFromRequest, tenantScopeMetadata } from '../modules/tenancy/tenant-scope.js';
import { assertTenantObjectKeyBoundary } from '../modules/tenancy/tenant-object-boundary.js';
import { contentHash, renderConsultantReportText, renderDocxBase64, renderPdfBase64, type ReportDocument, type ReportSection } from '../modules/reporting/template-engine.js';

export const reportsRouter = Router();

type DbRow = Record<string, unknown>;
type ApiResponse = Response<Record<string, unknown>>;
type Queryable = {
  query: <T extends DbRow = DbRow>(text: string, values?: unknown[]) => Promise<{ rows: T[]; rowCount: number | null }>;
};

const REPORT_STATUSES = ['draft', 'generated', 'under_review', 'approved', 'issued', 'superseded', 'rejected'] as const;
type ReportStatus = typeof REPORT_STATUSES[number];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function isUuid(value: string | undefined | null): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function validationError(res: ApiResponse, field: string, message: string, code = 'VALIDATION_FAILED'): void {
  res.status(400).json({
    error: {
      code,
      message: 'Request validation failed.',
      details: [{ field, message, severity: 'error' }]
    }
  });
}

function actorUserId(req: Request): string | null {
  const id = req.user?.id;
  if (!id || id === '00000000-0000-0000-0000-000000000000') return null;
  return id;
}

function actorRoles(req: Request): string[] {
  return req.user?.roles ?? [];
}

function isSeniorReportActor(req: Request): boolean {
  const roles = req.user?.roles ?? [];
  return roles.includes('admin') || roles.includes('senior_engineer') || roles.includes('lead_engineer') || roles.includes('approver');
}

function isAiAgent(req: Request): boolean {
  return (req.user?.roles ?? []).includes('ai_agent');
}

function hasRequiredReportComment(req: Request): boolean {
  return Boolean(isPlainObject(req.body) && asString(req.body.approval_comment ?? req.body.issue_comment ?? req.body.comment ?? req.body.reason));
}

function isReportSelfApprovalAttempt(req: Request, report: DbRow): boolean {
  const actor = actorUserId(req);
  return Boolean(actor && report.generated_by === actor);
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

function jsonValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function jsonArray(value: unknown): unknown[] {
  const parsed = jsonValue(value);
  return Array.isArray(parsed) ? parsed : [];
}

function summarize(value: unknown): string {
  if (value === null || value === undefined) return 'not available';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function mapReport(row: DbRow): Record<string, unknown> {
  return {
    report_id: row.id,
    report_code: row.report_code,
    report_title: row.report_title,
    report_type: row.report_type,
    report_status: row.report_status,
    report_version: row.report_version,
    asset_id: row.asset_id,
    calculation_run_id: row.calculation_run_id,
    template_code: row.template_code,
    docx_object_path: row.docx_object_path,
    pdf_object_path: row.pdf_object_path,
    input_snapshot_hash: row.input_snapshot_hash,
    traceability: row.traceability_json,
    validation_warnings: row.validation_warnings_json,
    limitations: row.limitations_json,
    locked_flag: row.locked_flag,
    generated_at: row.generated_at,
    approved_at: row.approved_at,
    issued_at: row.issued_at,
    created_at: row.created_at
  };
}


function mapReportExport(row: DbRow): Record<string, unknown> {
  return {
    report_export_id: row.id,
    export_id: row.id,
    report_id: row.report_id,
    report_version_id: row.report_version_id,
    export_type: row.export_format ?? row.export_type,
    export_format: row.export_format ?? row.export_type,
    export_status: row.export_status,
    download_status: row.download_status,
    storage_provider: row.storage_provider,
    storage_bucket: row.storage_bucket,
    object_key: row.object_key ?? row.object_storage_uri,
    object_storage_uri: row.object_storage_uri,
    content_hash_sha256: row.content_hash_sha256 ?? row.checksum_sha256,
    checksum_sha256: row.checksum_sha256 ?? row.content_hash_sha256,
    input_snapshot_hash: row.input_snapshot_hash,
    file_size_bytes: row.file_size_bytes,
    mime_type: row.mime_type,
    generated_by: row.generated_by ?? row.exported_by,
    generated_at: row.generated_at ?? row.exported_at,
    created_at: row.created_at
  };
}

function normalizeExportType(value: unknown): 'pdf' | 'docx' | 'json' | 'html' | undefined {
  const normalized = asString(value)?.toLowerCase();
  if (normalized === 'pdf' || normalized === 'docx' || normalized === 'json' || normalized === 'html') return normalized;
  return undefined;
}

function filenameForReportExport(report: DbRow, exportId: string, exportType: string): string {
  const reportCode = String(report.report_code ?? report.id ?? 'report').replace(/[^A-Za-z0-9._-]/g, '-');
  return `${reportCode}-${exportId}.${exportType}`;
}

function bufferForReportExport(report: DbRow, exportType: 'pdf' | 'docx' | 'json' | 'html'): Buffer | undefined {
  if (exportType === 'pdf') {
    const base64 = asString(report.pdf_content_base64);
    return base64 ? Buffer.from(base64, 'base64') : undefined;
  }
  if (exportType === 'docx') {
    const base64 = asString(report.docx_content_base64);
    return base64 ? Buffer.from(base64, 'base64') : undefined;
  }
  if (exportType === 'html') {
    return Buffer.from(`<pre>${String(report.plain_text_content ?? '')}</pre>`, 'utf8');
  }
  return Buffer.from(JSON.stringify(mapReport(report), null, 2), 'utf8');
}

function safeCodePart(value: unknown): string {
  return String(value ?? 'RUN').replace(/[^A-Za-z0-9-]/g, '').slice(0, 32) || 'RUN';
}

function isReportableCalculation(run: DbRow): boolean {
  const states = [run.run_status, run.status, run.review_status, run.approval_status].map((value) => asString(value));
  return states.some((state) =>
    ['ready_for_review', 'reviewed', 'submitted_for_approval', 'approved', 'locked'].includes(state ?? '')
  ) || Boolean(run.locked_flag);
}

async function loadReportContext(client: Queryable, calculationRunId: string, tenantId: string): Promise<{
  run: DbRow;
  asset: DbRow | undefined;
  geometry: DbRow | undefined;
  shellCourses: DbRow[];
  ndtRows: DbRow[];
  inputs: DbRow[];
  outputs: DbRow[];
  formula: DbRow | undefined;
  evidence: DbRow[];
  ffsCases: DbRow[];
  rbiCases: DbRow[];
  reviews: DbRow[];
  approvals: DbRow[];
  auditTrail: DbRow[];
}> {
  const runResult = await client.query<DbRow>('select * from calculation_runs where id = $1 and tenant_id = $2::uuid', [calculationRunId, tenantId]);
  const run = runResult.rows[0];
  if (!run) {
    const error = new Error('CALCULATION_RUN_NOT_FOUND');
    (error as Error & { statusCode?: number }).statusCode = 404;
    throw error;
  }

  const assetId = asString(run.asset_id);
  const [assetResult, geometryResult, shellResult, inputResult, outputResult, formulaResult, evidenceResult, ffsResult, rbiResult, reviewResult, approvalResult, auditResult] = await Promise.all([
    assetId ? client.query<DbRow>('select * from assets where id = $1 and tenant_id = $2::uuid', [assetId, tenantId]) : Promise.resolve({ rows: [], rowCount: 0 }),
    assetId ? client.query<DbRow>('select * from tank_geometry where asset_id = $1 limit 1', [assetId]) : Promise.resolve({ rows: [], rowCount: 0 }),
    assetId ? client.query<DbRow>('select * from shell_courses where asset_id = $1 order by course_no', [assetId]) : Promise.resolve({ rows: [], rowCount: 0 }),
    client.query<DbRow>('select * from calculation_inputs where calculation_run_id = $1 order by input_name, id', [calculationRunId]),
    client.query<DbRow>('select * from calculation_outputs where calculation_run_id = $1 order by output_name, id', [calculationRunId]),
    asString(run.formula_registry_id) ? client.query<DbRow>('select * from formula_registry where id = $1', [run.formula_registry_id]) : Promise.resolve({ rows: [], rowCount: 0 }),
    assetId
      ? client.query<DbRow>(
          `select distinct on (ef.id)
             ef.*,
             coalesce(el.linked_entity_type, ci.source_entity_type) as linked_entity_type,
             coalesce(el.linked_entity_id, ci.source_entity_id) as linked_entity_id,
             ci.input_name as linked_measurement_or_result
           from evidence_files ef
           left join evidence_links el on el.evidence_file_id = ef.id
           left join calculation_inputs ci on ci.evidence_file_id = ef.id and ci.calculation_run_id = $1
           where ef.asset_id = $2
             and ef.tenant_id = $3::uuid
             and (
               ci.calculation_run_id = $1
               or (el.linked_entity_type = 'calculation_run' and el.linked_entity_id = $1)
               or ef.id in (select evidence_file_id from calculation_inputs where calculation_run_id = $1 and evidence_file_id is not null)
             )
           order by ef.id, ef.created_at desc
           limit 200`,
          [calculationRunId, assetId, tenantId]
        )
      : Promise.resolve({ rows: [], rowCount: 0 }),
    client.query<DbRow>(
      `select f.* from ffs_cases f
       join assets a on a.id = f.asset_id
       where f.calculation_run_id = $1 and a.tenant_id = $2::uuid
       order by f.created_at desc`,
      [calculationRunId, tenantId]
    ),
    client.query<DbRow>(
      `select r.* from rbi_cases r
       join assets a on a.id = r.asset_id
       where r.calculation_run_id = $1 and a.tenant_id = $2::uuid
       order by r.created_at desc`,
      [calculationRunId, tenantId]
    ),
    client.query<DbRow>('select * from engineering_reviews where tenant_id = $3::uuid and (calculation_run_id = $1 or (entity_type = $2 and entity_id = $1)) order by updated_at desc', [calculationRunId, 'calculation_run', tenantId]),
    client.query<DbRow>('select * from approval_records where tenant_id = $3::uuid and (calculation_run_id = $1 or (entity_type = $2 and entity_id = $1)) order by updated_at desc', [calculationRunId, 'calculation_run', tenantId]),
    client.query<DbRow>('select * from audit_logs where tenant_id = $2::uuid and entity_id = $1 order by created_at desc limit 100', [calculationRunId, tenantId])
  ]);

  const ndtIds = inputResult.rows
    .filter((row) => row.source_entity_type === 'ndt_measurement' && row.source_entity_id)
    .map((row) => String(row.source_entity_id));
  const ndtRows = ndtIds.length > 0
    ? (await client.query<DbRow>(`select * from ndt_measurements where id = any($1::uuid[]) and tenant_id = $2::uuid order by component, shell_course_no, reading_date`, [ndtIds, tenantId])).rows
    : [];

  return {
    run,
    asset: assetResult.rows[0],
    geometry: geometryResult.rows[0],
    shellCourses: shellResult.rows,
    ndtRows,
    inputs: inputResult.rows,
    outputs: outputResult.rows,
    formula: formulaResult.rows[0],
    evidence: evidenceResult.rows,
    ffsCases: ffsResult.rows,
    rbiCases: rbiResult.rows,
    reviews: reviewResult.rows,
    approvals: approvalResult.rows,
    auditTrail: auditResult.rows
  };
}

function buildReportDocument(context: Awaited<ReturnType<typeof loadReportContext>>, title: string, status: ReportStatus): ReportDocument {
  const run = context.run;
  const formula = context.formula;
  const asset = context.asset;
  const outputSummary = jsonValue(run.output_summary);
  const warnings = [...jsonArray(run.warnings_json), ...jsonArray(run.validation_result_json), ...jsonArray(run.validation_warnings_json)];
  const limitations = [
    'This report is generated from AIM structured records and evidence links. Engineering approval remains required before issue.',
    'No API/API-ASME copyrighted formula text is embedded in this generated report.',
    'FFS and RBI sections summarize trigger/interface cases only unless a separately approved assessment is attached.'
  ];

  const evidenceRegister = context.evidence.map((row) =>
    `Evidence ${row.evidence_code ?? row.id}: ${row.file_name ?? row.original_filename}, method ${row.method ?? 'n/a'}, component ${row.component ?? 'n/a'}, date ${row.inspection_date ?? 'n/a'}, page/sheet ${row.page_or_sheet_ref ?? row.page_figure_table_reference ?? 'n/a'}, path ${row.object_storage_path ?? row.object_storage_uri ?? 'n/a'}, linked ${row.linked_entity_type ?? 'calculation input'} ${row.linked_entity_id ?? row.linked_measurement_or_result ?? ''}`
  );

  const sections: ReportSection[] = [
    {
      title: 'Engineering Basis Summary',
      body: [
        `Formula ID: ${formula?.formula_id ?? formula?.formula_code ?? 'not available'}`,
        `Formula version: ${formula?.version ?? run.formula_set_version ?? 'not available'}`,
        `Code basis: ${formula?.code_basis ?? 'AIM Engineering Basis / Formula Registry metadata'}`,
        `Code edition: ${formula?.code_edition ?? formula?.edition ?? 'User-supplied licensed edition required'}`,
        'API/API-ASME formula expressions are not reproduced in this report. Formula metadata and approved Formula Registry references are cited for traceability.'
      ]
    },
    {
      title: 'Asset Data Summary',
      body: [
        `Asset tag: ${asset?.asset_tag ?? asset?.tank_tag ?? 'not available'}`,
        `Asset name: ${asset?.asset_name ?? 'not available'}`,
        `Facility/location: ${asset?.facility ?? 'not available'} / ${asset?.location ?? asset?.area ?? 'not available'}`,
        `Service fluid: ${asset?.service_fluid ?? 'not available'}`,
        `Operating status: ${asset?.operating_status ?? 'not available'}`
      ]
    },
    {
      title: 'Inspection Data Summary',
      body: [
        `Inspection event ID: ${run.inspection_event_id ?? 'not linked'}`,
        `Calculation run ID: ${run.id}`,
        `Input snapshot hash/reference: ${run.input_snapshot_hash ?? 'not available'}`,
        `Validation status: ${run.validation_status ?? 'not available'}`
      ]
    },
    {
      title: 'NDT Thickness Summary',
      body: context.ndtRows.length > 0
        ? context.ndtRows.map((row) => `${row.component ?? 'component'} course ${row.shell_course_no ?? 'n/a'} ${row.cml_tml_id ?? row.grid_ref ?? ''}: ${row.measured_thickness_mm ?? row.measured_thickness ?? 'n/a'} mm on ${row.reading_date ?? 'n/a'} (${row.method ?? 'method n/a'})`)
        : ['No NDT rows were linked directly to this calculation run. Review calculation input records and evidence register.']
    },
    {
      title: 'Calculation Result',
      body: [
        `Run status: ${run.run_status ?? run.status ?? 'not available'}`,
        `Review status: ${run.review_status ?? 'not available'}`,
        `Approval status: ${run.approval_status ?? 'not available'}`,
        `Output summary: ${summarize(outputSummary)}`
      ]
    },
    {
      title: 'Corrosion Rate and Remaining Life',
      body: context.outputs.filter((row) => String(row.output_name ?? '').match(/corrosion|remaining/i)).map((row) => `${row.output_name}: ${row.output_value ?? summarize(row.output_json)} ${row.output_unit ?? ''}`)
        .concat(context.outputs.length === 0 ? ['No calculation output rows are available.'] : [])
    },
    {
      title: 'Minimum Thickness Check',
      body: context.outputs.filter((row) => String(row.output_name ?? '').match(/pass|fail|required|thickness|min/i)).map((row) => `${row.output_name}: ${row.output_value ?? summarize(row.output_json)} ${row.output_unit ?? ''}`)
        .concat(['Minimum thickness checks are reported from deterministic outputs and/or controlled Formula Registry references only.'])
    },
    {
      title: 'FFS/RBI Trigger Summary',
      body: [
        ...(context.ffsCases.length > 0 ? context.ffsCases.map((row) => `FFS ${row.case_id ?? row.id}: ${row.damage_mechanism ?? row.trigger_reason ?? 'trigger'} — status ${row.status}`) : ['No FFS trigger case linked to this calculation run.']),
        ...(context.rbiCases.length > 0 ? context.rbiCases.map((row) => `RBI ${row.case_id ?? row.id}: ${row.risk_category ?? 'risk category n/a'} — ${row.calculation_basis ?? 'qualitative placeholder basis'}`) : ['No RBI interface case linked to this calculation run.'])
      ]
    },
    {
      title: 'Engineering Interpretation',
      body: [
        'Engineering interpretation must be completed or confirmed by qualified engineer/senior engineer before report issue.',
        `Review records: ${context.reviews.length}. Approval records: ${context.approvals.length}.`
      ]
    },
    {
      title: 'Recommendations',
      body: [
        'Review all blocking validation findings before issue.',
        'Confirm FFS/RBI trigger cases and required actions before final disposition.',
        'Issue final report only after senior engineering approval record is complete.'
      ]
    },
    {
      title: 'Evidence Register',
      body: evidenceRegister.length > 0 ? evidenceRegister : ['No evidence files were linked to the calculation run. This is a limitation that must be reviewed before issue.']
    },
    {
      title: 'Review and Approval Record',
      body: [
        ...context.reviews.map((row) => `Review ${row.review_code ?? row.id}: ${row.review_status} — ${row.review_comment ?? 'no comment'}`),
        ...context.approvals.map((row) => `Approval ${row.approval_code ?? row.id}: ${row.approval_status} — ${row.approval_comment ?? row.reason ?? 'no comment'}`),
        ...(context.reviews.length === 0 && context.approvals.length === 0 ? ['No review/approval record is linked yet. Report remains draft.'] : [])
      ]
    },
    {
      title: 'Validation Warnings and Limitations',
      body: [
        ...(warnings.length > 0 ? warnings.map((warning) => summarize(warning)) : ['No validation warning payload was found on the calculation run.']),
        ...limitations
      ]
    }
  ];

  return {
    title,
    status,
    watermark: status === 'approved' || status === 'issued' ? 'APPROVED CONTROLLED REPORT' : 'DRAFT — NOT APPROVED FOR ISSUE',
    generatedAt: new Date().toISOString(),
    traceability: {
      calculation_run_id: run.id,
      run_id: run.run_id,
      formula_id: formula?.formula_id ?? formula?.formula_code ?? null,
      formula_version: formula?.version ?? run.formula_set_version ?? null,
      code_basis: formula?.code_basis ?? null,
      code_edition: formula?.code_edition ?? formula?.edition ?? null,
      input_snapshot_reference: run.input_snapshot_hash ?? null
    },
    sections
  };
}


type ReportGate = {
  gate_type: string;
  gate_status: 'pass' | 'fail';
  blocking: boolean;
  message: string;
  metadata?: Record<string, unknown>;
};

type ReportGateContext = {
  report: DbRow;
  calculation: DbRow | undefined;
  integrityDecision: DbRow | undefined;
  approvedIntegrityDecision: DbRow | undefined;
  evidenceCount: number;
  reportEvidenceCount: number;
  calculationRunEvidenceCount: number;
  calculationInputEvidenceCount: number;
  calculationInputTotalCount: number;
  integrityDecisionEvidenceCount: number;
  openCriticalErrorCount: number;
  blockingReviewGateCount: number;
};

function isNonHumanReportActor(req: Request): boolean {
  const roles = req.user?.roles as readonly string[] | undefined;
  const email = req.user?.email ?? '';
  return Boolean(
    roles?.includes('ai_agent') ||
    roles?.includes('n8n_service') ||
    email.includes('n8n') ||
    email.includes('ai-agent')
  );
}

function gate(gateType: string, pass: boolean, message: string, metadata: Record<string, unknown> = {}): ReportGate {
  return {
    gate_type: gateType,
    gate_status: pass ? 'pass' : 'fail',
    blocking: true,
    message,
    metadata
  };
}

async function loadReportGateContext(client: PoolClient, report: DbRow, tenantId: string): Promise<ReportGateContext> {
  const reportId = asString(report.id);
  const calculationRunId = asString(report.calculation_run_id);
  const assetId = asString(report.asset_id);

  const [calculationResult, integrityResult, approvedIntegrityResult, evidenceResult, criticalErrorResult, blockingGateResult] = await Promise.all([
    calculationRunId
      ? client.query<DbRow>('select * from calculation_runs where id = $1 and tenant_id = $2::uuid', [calculationRunId, tenantId])
      : Promise.resolve({ rows: [], rowCount: 0 }),
    calculationRunId
      ? client.query<DbRow>('select * from integrity_decisions where calculation_run_id = $1 and tenant_id = $2::uuid order by created_at desc limit 1', [calculationRunId, tenantId])
      : Promise.resolve({ rows: [], rowCount: 0 }),
    calculationRunId
      ? client.query<DbRow>(
          `select * from integrity_decisions
           where calculation_run_id = $1 and decision_status = 'approved'
             and tenant_id = $2::uuid
           order by approved_at desc nulls last, created_at desc
           limit 1`,
          [calculationRunId, tenantId]
        )
      : Promise.resolve({ rows: [], rowCount: 0 }),
    calculationRunId || reportId
      ? client.query<{
          report_evidence_count: string;
          calculation_run_evidence_count: string;
          calculation_input_evidence_count: string;
          calculation_input_total_count: string;
          integrity_decision_evidence_count: string;
          total_evidence_count: string;
        }>(
          `with calculation_input_rows as (
             select ci.id, ci.evidence_file_id
             from calculation_inputs ci
             join calculation_runs cr on cr.id = ci.calculation_run_id
             where ci.calculation_run_id = $2::uuid
               and cr.tenant_id = $3::uuid
           ), linked_evidence_counts as (
             select
               count(*) filter (where el.linked_entity_type = 'report' and el.linked_entity_id = $1::uuid)::integer as report_evidence_count,
               count(*) filter (where el.linked_entity_type = 'calculation_run' and el.linked_entity_id = $2::uuid)::integer as calculation_run_evidence_count,
               count(*) filter (where el.linked_entity_type = 'integrity_decision' and el.linked_entity_id in (
                 select id from integrity_decisions where calculation_run_id = $2::uuid and tenant_id = $3::uuid and decision_status = 'approved'
               ))::integer as integrity_decision_evidence_count,
               count(*)::integer as total_evidence_count
             from evidence_links el
             join evidence_files ef on ef.id = el.evidence_file_id
              and ef.upload_status = 'verified'
              and ef.tenant_id = $3::uuid
              and coalesce(ef.object_key, ef.object_storage_path, ef.object_storage_uri) is not null
             where (el.linked_entity_type = 'report' and el.linked_entity_id = $1::uuid)
                or (el.linked_entity_type = 'calculation_run' and el.linked_entity_id = $2::uuid)
                or (el.linked_entity_type = 'calculation_input' and el.linked_entity_id in (select id from calculation_input_rows))
                or (el.linked_entity_type = 'integrity_decision' and el.linked_entity_id in (
                  select id from integrity_decisions where calculation_run_id = $2::uuid and tenant_id = $3::uuid and decision_status = 'approved'
                ))
           ), calculation_input_traceability as (
             select
               count(*)::integer as calculation_input_total_count,
               count(*) filter (
                 where exists (
                   select 1 from evidence_links el
                   join evidence_files ef on ef.id = el.evidence_file_id
                    and ef.upload_status = 'verified'
                    and ef.tenant_id = $3::uuid
                    and coalesce(ef.object_key, ef.object_storage_path, ef.object_storage_uri) is not null
                   where el.linked_entity_type = 'calculation_input'
                     and el.linked_entity_id = calculation_input_rows.id
                 )
                 or exists (
                   select 1 from evidence_files direct_ef
                   where direct_ef.id = calculation_input_rows.evidence_file_id
                     and direct_ef.tenant_id = $3::uuid
                     and direct_ef.upload_status = 'verified'
                     and coalesce(direct_ef.object_key, direct_ef.object_storage_path, direct_ef.object_storage_uri) is not null
                 )
               )::integer as calculation_input_evidence_count
             from calculation_input_rows
           )
           select
             coalesce(linked_evidence_counts.report_evidence_count, 0)::text as report_evidence_count,
             coalesce(linked_evidence_counts.calculation_run_evidence_count, 0)::text as calculation_run_evidence_count,
             coalesce(calculation_input_traceability.calculation_input_evidence_count, 0)::text as calculation_input_evidence_count,
             coalesce(calculation_input_traceability.calculation_input_total_count, 0)::text as calculation_input_total_count,
             coalesce(linked_evidence_counts.integrity_decision_evidence_count, 0)::text as integrity_decision_evidence_count,
             (coalesce(linked_evidence_counts.total_evidence_count, 0) + coalesce(calculation_input_traceability.calculation_input_evidence_count, 0))::text as total_evidence_count
           from linked_evidence_counts cross join calculation_input_traceability`,
          [reportId ?? null, calculationRunId ?? null, tenantId]
        )
      : Promise.resolve({ rows: [{ report_evidence_count: '0', calculation_run_evidence_count: '0', calculation_input_evidence_count: '0', calculation_input_total_count: '0', integrity_decision_evidence_count: '0', total_evidence_count: '0' }], rowCount: 1 }),
    client.query<{ count: string }>(
      `select count(*)::text as count
       from error_logs
       where tenant_id = $4::uuid
         and status not in ('resolved','closed')
         and severity in ('high','critical')
         and coalesce(error_code, '') <> 'REPORT_ISSUE_GATE_BLOCKED'
         and (
           (related_entity_type = 'report' and related_entity_id = $1::uuid)
           or (related_entity_type = 'calculation_run' and related_entity_id = $2::uuid)
           or (related_entity_type = 'asset' and related_entity_id = $3::uuid)
         )`,
      [reportId ?? null, calculationRunId ?? null, assetId ?? null, tenantId]
    ),
    client.query<{ count: string }>(
      `select count(*)::text as count
       from review_gates
       where blocking = true
         and gate_status not in ('pass','waived')
         and not (entity_type = 'report' and entity_id = $1::uuid and gate_domain = 'report_issue')
         and (
           (entity_type = 'report' and entity_id = $1::uuid)
           or (entity_type = 'calculation_run' and entity_id = $2::uuid)
           or (entity_type = 'integrity_decision' and entity_id in (
             select id from integrity_decisions where calculation_run_id = $2::uuid and tenant_id = $3::uuid
           ))
         )`,
      [reportId ?? null, calculationRunId ?? null, tenantId]
    )
  ]);

  return {
    report,
    calculation: calculationResult.rows[0],
    integrityDecision: integrityResult.rows[0],
    approvedIntegrityDecision: approvedIntegrityResult.rows[0],
    evidenceCount: Number(evidenceResult.rows[0]?.total_evidence_count ?? 0),
    reportEvidenceCount: Number(evidenceResult.rows[0]?.report_evidence_count ?? 0),
    calculationRunEvidenceCount: Number(evidenceResult.rows[0]?.calculation_run_evidence_count ?? 0),
    calculationInputEvidenceCount: Number(evidenceResult.rows[0]?.calculation_input_evidence_count ?? 0),
    calculationInputTotalCount: Number(evidenceResult.rows[0]?.calculation_input_total_count ?? 0),
    integrityDecisionEvidenceCount: Number(evidenceResult.rows[0]?.integrity_decision_evidence_count ?? 0),
    openCriticalErrorCount: Number(criticalErrorResult.rows[0]?.count ?? 0),
    blockingReviewGateCount: Number(blockingGateResult.rows[0]?.count ?? 0)
  };
}

function buildReportGateChecklist(context: ReportGateContext, issueCommentPresent: boolean): ReportGate[] {
  const report = context.report;
  const calculation = context.calculation;
  const decision = context.integrityDecision;
  const approvedDecision = context.approvedIntegrityDecision;
  const warnings = jsonArray(report.validation_warnings_json).map((warning) => summarize(warning).toLowerCase());
  const criticalWarning = warnings.some((warning) => warning.includes('critical') || warning.includes('blocked') || warning.includes('missing evidence'));
  const calculationStatus = [calculation?.run_status, calculation?.status, calculation?.final_use_status].map((value) => asString(value));
  const calculationReviewStatus = asString(calculation?.review_status);
  const calculationApprovalStatus = asString(calculation?.approval_status);

  const calculationInputEvidenceComplete = context.calculationInputTotalCount === 0 || context.calculationInputEvidenceCount >= context.calculationInputTotalCount;

  return [
    gate('required_data_complete', Boolean(report.content_hash && report.sections_json && report.traceability_json), 'Report content, sections, traceability, and content hash must exist.'),
    gate('evidence_linked', context.reportEvidenceCount > 0 && context.calculationRunEvidenceCount > 0 && calculationInputEvidenceComplete && context.integrityDecisionEvidenceCount > 0, 'Report, calculation run, calculation inputs where present, and approved integrity decision must each have verified tenant-scoped evidence.', {
      evidence_count: context.evidenceCount,
      report_evidence_count: context.reportEvidenceCount,
      calculation_run_evidence_count: context.calculationRunEvidenceCount,
      calculation_input_evidence_count: context.calculationInputEvidenceCount,
      calculation_input_total_count: context.calculationInputTotalCount,
      calculation_input_evidence_complete: calculationInputEvidenceComplete,
      calculation_input_direct_evidence_file_id_counts_as_equivalent: true,
      integrity_decision_evidence_count: context.integrityDecisionEvidenceCount,
      missing_required_evidence: [
        context.reportEvidenceCount > 0 ? null : 'report',
        context.calculationRunEvidenceCount > 0 ? null : 'calculation_run',
        calculationInputEvidenceComplete ? null : 'calculation_input',
        context.integrityDecisionEvidenceCount > 0 ? null : 'integrity_decision'
      ].filter(Boolean)
    }),
    gate('calculation_completed', Boolean(calculation && calculationStatus.some((status) => ['completed','ready_for_review','reviewed','submitted_for_approval','approved','locked','requires_engineering_review'].includes(status ?? ''))), 'Calculation run must exist and be completed or controlled for review.'),
    gate('calculation_reviewed', Boolean(calculation && ['reviewed','approved','locked'].includes(calculationReviewStatus ?? '')), 'Calculation must be reviewed before report issue.', { review_status: calculationReviewStatus }),
    gate('calculation_approved', Boolean(calculation && ['approved','locked'].includes(calculationApprovalStatus ?? '')), 'Calculation must be approved before report issue.', { approval_status: calculationApprovalStatus }),
    gate('integrity_decision_created', Boolean(decision), 'Integrity decision must exist before report issue.'),
    gate('integrity_decision_approved', Boolean(approvedDecision), 'Integrity decision must be approved before report issue.', { decision_status: approvedDecision?.decision_status ?? decision?.decision_status ?? null }),
    gate('report_approved', report.report_status === 'approved', 'Report must be approved before issue.', { report_status: report.report_status }),
    gate('unresolved_critical_warnings_absent', !criticalWarning && context.blockingReviewGateCount === 0, 'No unresolved critical warnings or blocking review gates may remain.', { blocking_review_gate_count: context.blockingReviewGateCount }),
    gate('workflow_errors_resolved', context.openCriticalErrorCount === 0, 'Open high/critical workflow or module errors must be resolved.', { open_critical_error_count: context.openCriticalErrorCount }),
    gate('approver_comment_present', issueCommentPresent, 'Issuer comment is required for audit trail. Error code: REPORT_ISSUE_COMMENT_REQUIRED.')
  ];
}

async function persistReportGateChecklist(client: PoolClient, req: Request, reportId: string, gates: ReportGate[]): Promise<void> {
  for (const item of gates) {
    await client.query(
      `insert into review_gates(
        entity_type,
        entity_id,
        gate_domain,
        gate_type,
        gate_status,
        blocking,
        evidence_link_required,
        checked_by,
        checked_at,
        metadata_json,
        updated_at
      ) values ('report', $1, 'report_issue', $2, $3, $4, $5, $6, now(), $7::jsonb, now())
      on conflict (entity_type, entity_id, gate_domain, gate_type) do update set
        gate_status = excluded.gate_status,
        blocking = excluded.blocking,
        evidence_link_required = excluded.evidence_link_required,
        checked_by = excluded.checked_by,
        checked_at = excluded.checked_at,
        metadata_json = excluded.metadata_json,
        updated_at = now()`,
      [
        reportId,
        item.gate_type,
        item.gate_status,
        item.blocking,
        item.gate_type === 'evidence_linked',
        actorUserId(req),
        JSON.stringify({ message: item.message, ...(item.metadata ?? {}) })
      ]
    );
  }
}

async function writeReportIssueBlockedError(client: PoolClient, req: Request, reportId: string, failedGates: ReportGate[]): Promise<string | undefined> {
  const tenant = requireTenantContextFromRequest(req);
  const result = await client.query<{ id: string }>(
    `insert into error_logs(
      tenant_id,
      error_code,
      error_message,
      severity,
      source_module,
      source_system,
      related_entity_type,
      related_entity_id,
      request_id,
      payload_json,
      status,
      created_by
    ) values ($1, $2, $3, $4, $5, $6, $7, $8::uuid, $9, $10::jsonb, $11, $12)
    returning id`,
    [
      tenant.tenantId,
      'REPORT_ISSUE_GATE_BLOCKED',
      'Report issue was blocked by required governance gates.',
      'high',
      'report_issue_gate',
      'aim',
      'report',
      reportId,
      req.header('x-request-id') ?? null,
      JSON.stringify({ failed_gates: failedGates }),
      'open',
      actorUserId(req)
    ]
  );
  return result.rows[0]?.id;
}

reportsRouter.get('/reports', requirePermission('report.read'), async (req, res, next) => {
  try {
    const tenant = requireTenantContextFromRequest(req);
    const result = await pool.query<DbRow>('select * from reports where tenant_id = $1::uuid order by created_at desc limit 100', [tenant.tenantId]);
    res.json({ data: result.rows.map(mapReport) });
  } catch (error) {
    next(error);
  }
});

reportsRouter.get('/reports/:reportId', requirePermission('report.read'), async (req, res, next) => {
  const reportId = req.params.reportId;
  if (!reportId) {
    res.status(400).json({ error: { code: 'MISSING_ROUTE_PARAM', message: 'reportId is required.' } });
    return;
  }
  try {
    const tenant = requireTenantContextFromRequest(req);
    const result = await pool.query<DbRow>('select * from reports where id = $1 and tenant_id = $2::uuid', [reportId, tenant.tenantId]);
    const row = result.rows[0];
    if (!row) {
      res.status(404).json({ error: { code: 'REPORT_NOT_FOUND', message: 'Report not found.' } });
      return;
    }
    res.json({ data: { ...mapReport(row), sections: row.sections_json, evidence_register: row.evidence_register_json } });
  } catch (error) {
    next(error);
  }
});

reportsRouter.get('/reports/:reportId/issue-readiness', requirePermission('report.read'), async (req, res, next) => {
  const reportId = req.params.reportId;
  if (!isUuid(reportId)) {
    validationError(res, 'reportId', 'reportId must be a UUID.');
    return;
  }
  const client = await pool.connect();
  try {
    const tenant = requireTenantContextFromRequest(req);
    const reportResult = await client.query<DbRow>('select * from reports where id = $1 and tenant_id = $2::uuid', [reportId, tenant.tenantId]);
    const report = reportResult.rows[0];
    if (!report) {
      res.status(404).json({ error: { code: 'REPORT_NOT_FOUND', message: 'Report not found.' } });
      return;
    }
    const context = await loadReportGateContext(client, report, tenant.tenantId);
    const gates = buildReportGateChecklist(context, false);
    const blockingGates = gates.filter((item) => item.blocking && item.gate_status !== 'pass');
    const blockingGatesExcludingIssueComment = blockingGates.filter((item) => item.gate_type !== 'approver_comment_present');
    res.json({
      data: {
        report: mapReport(report),
        ready_to_issue: blockingGates.length === 0,
        ready_to_issue_after_comment: blockingGatesExcludingIssueComment.length === 0,
        blocking_gate_count: blockingGates.length,
        blocking_gate_count_excluding_issue_comment: blockingGatesExcludingIssueComment.length,
        issue_comment_required: true,
        gates,
        blocking_gates: blockingGates,
        evidence_counts: {
          total: context.evidenceCount,
          report: context.reportEvidenceCount,
          calculation_run: context.calculationRunEvidenceCount,
          calculation_input: context.calculationInputEvidenceCount,
          integrity_decision: context.integrityDecisionEvidenceCount
        },
        linked_context: {
          calculation_run_id: asString(context.calculation?.id) ?? null,
          integrity_decision_id: asString(context.integrityDecision?.id) ?? null,
          approved_integrity_decision_id: asString(context.approvedIntegrityDecision?.id) ?? null
        }
      }
    });
  } catch (error) {
    next(error);
  } finally {
    client.release();
  }
});

reportsRouter.get('/reports/:reportId/exports', requirePermission('report.read'), async (req, res, next) => {
  const reportId = req.params.reportId;
  if (!isUuid(reportId)) {
    validationError(res, 'reportId', 'reportId must be a UUID.');
    return;
  }
  try {
    const tenant = requireTenantContextFromRequest(req);
    const reportResult = await pool.query<DbRow>('select id from reports where id = $1 and tenant_id = $2::uuid', [reportId, tenant.tenantId]);
    if (!reportResult.rows[0]) {
      res.status(404).json({ error: { code: 'REPORT_NOT_FOUND', message: 'Report not found.' } });
      return;
    }
    const result = await pool.query<DbRow>(
      'select * from report_exports where report_id = $1 and tenant_id = $2::uuid order by created_at desc',
      [reportId, tenant.tenantId]
    );
    res.json({ data: result.rows.map(mapReportExport) });
  } catch (error) {
    next(error);
  }
});

reportsRouter.post('/reports/:reportId/exports', requirePermission('report.export'), async (req, res, next) => {
  const reportId = req.params.reportId;
  if (!isUuid(reportId)) {
    validationError(res, 'reportId', 'reportId must be a UUID.');
    return;
  }
  if (!isPlainObject(req.body)) {
    validationError(res, 'body', 'JSON object body is required.');
    return;
  }
  if (isNonHumanReportActor(req)) {
    res.status(403).json({ error: { code: 'HUMAN_REPORT_EXPORT_REQUIRED', message: 'Report export requires an authorized human user. AI/n8n/service actors cannot create final report artifacts.' } });
    return;
  }
  const exportType = normalizeExportType(req.body.export_type ?? req.body.export_format);
  if (!exportType) {
    validationError(res, 'export_type', 'export_type must be one of: pdf, docx, json, html.');
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('begin');
    const tenant = requireTenantContextFromRequest(req);
    const reportResult = await client.query<DbRow>('select * from reports where id = $1 and tenant_id = $2::uuid for update', [reportId, tenant.tenantId]);
    const report = reportResult.rows[0];
    if (!report) {
      await client.query('rollback');
      res.status(404).json({ error: { code: 'REPORT_NOT_FOUND', message: 'Report not found.' } });
      return;
    }

    if ((exportType === 'pdf' || exportType === 'docx') && report.report_status !== 'issued') {
      const gateContext = await loadReportGateContext(client, report, tenant.tenantId);
      const gates = buildReportGateChecklist(gateContext, hasRequiredReportComment(req));
      await persistReportGateChecklist(client, req, reportId, gates);
      await client.query('commit');
      res.status(409).json({
        error: {
          code: 'REPORT_EXPORT_GATES_NOT_SATISFIED',
          message: 'Final PDF/DOCX report export is blocked until the report is issued after required governance gates pass.',
          gates: gates.filter((gateItem) => gateItem.blocking && gateItem.gate_status !== 'pass')
        }
      });
      return;
    }

    const artifactBuffer = bufferForReportExport(report, exportType);
    if (!artifactBuffer) {
      await client.query('rollback');
      res.status(409).json({ error: { code: 'REPORT_ARTIFACT_CONTENT_MISSING', message: `Report does not contain generated ${exportType.toUpperCase()} content for object-storage export.` } });
      return;
    }
    if (artifactBuffer.length > config.objectStorage.reportExportMaxFileSizeBytes) {
      await client.query('rollback');
      res.status(413).json({ error: { code: 'REPORT_EXPORT_TOO_LARGE', message: 'Report export artifact exceeds the configured object-storage size limit.' } });
      return;
    }

    const exportIdResult = await client.query<{ id: string }>('select gen_random_uuid()::text as id');
    const exportId = exportIdResult.rows[0]?.id;
    if (!exportId) throw new Error('Unable to allocate report export id.');
    const filename = filenameForReportExport(report, exportId, exportType);
    const objectKey = buildReportExportObjectKey({ reportId, exportId, filename, tenant });
    const mimeType = reportExportMimeType(exportType);
    const contentHashSha256 = sha256Hex(artifactBuffer);

    await objectStorageService.putObject({
      objectKey,
      body: artifactBuffer,
      contentType: mimeType,
      metadata: {
        report_id: reportId,
        export_id: exportId,
        content_hash_sha256: contentHashSha256
      }
    });

    const exportResult = await client.query<DbRow>(
      `insert into report_exports(
        tenant_id,
        id,
        report_id,
        export_format,
        export_status,
        storage_provider,
        storage_bucket,
        object_storage_uri,
        object_key,
        content_hash_sha256,
        checksum_sha256,
        input_snapshot_hash,
        generated_by,
        generated_at,
        exported_by,
        exported_at,
        download_status,
        file_size_bytes,
        mime_type,
        metadata_json
      ) values ($1, $2, $3, $4, 'generated', 's3-compatible', $5, $6, $6, $7, $7, $8, $9, now(), $9, now(), 'not_downloaded', $10, $11, $12::jsonb)
      returning *`,
      [
        tenant.tenantId,
        exportId,
        reportId,
        exportType,
        config.objectStorage.bucket,
        objectKey,
        contentHashSha256,
        asString(report.input_snapshot_hash) ?? null,
        actorUserId(req),
        artifactBuffer.length,
        mimeType,
        JSON.stringify({ object_storage_artifact: true, normal_api_base64_response: false, ...tenantScopeMetadata(tenant) })
      ]
    );
    const created = exportResult.rows[0];
    const signed = await objectStorageService.getSignedDownloadUrl({
      objectKey,
      responseContentType: mimeType,
      expiresInSeconds: config.objectStorage.reportExportSignedUrlTtlSeconds
    });
    const auditLogId = await writeAudit(client, req, 'REPORT_EXPORT_CREATED', 'report_export', exportId, null, mapReportExport(created ?? {}), {
      report_id: reportId,
      object_key: objectKey,
      storage_bucket: config.objectStorage.bucket,
      content_hash_sha256: contentHashSha256,
      signed_url_redacted: redactSignedUrl(signed.url),
      signed_url_query_not_logged: true,
      ai_cannot_export_final_report: true
    });
    await client.query('commit');
    res.status(201).json({
      data: {
        ...mapReportExport(created ?? {}),
        download_url: signed.url,
        expires_at: signed.expiresAt
      },
      auditLogId
    });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});

reportsRouter.get('/report-exports/:exportId/download-url', requirePermission('report.export'), async (req, res, next) => {
  const exportId = req.params.exportId;
  if (!isUuid(exportId)) {
    validationError(res, 'exportId', 'exportId must be a UUID.');
    return;
  }
  const client = await pool.connect();
  try {
    await client.query('begin');
    const tenant = requireTenantContextFromRequest(req);
    const exportResult = await client.query<DbRow>('select * from report_exports where id = $1 and tenant_id = $2 for update', [exportId, tenant.tenantId]);
    const reportExport = exportResult.rows[0];
    if (!reportExport) {
      await client.query('rollback');
      res.status(404).json({ error: { code: 'REPORT_EXPORT_NOT_FOUND', message: 'Report export not found.' } });
      return;
    }
    const objectKey = asString(reportExport.object_key ?? reportExport.object_storage_uri);
    if (!objectKey) {
      await client.query('rollback');
      res.status(409).json({ error: { code: 'REPORT_EXPORT_OBJECT_KEY_MISSING', message: 'Report export object key is missing.' } });
      return;
    }
    try {
      assertTenantObjectKeyBoundary(objectKey, tenant);
    } catch {
      await client.query('rollback');
      res.status(403).json({ error: { code: 'TENANT_OBJECT_KEY_BOUNDARY_VIOLATION', message: 'Report export object key is outside the selected tenant boundary.' } });
      return;
    }
    const exists = await objectStorageService.objectExists(objectKey);
    if (!exists) {
      await client.query('rollback');
      res.status(409).json({ error: { code: 'REPORT_EXPORT_OBJECT_NOT_FOUND', message: 'Report export metadata exists but the object-storage artifact was not found.' } });
      return;
    }
    const signed = await objectStorageService.getSignedDownloadUrl({
      objectKey,
      responseContentType: asString(reportExport.mime_type),
      expiresInSeconds: config.objectStorage.reportExportSignedUrlTtlSeconds
    });
    await client.query('update report_exports set download_status = $2, downloaded_at = now() where id = $1 and tenant_id = $3', [exportId, 'signed_url_issued', tenant.tenantId]);
    const auditLogId = await writeAudit(client, req, 'REPORT_EXPORT_DOWNLOAD_URL_CREATED', 'report_export', exportId, null, { export_id: exportId, object_key: objectKey, expires_at: signed.expiresAt }, {
      signed_url_redacted: redactSignedUrl(signed.url),
      signed_url_query_not_logged: true,
      storage_bucket: signed.bucket
    });
    await client.query('commit');
    res.json({
      data: {
        report_export_id: exportId,
        object_key: objectKey,
        download_url: signed.url,
        expires_at: signed.expiresAt
      },
      auditLogId
    });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});

reportsRouter.post('/reports/generate', requirePermission('report.generate'), async (req, res, next) => {
  if (!isPlainObject(req.body)) {
    validationError(res, 'body', 'JSON object body is required.');
    return;
  }

  const calculationRunId = asString(req.body.calculation_run_id ?? req.body.calculationRunId);
  if (!isUuid(calculationRunId)) {
    validationError(res, 'calculation_run_id', 'calculation_run_id must be a valid UUID.');
    return;
  }

  const requestedFormats = Array.isArray(req.body.output_formats)
    ? req.body.output_formats.map((value) => asString(value)).filter((value): value is string => Boolean(value))
    : ['docx', 'pdf'];
  const formats = new Set(requestedFormats.map((value) => value.toLowerCase()));
  const includeDocx = formats.has('docx');
  const includePdf = formats.has('pdf');

  if (!includeDocx && !includePdf) {
    validationError(res, 'output_formats', 'At least one output format must be docx or pdf.');
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('begin');
    const tenant = requireTenantContextFromRequest(req);
    const context = await loadReportContext(client, calculationRunId, tenant.tenantId);
    if (!isReportableCalculation(context.run)) {
      await client.query('rollback');
      res.status(409).json({
        error: {
          code: 'CALCULATION_NOT_REPORT_READY',
          message: 'Report can only be generated from a locked, approved, reviewed, or review-ready calculation run.'
        }
      });
      return;
    }

    const templateResult = await client.query<DbRow>(
      `select * from report_templates where template_code = $1 and status = 'active' order by created_at desc limit 1`,
      ['TANK-INTEGRITY-CONSULTANT-REPORT']
    );
    const template = templateResult.rows[0];
    if (!template) {
      await client.query('rollback');
      res.status(500).json({ error: { code: 'REPORT_TEMPLATE_NOT_FOUND', message: 'Default report template is not available.' } });
      return;
    }

    const reportVersionResult = await client.query<{ next_version: string }>(
      `select (coalesce(max(report_version), 0) + 1)::text as next_version from reports where calculation_run_id = $1 and tenant_id = $2::uuid`,
      [calculationRunId, tenant.tenantId]
    );
    const reportVersion = Number(reportVersionResult.rows[0]?.next_version ?? '1');
    const title = asString(req.body.report_title ?? req.body.title) ?? `Tank Integrity Report - ${context.asset?.asset_tag ?? context.run.run_id ?? calculationRunId}`;
    const reportDocument = buildReportDocument(context, title, 'draft');
    const sectionsJson = reportDocument.sections;
    const evidenceRegister = context.evidence.map((row) => ({
      evidence_id: row.id,
      evidence_code: row.evidence_code,
      file_name: row.file_name ?? row.original_filename,
      method: row.method,
      component: row.component,
      date: row.inspection_date,
      page_or_sheet_ref: row.page_or_sheet_ref ?? row.page_figure_table_reference,
      link_path: row.object_storage_path ?? row.object_storage_uri,
      linked_measurement_or_result: row.linked_measurement_or_result ?? row.linked_entity_id
    }));
    const plainText = renderConsultantReportText(reportDocument);
    const docxContent = includeDocx ? renderDocxBase64(reportDocument) : null;
    const pdfContent = includePdf ? renderPdfBase64(reportDocument) : null;
    const reportCode = `RPT-${safeCodePart(context.run.run_id ?? calculationRunId)}-V${reportVersion}`;
    const basePath = `/reports/${context.asset?.asset_tag ?? context.run.asset_id}/${reportCode}/v${reportVersion}`;
    const traceability = reportDocument.traceability;
    const contentHashValue = contentHash({ traceability, sectionsJson, evidenceRegister, reportVersion });

    const result = await client.query<DbRow>(
      `insert into reports(
        tenant_id,
        report_code,
        report_title,
        report_type,
        report_status,
        report_version,
        asset_id,
        calculation_run_id,
        template_id,
        template_code,
        format_requested,
        docx_object_path,
        pdf_object_path,
        docx_content_base64,
        pdf_content_base64,
        plain_text_content,
        input_snapshot_hash,
        content_hash,
        traceability_json,
        sections_json,
        evidence_register_json,
        validation_warnings_json,
        limitations_json,
        generated_by,
        generated_at
      ) values (
        $1, $2, $3, 'tank_integrity', 'draft', $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12, $13, $14,
        $15, $16, $17::jsonb, $18::jsonb, $19::jsonb, $20::jsonb, $21::jsonb, $22, now()
      ) returning *`,
      [
        tenant.tenantId,
        reportCode,
        title,
        reportVersion,
        context.run.asset_id,
        calculationRunId,
        template.id,
        template.template_code,
        JSON.stringify(Array.from(formats)),
        includeDocx ? `${basePath}/report.docx` : null,
        includePdf ? `${basePath}/report.pdf` : null,
        docxContent,
        pdfContent,
        plainText,
        context.run.input_snapshot_hash ?? null,
        contentHashValue,
        JSON.stringify(traceability),
        JSON.stringify(sectionsJson),
        JSON.stringify(evidenceRegister),
        JSON.stringify(jsonArray(context.run.warnings_json)),
        JSON.stringify(reportDocument.sections.find((section) => section.title === 'Validation Warnings and Limitations')?.body ?? []),
        actorUserId(req)
      ]
    );
    const created = result.rows[0];
    const auditLogId = await writeAudit(client, req, 'REPORT_GENERATED', 'report', asString(created?.id) ?? null, null, mapReport(created ?? {}), {
      calculation_run_id: calculationRunId,
      template_code: template.template_code,
      draft_until_approved: true,
      no_api_formula_text_embedded: true
    });
    await client.query('commit');
    res.status(201).json({ data: { ...mapReport(created ?? {}), outputs: { docx_base64: docxContent, pdf_base64: pdfContent } }, auditLogId });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});

reportsRouter.post('/reports/:reportId/approve', requirePermission('report.approve'), async (req, res, next) => {
  if (!isPlainObject(req.body)) {
    validationError(res, 'body', 'JSON object body is required.');
    return;
  }
  if (!hasRequiredReportComment(req)) {
    validationError(res, 'approval_comment', 'Report approval requires approval_comment or comment for audit trail.', 'REPORT_APPROVAL_COMMENT_REQUIRED');
    return;
  }
  const reportId = req.params.reportId;
  if (!reportId) {
    res.status(400).json({ error: { code: 'MISSING_ROUTE_PARAM', message: 'reportId is required.' } });
    return;
  }
  if (!isSeniorReportActor(req) || isAiAgent(req)) {
    res.status(403).json({ error: { code: 'SENIOR_ENGINEER_REPORT_APPROVAL_REQUIRED', message: 'Report approval requires senior_engineer or admin. AI agents cannot approve reports.' } });
    return;
  }
  const client = await pool.connect();
  try {
    await client.query('begin');
    const tenant = requireTenantContextFromRequest(req);
    const beforeResult = await client.query<DbRow>('select * from reports where id = $1 and tenant_id = $2::uuid for update', [reportId, tenant.tenantId]);
    const before = beforeResult.rows[0];
    if (!before) {
      await client.query('rollback');
      res.status(404).json({ error: { code: 'REPORT_NOT_FOUND', message: 'Report not found.' } });
      return;
    }
    if (before.locked_flag === true || before.report_status === 'issued') {
      await client.query('rollback');
      res.status(409).json({ error: { code: 'LOCKED_REPORT_IMMUTABLE', message: 'Issued reports are immutable. Create a new report version.' } });
      return;
    }
    if (isReportSelfApprovalAttempt(req, before)) {
      await client.query('rollback');
      res.status(409).json({ error: { code: 'SEGREGATION_OF_DUTY_BLOCKED', message: 'The user who generated a report cannot approve the same report.' } });
      return;
    }
    const result = await client.query<DbRow>(
      `update reports set report_status = 'approved', approved_by = $2, approved_at = now(), updated_at = now() where id = $1 and tenant_id = $3::uuid returning *`,
      [reportId, actorUserId(req), tenant.tenantId]
    );
    const updated = result.rows[0];
    const auditLogId = await writeAudit(client, req, 'REPORT_APPROVED', 'report', reportId, mapReport(before), mapReport(updated ?? {}), {
      approval_comment: asString(req.body.approval_comment ?? req.body.comment),
      segregation_of_duty_checked: true
    });
    await client.query('commit');
    res.json({ data: mapReport(updated ?? {}), auditLogId });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});

reportsRouter.post('/reports/:reportId/issue', requirePermission('report.issue'), async (req, res, next) => {
  if (!isPlainObject(req.body)) {
    validationError(res, 'body', 'JSON object body is required.');
    return;
  }
  const reportId = req.params.reportId;
  if (!reportId) {
    res.status(400).json({ error: { code: 'MISSING_ROUTE_PARAM', message: 'reportId is required.' } });
    return;
  }
  if (!isSeniorReportActor(req) || isNonHumanReportActor(req)) {
    res.status(403).json({ error: { code: 'HUMAN_APPROVER_REPORT_ISSUE_REQUIRED', message: 'Report issue requires an authorized human approver. AI agents and n8n/service users cannot issue reports.' } });
    return;
  }
  const client = await pool.connect();
  try {
    await client.query('begin');
    const tenant = requireTenantContextFromRequest(req);
    const beforeResult = await client.query<DbRow>('select * from reports where id = $1 and tenant_id = $2::uuid for update', [reportId, tenant.tenantId]);
    const before = beforeResult.rows[0];
    if (!before) {
      await client.query('rollback');
      res.status(404).json({ error: { code: 'REPORT_NOT_FOUND', message: 'Report not found.' } });
      return;
    }
    if (isReportSelfApprovalAttempt(req, before)) {
      await client.query('rollback');
      res.status(409).json({ error: { code: 'SEGREGATION_OF_DUTY_BLOCKED', message: 'The user who generated a report cannot issue the same report as sole issuer.' } });
      return;
    }

    const gateContext = await loadReportGateContext(client, before, tenant.tenantId);
    const reportGates = buildReportGateChecklist(gateContext, hasRequiredReportComment(req));
    await persistReportGateChecklist(client, req, reportId, reportGates);
    const failedGates = reportGates.filter((item) => item.blocking && item.gate_status !== 'pass');

    if (failedGates.length > 0) {
      const errorLogId = await writeReportIssueBlockedError(client, req, reportId, failedGates);
      const auditLogId = await writeAudit(client, req, 'REPORT_ISSUE_BLOCKED', 'report', reportId, mapReport(before), mapReport(before), {
        reason: 'required_report_issue_gates_not_satisfied',
        failed_gates: failedGates,
        error_log_id: errorLogId,
        human_approver_required: true,
        n8n_cannot_issue_report: true,
        ai_cannot_issue_report: true
      });
      await client.query('commit');
      res.status(409).json({
        error: {
          code: 'REPORT_GATES_NOT_SATISFIED',
          message: 'Report issue is blocked until required data, evidence, calculation, review, integrity decision, report approval, workflow-error, and approver-comment gates pass.',
          auditLogId,
          errorLogId,
          gates: failedGates
        }
      });
      return;
    }
    const result = await client.query<DbRow>(
      `update reports set report_status = 'issued', locked_flag = true, issued_by = $2, issued_at = now(), updated_at = now() where id = $1 and tenant_id = $3::uuid returning *`,
      [reportId, actorUserId(req), tenant.tenantId]
    );
    const updated = result.rows[0];
    const resolvedGateErrors = await client.query<{ id: string }>(
      `update error_logs
       set status = 'resolved',
           resolved_at = now(),
           payload_json = coalesce(payload_json, '{}'::jsonb) || jsonb_build_object(
             'resolved_by_report_issue', true,
             'resolved_report_id', $1::text,
             'resolved_at', now()
           )
       where error_code = 'REPORT_ISSUE_GATE_BLOCKED'
         and tenant_id = $2::uuid
         and related_entity_type = 'report'
         and related_entity_id = $1::uuid
         and status not in ('resolved','closed')
       returning id`,
      [reportId, tenant.tenantId]
    );
    const auditLogId = await writeAudit(client, req, 'REPORT_ISSUED', 'report', reportId, mapReport(before), mapReport(updated ?? {}), {
      issue_comment: asString(req.body.issue_comment ?? req.body.comment),
      report_gate_check: true,
      gate_checklist: reportGates,
      resolved_report_issue_gate_blocked_error_ids: resolvedGateErrors.rows.map((row) => row.id),
      human_approver_required: true,
      internal_work_order_fallback_only: true
    });
    await client.query('commit');
    res.json({ data: mapReport(updated ?? {}), auditLogId });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});

