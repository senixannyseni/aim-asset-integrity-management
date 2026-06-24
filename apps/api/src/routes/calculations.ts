import { Router, type Request, type Response } from 'express';
import type { PoolClient } from 'pg';
import { pool } from '../db/client.js';
import { requirePermission } from '../middleware/rbac.js';
import { ENGINEERING_REVIEW_DISCLAIMER, asNumber, asString, hashInputSnapshot, runDeterministicCalculation, type DeterministicCalculationRequest, type DeterministicCalculationResult } from '../modules/calculation-engine/deterministic-engine.js';
import type { ValidationContext } from '../modules/engineering-validation/validation-engine.js';

export const calculationsRouter = Router();

type DbRow = Record<string, unknown>;
type ApiResponse = Response<Record<string, unknown>>;

type Queryable = {
  query: <T extends DbRow = DbRow>(text: string, values?: unknown[]) => Promise<{ rows: T[]; rowCount: number | null }>;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUuid(value: string | undefined | null): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function uuidOrNull(value: string | undefined | null): string | null {
  return isUuid(value) ? value : null;
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

function mapFormula(row: DbRow): Record<string, unknown> {
  return {
    record_id: row.id,
    formula_id: row.formula_id ?? row.formula_code,
    formula_name: row.formula_name,
    formula_type: row.formula_type,
    expression_type: row.expression_type,
    formula_expression_source: row.formula_expression_source,
    code_basis: row.code_basis,
    code_edition: row.code_edition ?? row.edition,
    clause_reference: row.clause_reference,
    status: row.status,
    version: row.version,
    locked_flag: row.locked_flag,
    approval_date: row.approval_date
  };
}

function mapFormulaVersion(row: DbRow): Record<string, unknown> {
  return {
    formula_version_id: row.formula_version_id,
    formula_registry_id: row.formula_version_registry_id ?? row.id,
    formula_code: row.formula_version_code ?? row.formula_id ?? row.formula_code,
    formula_name: row.formula_version_name ?? row.formula_name,
    version: row.formula_version_number ?? row.version,
    formula_status: row.formula_version_status,
    deterministic_flag: row.formula_version_deterministic_flag,
    formula_expression_source: row.formula_version_expression_source ?? row.formula_expression_source,
    input_schema: row.formula_version_input_schema,
    output_schema: row.formula_version_output_schema,
    unit_rules: row.formula_version_unit_rules,
    validation_rules: row.formula_version_validation_rules,
    approved_by: row.formula_version_approved_by,
    approved_at: row.formula_version_approved_at
  };
}

function mapRun(row: DbRow): Record<string, unknown> {
  return {
    calculation_run_id: row.id,
    run_id: row.run_id,
    asset_id: row.asset_id,
    inspection_event_id: row.inspection_event_id,
    formula_registry_id: row.formula_registry_id,
    run_version: row.run_version,
    run_status: row.run_status ?? row.status,
    status: row.status,
    formula_set_version: row.formula_set_version,
    formula_version_id: row.formula_version_id,
    formula_version_snapshot: row.formula_version_snapshot_json,
    input_snapshot_hash: row.input_snapshot_hash,
    output_snapshot_hash: row.output_snapshot_hash,
    validation_status: row.validation_status,
    output_summary: row.output_summary,
    output_snapshot: row.output_snapshot_json,
    final_use_status: row.final_use_status,
    final_use_disclaimer: row.final_use_disclaimer,
    final_use_blockers: row.final_use_blockers_json,
    review_status: row.review_status,
    approval_status: row.approval_status,
    locked_flag: row.locked_flag,
    created_at: row.created_at
  };
}

async function loadAssetContext(client: Queryable, assetId: string, base: DeterministicCalculationRequest): Promise<DeterministicCalculationRequest> {
  const assetResult = await client.query<DbRow>('select * from assets where id = $1 and deleted_at is null', [assetId]);
  const asset = assetResult.rows[0];
  if (!asset) {
    const error = new Error('ASSET_NOT_FOUND');
    (error as Error & { statusCode?: number }).statusCode = 404;
    throw error;
  }

  const geometryResult = await client.query<DbRow>('select * from tank_geometry where asset_id = $1', [assetId]);
  const shellResult = await client.query<DbRow>(
    `select sc.*, m.material_code, m.material_name, m.material_specification, m.material_allowable_stress_mpa, m.allowable_stress_basis
     from shell_courses sc
     left join materials m on m.id = sc.material_id
     where sc.asset_id = $1
     order by sc.course_no`,
    [assetId]
  );
  const ndtResult = await client.query<DbRow>(
    `select
       id,
       measurement_code as measurement_id,
       asset_id,
       inspection_event_id,
       component,
       shell_course_no,
       cml_tml_id,
       grid_ref,
       elevation_m,
       orientation,
       measured_thickness_mm,
       reading_date::text,
       method,
       confidence,
       evidence_file_id,
       extraction_source,
       reviewer_status,
       validation_status,
       is_critical
     from ndt_measurements
     where asset_id = $1
     order by component, shell_course_no nulls last, cml_tml_id nulls last, grid_ref nulls last, reading_date`,
    [assetId]
  );
  const evidenceLinkResult = await client.query<DbRow>(
    `select el.* from evidence_links el
     join evidence_files ef on ef.id = el.evidence_file_id
     where ef.asset_id = $1`,
    [assetId]
  );

  return {
    ...base,
    asset: base.asset ?? mapAsset(asset),
    geometry: base.geometry ?? geometryResult.rows[0] ?? null,
    shell_courses: base.shell_courses ?? shellResult.rows,
    ndt_measurements: base.ndt_measurements ?? ndtResult.rows,
    evidence_links: base.evidence_links ?? evidenceLinkResult.rows
  };
}

async function getApprovedFormulaVersion(client: Queryable, formulaId: string, version: string): Promise<DbRow | undefined> {
  const result = await client.query<DbRow>(
    `select
       fr.*,
       fv.id as formula_version_id,
       fv.formula_registry_id as formula_version_registry_id,
       fv.formula_code as formula_version_code,
       fv.formula_name as formula_version_name,
       fv.version as formula_version_number,
       fv.formula_status as formula_version_status,
       fv.deterministic_flag as formula_version_deterministic_flag,
       fv.formula_expression_source as formula_version_expression_source,
       fv.input_schema as formula_version_input_schema,
       fv.output_schema as formula_version_output_schema,
       fv.unit_rules as formula_version_unit_rules,
       fv.validation_rules as formula_version_validation_rules,
       fv.approved_by as formula_version_approved_by,
       fv.approved_at as formula_version_approved_at
     from formula_versions fv
     join formula_registry fr on fr.id = fv.formula_registry_id
     where fv.formula_code = $1
       and fv.version = $2
       and fv.formula_status in ('approved','locked')
       and fv.deterministic_flag = true
       and coalesce(fr.status, 'draft') in ('approved','approved_active','locked')
     order by fv.approved_at desc nulls last, fv.created_at desc
     limit 1`,
    [formulaId, version]
  );
  return result.rows[0];
}

async function nextRunVersion(client: Queryable, assetId: string, formulaRegistryId: string): Promise<number> {
  const result = await client.query<{ next_version: string }>(
    `select coalesce(max(run_version), 0) + 1 as next_version
     from calculation_runs
     where asset_id = $1 and formula_registry_id = $2`,
    [assetId, formulaRegistryId]
  );
  return Number(result.rows[0]?.next_version ?? '1');
}

function flattenInputRows(calculation: DeterministicCalculationResult): Array<{
  name: string;
  rawValue: string;
  normalizedValue: number | null;
  unit: string | null;
  sourceEntityId: string | null;
  evidenceFileId: string | null;
}> {
  const measurements = Array.isArray(calculation.normalized_inputs.ndt_measurements) ? calculation.normalized_inputs.ndt_measurements : [];
  return measurements
    .filter(isPlainObject)
    .map((measurement, index) => ({
      name: `ndt_measurements[${index}].measured_thickness_mm`,
      rawValue: JSON.stringify(measurement),
      normalizedValue: asNumber(measurement.measured_thickness_mm) ?? null,
      unit: 'mm',
      sourceEntityId: uuidOrNull(asString(measurement.source_entity_id)),
      evidenceFileId: uuidOrNull(asString(measurement.evidence_file_id))
    }));
}

function outputRows(calculation: DeterministicCalculationResult): Array<{ name: string; value: number | null; unit: string | null; json: Record<string, unknown>; warningCode?: string; warningMessage?: string }> {
  const corrosionRows = calculation.corrosion_rates.map((rate) => ({
    name: `corrosion_rate.${rate.group_key}`,
    value: rate.corrosion_rate_mm_per_year,
    unit: 'mm/year',
    json: { ...(rate as unknown as Record<string, unknown>), final_use_disclaimer: ENGINEERING_REVIEW_DISCLAIMER }
  }));
  const remainingRows = calculation.remaining_life.map((life) => ({
    name: `remaining_life.${life.group_key}`,
    value: life.remaining_life_years,
    unit: 'years',
    json: { ...(life as unknown as Record<string, unknown>), final_use_disclaimer: ENGINEERING_REVIEW_DISCLAIMER }
  }));
  const warningRows = calculation.warnings.map((warning) => ({
    name: `warning.${warning.code}`,
    value: null,
    unit: null,
    json: { ...(warning as unknown as Record<string, unknown>), final_use_disclaimer: ENGINEERING_REVIEW_DISCLAIMER },
    warningCode: warning.code,
    warningMessage: warning.message
  }));
  return [...corrosionRows, ...remainingRows, ...warningRows];
}

calculationsRouter.get('/engineering/calculations', requirePermission('calculation.read'), async (req, res, next) => {
  try {
    const assetId = asString(req.query.asset_id);
    const values: unknown[] = [];
    const clauses: string[] = [];
    if (assetId) {
      values.push(assetId);
      clauses.push(`asset_id = $${values.length}`);
    }
    const result = await pool.query<DbRow>(
      `select * from calculation_runs
       ${clauses.length > 0 ? `where ${clauses.join(' and ')}` : ''}
       order by created_at desc
       limit 100`,
      values
    );
    res.json({ data: result.rows.map(mapRun) });
  } catch (error) {
    next(error);
  }
});


calculationsRouter.get('/engineering/calculations/:runId', requirePermission('calculation.read'), async (req, res, next) => {
  try {
    const runId = asString(req.params.runId);
    if (!runId) {
      validationError(res, 'runId', 'runId is required.');
      return;
    }
    const runResult = isUuid(runId)
      ? await pool.query<DbRow>(`select * from calculation_runs where id = $1::uuid limit 1`, [runId])
      : await pool.query<DbRow>(`select * from calculation_runs where run_id = $1 limit 1`, [runId]);
    const run = runResult.rows[0];
    if (!run) {
      res.status(404).json({ error: { code: 'CALCULATION_RUN_NOT_FOUND', message: 'Calculation run not found.' } });
      return;
    }
    const calculationRunId = String(run.id);
    const [inputs, outputs, reviews, approvals, auditTrail] = await Promise.all([
      pool.query<DbRow>('select * from calculation_inputs where calculation_run_id = $1 order by input_name', [calculationRunId]),
      pool.query<DbRow>('select * from calculation_outputs where calculation_run_id = $1 order by output_name', [calculationRunId]),
      pool.query<DbRow>('select * from engineering_reviews where calculation_run_id = $1 or (entity_type = $2 and entity_id = $1) order by updated_at desc', [calculationRunId, 'calculation_run']),
      pool.query<DbRow>('select * from approval_records where calculation_run_id = $1 or (entity_type = $2 and entity_id = $1) order by updated_at desc', [calculationRunId, 'calculation_run']),
      pool.query<DbRow>(
        `select * from audit_logs
         where (entity_type = 'calculation_run' and entity_id = $1)
            or (entity_type = 'engineering_review' and entity_id in (select id from engineering_reviews where calculation_run_id = $1 or (entity_type = 'calculation_run' and entity_id = $1)))
            or (entity_type = 'approval_record' and entity_id in (select id from approval_records where calculation_run_id = $1 or (entity_type = 'calculation_run' and entity_id = $1)))
         order by created_at desc`,
        [calculationRunId]
      )
    ]);
    res.json({
      data: {
        ...mapRun(run),
        inputs: inputs.rows,
        outputs: outputs.rows,
        engineering_reviews: reviews.rows,
        approval_records: approvals.rows,
        audit_trail: auditTrail.rows
      }
    });
  } catch (error) {
    next(error);
  }
});

calculationsRouter.post('/engineering/calculate', requirePermission('calculation.run'), async (req, res, next) => {
  if (!isPlainObject(req.body)) {
    validationError(res, 'body', 'JSON object body is required.');
    return;
  }
  const assetId = asString(req.body.asset_id);
  if (!assetId) {
    validationError(res, 'asset_id', 'asset_id is required so the calculation run can be stored and traced.');
    return;
  }

  const formulaId = asString(req.body.formula_id);
  const formulaVersion = asString(req.body.formula_version);
  if (!formulaId) {
    validationError(
      res,
      'formula_id',
      'formula_id is required. Silent/default formula selection is not allowed. Error code: EXPLICIT_FORMULA_VERSION_REQUIRED.'
    );
    return;
  }
  if (!formulaVersion) {
    validationError(
      res,
      'formula_version',
      'formula_version is required. Calculation runs must select an approved formula version explicitly. Error code: EXPLICIT_FORMULA_VERSION_REQUIRED.'
    );
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('begin');
    const formula = await getApprovedFormulaVersion(client, formulaId, formulaVersion);
    if (!formula) {
      await client.query('rollback');
      res.status(400).json({
        error: {
          code: 'APPROVED_FORMULA_VERSION_REQUIRED',
          message: 'Calculation requires an explicit approved or locked formula_versions record. Missing, draft, under_review, retired, rejected, and silent/default formulas cannot be used.'
        }
      });
      return;
    }

    if (formula.formula_type !== 'universal_deterministic') {
      await client.query('rollback');
      res.status(400).json({
        error: {
          code: 'NON_DETERMINISTIC_FORMULA_BLOCKED',
          message: 'The deterministic calculation engine may execute only approved or locked universal_deterministic formulas. API-controlled formulas remain metadata-only and must not be executed by this engine.',
          details: [{
            field: 'formula_id',
            severity: 'blocking',
            requested_formula_type: formula.formula_type,
            required_formula_type: 'universal_deterministic'
          }]
        }
      });
      return;
    }

    const suppliedContext = isPlainObject(req.body.context) ? req.body.context as ValidationContext : req.body as ValidationContext;
    const requestedScope = asString(req.body.calculation_scope) as DeterministicCalculationRequest['calculation_scope'] | undefined;
    const context = await loadAssetContext(client, assetId, {
      ...suppliedContext,
      validation_scope: 'calculation_readiness',
      calculation_scope: requestedScope ?? 'thickness_screening',
      calculation_request: {
        ...(isPlainObject(suppliedContext.calculation_request) ? suppliedContext.calculation_request : {}),
        ...(isPlainObject(req.body.calculation_request) ? req.body.calculation_request : {}),
        thickness_check_requested: true
      },
      thresholds: isPlainObject(req.body.thresholds) ? req.body.thresholds : undefined,
      formula_registry: [mapFormula(formula)]
    });
    const formulaVersionSnapshot = mapFormulaVersion(formula);
    const inputSnapshot = {
      asset_id: assetId,
      formula: mapFormula(formula),
      formula_version: formulaVersionSnapshot,
      context,
      request: req.body
    };
    const inputSnapshotHash = hashInputSnapshot(inputSnapshot);
    const calculationBase = runDeterministicCalculation({ ...context, formula_registry: [mapFormula(formula)] });
    const calculation: DeterministicCalculationResult = { ...calculationBase, input_snapshot_hash: inputSnapshotHash };
    const outputSnapshot = {
      deterministic_engine_version: calculation.deterministic_engine_version,
      output_summary: calculation.output_summary,
      corrosion_rates: calculation.corrosion_rates,
      remaining_life: calculation.remaining_life,
      warnings: calculation.warnings,
      final_use_status: calculation.final_use_status,
      final_use_blockers: calculation.final_use_blockers,
      final_use_disclaimer: calculation.final_use_disclaimer,
      output_snapshot_hash: calculation.output_snapshot_hash
    };
    const validationStatus = calculation.validation_status;
    const runStatus = validationStatus === 'blocked' ? 'blocked' : 'completed';
    const status = validationStatus === 'blocked' ? 'validation_failed' : 'ready_for_review';
    const formulaSetVersion = `${String(formulaVersionSnapshot.formula_code)}@${String(formulaVersionSnapshot.version)}`;
    const runVersion = await nextRunVersion(client, assetId, String(formula.id));
    const runCode = `CALC-${Date.now()}-${runVersion}`;

    const runResult = await client.query<DbRow>(
      `insert into calculation_runs(
        asset_id,
        inspection_event_id,
        formula_registry_id,
        formula_version_id,
        run_version,
        status,
        run_id,
        run_status,
        formula_set_version,
        input_snapshot_hash,
        validation_status,
        output_summary,
        review_status,
        approval_status,
        input_snapshot_json,
        unit_normalized_input_json,
        validation_result_json,
        warnings_json,
        formula_version_snapshot_json,
        output_snapshot_json,
        final_use_status,
        final_use_disclaimer,
        final_use_blockers_json,
        output_snapshot_hash,
        initiated_by,
        created_by,
        locked_flag
      ) values (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10, $11, $12::jsonb, 'not_reviewed', 'not_requested',
        $13::jsonb, $14::jsonb, $15::jsonb, $16::jsonb, $17::jsonb, $18::jsonb,
        $19, $20, $21::jsonb, $22, $23, $23, false
      ) returning *`,
      [
        assetId,
        asString(req.body.inspection_event_id) ?? null,
        formula.id,
        formula.formula_version_id,
        runVersion,
        status,
        runCode,
        runStatus,
        formulaSetVersion,
        inputSnapshotHash,
        validationStatus,
        JSON.stringify(calculation.output_summary),
        JSON.stringify(inputSnapshot),
        JSON.stringify(calculation.normalized_inputs),
        JSON.stringify(calculation.validation_result),
        JSON.stringify(calculation.warnings),
        JSON.stringify(formulaVersionSnapshot),
        JSON.stringify(outputSnapshot),
        calculation.final_use_status,
        ENGINEERING_REVIEW_DISCLAIMER,
        JSON.stringify(calculation.final_use_blockers),
        calculation.output_snapshot_hash,
        actorUserId(req)
      ]
    );
    const run = runResult.rows[0];
    const runId = String(run?.id ?? '');

    for (const row of flattenInputRows(calculation)) {
      await client.query(
        `insert into calculation_inputs(
          calculation_run_id, input_name, raw_value, normalized_value, raw_unit, normalized_unit,
          source_entity_type, source_entity_id, evidence_file_id, validation_status
        ) values ($1, $2, $3, $4, $5, $6, 'ndt_measurement', $7, $8, $9)`,
        [
          runId,
          row.name,
          row.rawValue,
          row.normalizedValue,
          row.unit,
          row.unit,
          row.sourceEntityId,
          row.evidenceFileId,
          validationStatus === 'blocked' ? 'blocked' : 'valid'
        ]
      );
    }

    for (const row of outputRows(calculation)) {
      await client.query(
        `insert into calculation_outputs(
          calculation_run_id, output_name, output_value, output_unit, output_json, warning_code, warning_message
        ) values ($1, $2, $3, $4, $5::jsonb, $6, $7)`,
        [runId, row.name, row.value, row.unit, JSON.stringify(row.json), row.warningCode ?? null, row.warningMessage ?? null]
      );
    }

    const auditLogId = await writeAudit(client, req, 'calculation.run_requested', 'calculation_run', runId, null, {
      run: mapRun(run ?? {}),
      formula_version: formulaVersionSnapshot,
      input_snapshot_hash: inputSnapshotHash
    }, {
      formula_set_version: formulaSetVersion,
      explicit_formula_version_required: true,
      no_silent_formula_default: true,
      deterministic_engine_version: calculation.deterministic_engine_version,
      no_api_formula_hardcoded: true
    });
    await writeAudit(client, req, validationStatus === 'blocked' ? 'calculation.failed' : 'calculation.completed', 'calculation_run', runId, null, {
      run: mapRun(run ?? {}),
      calculation
    }, {
      output_snapshot_hash: calculation.output_snapshot_hash,
      final_use_status: calculation.final_use_status,
      final_use_disclaimer: ENGINEERING_REVIEW_DISCLAIMER
    });
    if (calculation.warnings.length > 0) {
      await writeAudit(client, req, 'calculation.warning_raised', 'calculation_run', runId, null, calculation.warnings, {
        warning_count: calculation.warnings.length
      });
    }
    if (calculation.final_use_status === 'blocked') {
      await writeAudit(client, req, 'calculation.final_use_blocked', 'calculation_run', runId, null, calculation.final_use_blockers, {
        blockers: calculation.final_use_blockers,
        evidence_required: calculation.final_use_blockers.includes('MISSING_EVIDENCE'),
        unit_review_required: calculation.final_use_blockers.includes('UNIT_REVIEW_REQUIRED')
      });
    }

    await client.query('commit');
    res.status(validationStatus === 'blocked' ? 422 : 201).json({
      data: {
        ...mapRun(run ?? {}),
        calculation,
        formula: mapFormula(formula),
        formula_version: formulaVersionSnapshot,
        final_use_disclaimer: ENGINEERING_REVIEW_DISCLAIMER
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
