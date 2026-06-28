import { Router, type Request, type Response } from 'express';
import type { PoolClient } from 'pg';
import { pool } from '../db/client.js';
import { requirePermission } from '../middleware/rbac.js';
import { asString, validateEngineeringContext, type ValidationContext } from '../modules/engineering-validation/validation-engine.js';

export const engineeringValidationRouter = Router();

type DbRow = Record<string, unknown>;
type ApiResponse = Response<Record<string, unknown>>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function actorUserId(req: Request): string | null {
  const id = req.user?.id;
  if (!id || id === '00000000-0000-0000-0000-000000000000') return null;
  return id;
}

function actorRoles(req: Request): string[] {
  return req.user?.roles ?? [];
}

function validationError(res: ApiResponse, field: string, message: string): void {
  res.status(400).json({
    error: {
      code: 'VALIDATION_FAILED',
      message: 'Request validation failed.',
      details: [{ field, message, severity: 'error' }]
    }
  });
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
  const result = await client.query<{ id: string }>(
    `insert into audit_logs(
      event_type,
      actor_user_id,
      actor_role_codes,
      entity_type,
      entity_id,
      request_id,
      before_json,
      after_json,
      metadata_json
    ) values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb)
    returning id`,
    [
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

function mapDictionaryRow(row: DbRow): Record<string, unknown> {
  return {
    field_id: row.id,
    group_name: row.group_name,
    field_name: row.field_name,
    label: row.label,
    unit: row.unit,
    data_type: row.data_type,
    allowed_range: row.allowed_range_json,
    required_status: row.required_status,
    source_preference: row.source_preference,
    validation_severity: row.validation_severity,
    engineering_note: row.engineering_note,
    is_active: row.is_active
  };
}


function asPositiveInteger(value: unknown, fallback: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

function asUuid(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : undefined;
}

function issueGroup(value: unknown): string | null {
  if (!isPlainObject(value)) return null;
  const group = value.group;
  return typeof group === 'string' && group.length > 0 ? group : null;
}

function validationStatusFromCounts(row: DbRow): string {
  const blocking = Number(row.blocking_count ?? 0);
  const warning = Number(row.warning_count ?? 0);
  if (blocking > 0) return 'blocked';
  if (warning > 0) return 'warning';
  return 'passed';
}

function mapValidationRunRow(row: DbRow, includeDetail = false): Record<string, unknown> {
  const resultJson = isPlainObject(row.result_json) ? row.result_json : {};
  const requestPayload = isPlainObject(row.request_payload_json) ? row.request_payload_json : {};
  const issues = Array.isArray(resultJson.issues) ? resultJson.issues.filter(isPlainObject) : [];
  const affectedGroups = Array.from(new Set(issues.map(issueGroup).filter((group): group is string => Boolean(group))));
  const mapped: Record<string, unknown> = {
    validation_run_id: row.id,
    run_code: row.run_code,
    validation_scope: row.validation_scope,
    asset_id: row.asset_id,
    status: validationStatusFromCounts(row),
    blocking_count: Number(row.blocking_count ?? 0),
    warning_count: Number(row.warning_count ?? 0),
    info_count: Number(row.info_count ?? 0),
    issue_count: issues.length,
    affected_entity_types: affectedGroups,
    source: requestPayload.source ?? requestPayload.trigger_source ?? 'manual_or_system',
    checked_by: row.run_by,
    triggered_by: row.run_by,
    checked_at: row.created_at,
    created_at: row.created_at,
    latest_message: issues[0]?.message ?? (Number(row.blocking_count ?? 0) > 0 ? 'Blocking validation issues detected.' : 'Validation completed.')
  };
  if (includeDetail) {
    mapped.request_payload = requestPayload;
    mapped.result = resultJson;
    mapped.issues = issues;
    mapped.grouped = isPlainObject(resultJson.grouped) ? resultJson.grouped : {};
  }
  return mapped;
}

function mapAsset(row: DbRow | undefined): Record<string, unknown> | null {
  if (!row) return null;
  return {
    asset_id: row.id,
    tank_tag: row.asset_tag,
    asset_name: row.asset_name,
    facility: row.facility,
    location: row.location ?? row.area,
    service_fluid: row.service_fluid,
    original_design_code: row.original_design_code ?? row.design_code,
    current_assessment_code: row.current_assessment_code,
    code_edition: row.code_edition ?? row.design_code_edition,
    operating_status: row.operating_status
  };
}

async function loadValidationContextFromAsset(client: PoolClient, assetId: string, base: ValidationContext): Promise<ValidationContext> {
  const assetResult = await client.query<DbRow>('select * from assets where id = $1 and deleted_at is null', [assetId]);
  const geometryResult = await client.query<DbRow>('select * from tank_geometry where asset_id = $1', [assetId]);
  const shellResult = await client.query<DbRow>(
    `select sc.*, m.material_code, m.material_name, m.material_specification, m.material_allowable_stress_mpa, m.allowable_stress_basis
     from shell_courses sc
     left join materials m on m.id = sc.material_id
     where sc.asset_id = $1
     order by sc.course_no`,
    [assetId]
  );
  const ndtResult = await client.query<DbRow>('select * from ndt_measurements where asset_id = $1 order by reading_date desc, created_at desc', [assetId]);
  const evidenceLinkResult = await client.query<DbRow>(
    `select el.* from evidence_links el
     join evidence_files ef on ef.id = el.evidence_file_id
     where ef.asset_id = $1`,
    [assetId]
  );

  return {
    ...base,
    asset: base.asset ?? mapAsset(assetResult.rows[0]),
    geometry: base.geometry ?? geometryResult.rows[0] ?? null,
    shell_courses: base.shell_courses ?? shellResult.rows,
    ndt_measurements: base.ndt_measurements ?? ndtResult.rows,
    evidence_links: base.evidence_links ?? evidenceLinkResult.rows
  };
}

engineeringValidationRouter.get('/engineering/data-dictionary', requirePermission('validation.read'), async (_req, res, next) => {
  try {
    const result = await pool.query<DbRow>(
      `select * from engineering_data_dictionary
       where is_active = true
       order by group_name, field_name`
    );
    res.json({ data: result.rows.map(mapDictionaryRow) });
  } catch (error) {
    next(error);
  }
});


engineeringValidationRouter.get('/engineering/validation-history', requirePermission('validation.read'), async (req, res, next) => {
  try {
    const assetId = asUuid(req.query.asset_id);
    const limit = asPositiveInteger(req.query.limit, 50, 200);
    const values: unknown[] = [];
    let where = '';
    if (assetId) {
      values.push(assetId);
      where = `where asset_id = $${values.length}`;
    }
    values.push(limit);
    const result = await pool.query<DbRow>(
      `select * from validation_runs
       ${where}
       order by created_at desc
       limit $${values.length}`,
      values
    );

    let runs = result.rows.map((row) => mapValidationRunRow(row));
    const status = asString(req.query.status);
    const severity = asString(req.query.severity);
    const entityType = asString(req.query.entity_type);
    if (status) runs = runs.filter((run) => run.status === status);
    if (severity) runs = runs.filter((run) => run.status === severity || (Array.isArray(run.affected_entity_types) && run.affected_entity_types.includes(severity)));
    if (entityType) runs = runs.filter((run) => Array.isArray(run.affected_entity_types) && run.affected_entity_types.includes(entityType));

    res.json({ data: runs });
  } catch (error) {
    next(error);
  }
});

engineeringValidationRouter.get('/engineering/validation-history/:validationRunId', requirePermission('validation.read'), async (req, res, next) => {
  try {
    const validationRunId = asUuid(req.params.validationRunId);
    if (!validationRunId) {
      validationError(res, 'validationRunId', 'validationRunId must be a UUID.');
      return;
    }
    const result = await pool.query<DbRow>('select * from validation_runs where id = $1', [validationRunId]);
    const row = result.rows[0];
    if (!row) {
      res.status(404).json({ error: { code: 'VALIDATION_RUN_NOT_FOUND', message: 'Validation run was not found.' } });
      return;
    }
    res.json({ data: mapValidationRunRow(row, true) });
  } catch (error) {
    next(error);
  }
});

engineeringValidationRouter.get('/assets/:assetId/validation', requirePermission('validation.read'), async (req, res, next) => {
  try {
    const assetId = asUuid(req.params.assetId);
    if (!assetId) {
      validationError(res, 'assetId', 'assetId must be a UUID.');
      return;
    }
    const assetResult = await pool.query<DbRow>('select * from assets where id = $1 and deleted_at is null', [assetId]);
    const asset = assetResult.rows[0];
    if (!asset) {
      res.status(404).json({ error: { code: 'ASSET_NOT_FOUND', message: 'Asset was not found.' } });
      return;
    }
    const historyResult = await pool.query<DbRow>(
      `select * from validation_runs
       where asset_id = $1
       order by created_at desc
       limit 25`,
      [assetId]
    );
    const history = historyResult.rows.map((row) => mapValidationRunRow(row, true));
    res.json({
      data: {
        asset: mapAsset(asset),
        latest_validation_run: history[0] ?? null,
        history
      }
    });
  } catch (error) {
    next(error);
  }
});

engineeringValidationRouter.post('/engineering/validate-input', requirePermission('validation.run'), async (req, res, next) => {
  if (!isPlainObject(req.body)) {
    validationError(res, 'body', 'JSON object body is required.');
    return;
  }

  const assetId = asString(req.body.asset_id);
  const runCode = asString(req.body.run_code) ?? `VAL-${Date.now()}`;
  let context: ValidationContext = {
    validation_scope: asString(req.body.validation_scope) as ValidationContext['validation_scope'],
    target_action: asString(req.body.target_action),
    asset: isPlainObject(req.body.asset) ? req.body.asset : null,
    geometry: isPlainObject(req.body.geometry) ? req.body.geometry : null,
    shell_courses: Array.isArray(req.body.shell_courses) ? req.body.shell_courses.filter(isPlainObject) : undefined,
    materials: Array.isArray(req.body.materials) ? req.body.materials.filter(isPlainObject) : undefined,
    ndt_measurements: Array.isArray(req.body.ndt_measurements) ? req.body.ndt_measurements.filter(isPlainObject) : undefined,
    evidence_links: Array.isArray(req.body.evidence_links) ? req.body.evidence_links.filter(isPlainObject) : undefined,
    formula_registry: Array.isArray(req.body.formula_registry) ? req.body.formula_registry.filter(isPlainObject) : undefined,
    calculation_request: isPlainObject(req.body.calculation_request) ? req.body.calculation_request : null,
    approval_request: isPlainObject(req.body.approval_request) ? req.body.approval_request : null
  };

  const client = await pool.connect();
  try {
    await client.query('begin');
    if (assetId) {
      context = await loadValidationContextFromAsset(client, assetId, context);
    }

    const validationResult = validateEngineeringContext(context);
    const insertResult = await client.query<{ id: string }>(
      `insert into validation_runs(
        run_code,
        validation_scope,
        asset_id,
        request_payload_json,
        result_json,
        blocking_count,
        warning_count,
        info_count,
        run_by
      ) values ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, $8, $9)
      returning id`,
      [
        runCode,
        context.validation_scope ?? 'general',
        assetId ?? null,
        JSON.stringify(req.body),
        JSON.stringify(validationResult),
        validationResult.blocking_count,
        validationResult.warning_count,
        validationResult.info_count,
        actorUserId(req)
      ]
    );

    const validationRunId = insertResult.rows[0]?.id;
    const auditLogId = await writeAudit(client, req, 'ENGINEERING_VALIDATION_RUN', 'validation_run', validationRunId ?? null, null, validationResult, {
      module: 'engineering_validation',
      validation_scope: context.validation_scope ?? 'general',
      asset_id: assetId ?? null
    });

    await client.query('commit');
    res.status(201).json({
      data: {
        validation_run_id: validationRunId,
        run_code: runCode,
        ...validationResult
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
