import { Router, type Request, type Response } from 'express';
import type { PoolClient } from 'pg';
import { pool } from '../db/client.js';
import { requirePermission } from '../middleware/rbac.js';
import {
  asBoolean,
  asJsonArray,
  asJsonObject,
  asString,
  buildControlledPlaceholder,
  isApiControlledFormula,
  isFormulaUsableInProduction,
  isPlainObject,
  nextFormulaVersion,
  validateFormulaPayload,
  type ValidationIssue
} from '../modules/formula-registry/validation.js';

export const formulasRouter = Router();

type DbRow = Record<string, unknown>;
type ApiResponse = Response<Record<string, unknown>>;
type Queryable = { query: <T extends DbRow = DbRow>(text: string, values?: unknown[]) => Promise<{ rows: T[] }> };

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

function actorUserId(req: Request): string | null {
  const id = req.user?.id;
  if (!id || id === '00000000-0000-0000-0000-000000000000') return null;
  return id;
}

function actorRoles(req: Request): string[] {
  return req.user?.roles ?? [];
}

function isAdminOrSeniorEngineer(req: Request): boolean {
  const roles = req.user?.roles ?? [];
  return roles.includes('admin') || roles.includes('senior_engineer');
}

function requireAdminOrSeniorEngineer(req: Request, res: ApiResponse): boolean {
  if (isAdminOrSeniorEngineer(req)) return true;
  res.status(403).json({
    error: {
      code: 'FORBIDDEN',
      message: 'Formula Registry write actions are restricted to admin and senior_engineer roles.'
    }
  });
  return false;
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

function mapFormula(row: DbRow): Record<string, unknown> {
  return {
    record_id: row.id,
    formula_id: row.formula_id ?? row.formula_code,
    formula_code: row.formula_code,
    formula_name: row.formula_name,
    code_basis: row.code_basis,
    code_edition: row.code_edition ?? row.edition,
    clause_reference: row.clause_reference,
    component: row.component,
    damage_mechanism: row.damage_mechanism,
    formula_type: row.formula_type,
    expression_type: row.expression_type,
    expression_body: row.expression_body ?? row.formula_expression,
    input_schema: row.input_schema ?? row.inputs_schema,
    output_schema: row.output_schema ?? row.outputs_schema,
    unit_rules: row.unit_rules ?? row.units_schema,
    validation_rules: row.validation_rules,
    blocking_rules: row.blocking_rules,
    test_case_reference: row.test_case_reference,
    status: row.status,
    version: row.version,
    effective_date: row.effective_date,
    approved_by: row.approved_by,
    approval_date: row.approval_date,
    locked_flag: row.locked_flag,
    previous_formula_record_id: row.previous_formula_record_id,
    production_usable: isFormulaUsableInProduction({ status: row.status, locked_flag: row.locked_flag }),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function payloadToFormulaValues(body: Record<string, unknown>, fallback: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  const formulaType = asString(body.formula_type) ?? asString(fallback.formula_type) ?? 'universal_deterministic';
  const expressionBody = isApiControlledFormula(formulaType)
    ? asString(body.expression_body) ?? asString(fallback.expression_body) ?? buildControlledPlaceholder()
    : asString(body.expression_body) ?? asString(fallback.expression_body) ?? null;

  return {
    formula_id: asString(body.formula_id) ?? asString(fallback.formula_id) ?? asString(fallback.formula_code),
    formula_code: asString(body.formula_id) ?? asString(fallback.formula_id) ?? asString(fallback.formula_code),
    formula_name: asString(body.formula_name) ?? asString(fallback.formula_name),
    code_basis: asString(body.code_basis) ?? asString(fallback.code_basis),
    code_edition: asString(body.code_edition) ?? asString(fallback.code_edition) ?? asString(fallback.edition),
    edition: asString(body.code_edition) ?? asString(fallback.code_edition) ?? asString(fallback.edition),
    clause_reference: asString(body.clause_reference) ?? asString(fallback.clause_reference),
    component: asString(body.component) ?? asString(fallback.component) ?? null,
    damage_mechanism: asString(body.damage_mechanism) ?? asString(fallback.damage_mechanism) ?? null,
    formula_type: formulaType,
    expression_type: asString(body.expression_type) ?? asString(fallback.expression_type) ?? 'controlled_placeholder',
    expression_body: expressionBody,
    input_schema: isPlainObject(body.input_schema) ? body.input_schema : fallback.input_schema ?? fallback.inputs_schema ?? {},
    output_schema: isPlainObject(body.output_schema) ? body.output_schema : fallback.output_schema ?? fallback.outputs_schema ?? {},
    unit_rules: isPlainObject(body.unit_rules) ? body.unit_rules : fallback.unit_rules ?? fallback.units_schema ?? {},
    validation_rules: isPlainObject(body.validation_rules) || Array.isArray(body.validation_rules) ? body.validation_rules : fallback.validation_rules ?? {},
    blocking_rules: Array.isArray(body.blocking_rules) ? body.blocking_rules : fallback.blocking_rules ?? [],
    test_case_reference: asString(body.test_case_reference) ?? asString(fallback.test_case_reference) ?? null,
    status: asString(body.status) ?? asString(fallback.status) ?? 'draft',
    version: asString(body.version) ?? asString(fallback.version) ?? '0.1.0',
    effective_date: asString(body.effective_date) ?? asString(fallback.effective_date) ?? null,
    locked_flag: asBoolean(body.locked_flag) ?? Boolean(fallback.locked_flag ?? false)
  };
}

async function getFormulaByRecordId(client: Queryable, recordId: string): Promise<DbRow | undefined> {
  const result = await client.query<DbRow>('select * from formula_registry where id = $1', [recordId]);
  return result.rows[0];
}

formulasRouter.get('/formulas', requirePermission('formula.read'), async (req, res, next) => {
  try {
    const status = asString(req.query.status);
    const search = asString(req.query.search);
    const values: unknown[] = [];
    const clauses: string[] = ['formula_id is not null'];

    if (status) {
      values.push(status);
      clauses.push(`status = $${values.length}`);
    }
    if (search) {
      values.push(`%${search.toLowerCase()}%`);
      clauses.push(`(lower(formula_id) like $${values.length} or lower(formula_name) like $${values.length} or lower(code_basis) like $${values.length})`);
    }

    const result = await pool.query<DbRow>(
      `select * from formula_registry
       where ${clauses.join(' and ')}
       order by formula_id, created_at desc`,
      values
    );
    res.json({ data: result.rows.map(mapFormula) });
  } catch (error) {
    next(error);
  }
});

formulasRouter.get('/formulas/approved/:formulaId', requirePermission('formula.read'), async (req, res, next) => {
  try {
    const formulaId = req.params.formulaId;
    if (!formulaId) {
      res.status(400).json({ error: { code: 'MISSING_ROUTE_PARAM', message: 'Missing formulaId.' } });
      return;
    }
    const version = asString(req.query.version);
    const values: unknown[] = [formulaId];
    let versionClause = '';
    if (version) {
      values.push(version);
      versionClause = `and version = $${values.length}`;
    }
    const result = await pool.query<DbRow>(
      `select * from formula_registry
       where formula_id = $1
         ${versionClause}
         and status in ('approved','locked')
       order by approval_date desc nulls last, created_at desc
       limit 1`,
      values
    );
    const formula = result.rows[0];
    if (!formula) {
      res.status(404).json({ error: { code: 'APPROVED_FORMULA_NOT_FOUND', message: 'Approved Formula Registry version not found.' } });
      return;
    }
    res.json({ data: mapFormula(formula) });
  } catch (error) {
    next(error);
  }
});

formulasRouter.post('/formulas', requirePermission('formula.create'), async (req, res, next) => {
  if (!requireAdminOrSeniorEngineer(req, res)) return;
  const body = ensureBody(req, res);
  if (!body) return;
  const issues = validateFormulaPayload(body, 'create');
  if (issues.length > 0) {
    validationError(res, issues);
    return;
  }

  const values = payloadToFormulaValues(body);
  const client = await pool.connect();
  try {
    await client.query('begin');
    const result = await client.query<DbRow>(
      `insert into formula_registry(
        formula_id, formula_code, formula_name, code_basis, code_edition, edition, clause_reference,
        component, damage_mechanism, formula_type, expression_type, expression_body,
        input_schema, output_schema, unit_rules, validation_rules, blocking_rules,
        test_case_reference, status, version, effective_date, locked_flag, created_by, updated_by
      ) values (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12,
        $13::jsonb, $14::jsonb, $15::jsonb, $16::jsonb, $17::jsonb,
        $18, $19, $20, $21, $22, $23, $23
      ) returning *`,
      [
        values.formula_id,
        values.formula_code,
        values.formula_name,
        values.code_basis,
        values.code_edition,
        values.edition,
        values.clause_reference,
        values.component,
        values.damage_mechanism,
        values.formula_type,
        values.expression_type,
        values.expression_body,
        JSON.stringify(asJsonObject(values.input_schema)),
        JSON.stringify(asJsonObject(values.output_schema)),
        JSON.stringify(asJsonObject(values.unit_rules)),
        JSON.stringify(values.validation_rules),
        JSON.stringify(asJsonArray(values.blocking_rules)),
        values.test_case_reference,
        values.status,
        values.version,
        values.effective_date,
        values.locked_flag,
        actorUserId(req)
      ]
    );
    const formula = result.rows[0];
    const auditLogId = await writeAudit(client, req, 'FORMULA_CREATED', 'formula_registry', String(formula?.id ?? ''), null, mapFormula(formula ?? {}), {
      formula_id: values.formula_id,
      version: values.version,
      module: 'formula_registry'
    });
    await client.query('commit');
    res.status(201).json({ data: mapFormula(formula ?? {}), auditLogId });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});

formulasRouter.get('/formulas/:formulaId/versions', requirePermission('formula.read'), async (req, res, next) => {
  try {
    const formulaId = req.params.formulaId;
    if (!formulaId) {
      res.status(400).json({ error: { code: 'MISSING_ROUTE_PARAM', message: 'Missing formulaId.' } });
      return;
    }
    const result = await pool.query<DbRow>(
      `select * from formula_registry where formula_id = $1 order by created_at desc`,
      [formulaId]
    );
    res.json({ data: result.rows.map(mapFormula) });
  } catch (error) {
    next(error);
  }
});

formulasRouter.get('/formulas/:formulaId/compare', requirePermission('formula.read'), async (req, res, next) => {
  try {
    const formulaId = req.params.formulaId;
    const fromVersion = asString(req.query.from_version);
    const toVersion = asString(req.query.to_version);
    if (!formulaId || !fromVersion || !toVersion) {
      res.status(400).json({ error: { code: 'MISSING_COMPARE_PARAMS', message: 'formulaId, from_version, and to_version are required.' } });
      return;
    }
    const result = await pool.query<DbRow>(
      `select * from formula_registry where formula_id = $1 and version in ($2, $3) order by version`,
      [formulaId, fromVersion, toVersion]
    );
    res.json({
      data: {
        formula_id: formulaId,
        from_version: fromVersion,
        to_version: toVersion,
        versions: result.rows.map(mapFormula)
      }
    });
  } catch (error) {
    next(error);
  }
});

formulasRouter.get('/formulas/records/:recordId', requirePermission('formula.read'), async (req, res, next) => {
  try {
    const recordId = req.params.recordId;
    if (!recordId) {
      res.status(400).json({ error: { code: 'MISSING_ROUTE_PARAM', message: 'Missing recordId.' } });
      return;
    }
    const formula = await getFormulaByRecordId(pool, recordId);
    if (!formula) {
      res.status(404).json({ error: { code: 'FORMULA_NOT_FOUND', message: 'Formula record not found.' } });
      return;
    }
    res.json({ data: mapFormula(formula) });
  } catch (error) {
    next(error);
  }
});

formulasRouter.patch('/formulas/records/:recordId', requirePermission('formula.update'), async (req, res, next) => {
  if (!requireAdminOrSeniorEngineer(req, res)) return;
  const recordId = req.params.recordId;
  if (!recordId) {
    res.status(400).json({ error: { code: 'MISSING_ROUTE_PARAM', message: 'Missing recordId.' } });
    return;
  }
  const body = ensureBody(req, res);
  if (!body) return;
  const issues = validateFormulaPayload(body, 'update');
  if (issues.length > 0) {
    validationError(res, issues);
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('begin');
    const before = await getFormulaByRecordId(client, recordId);
    if (!before) {
      await client.query('rollback');
      res.status(404).json({ error: { code: 'FORMULA_NOT_FOUND', message: 'Formula record not found.' } });
      return;
    }

    const isVersionedEdit = before.status === 'approved' || before.status === 'locked' || before.locked_flag === true;
    const values = payloadToFormulaValues(body, before);
    let result: { rows: DbRow[] };
    let eventType = 'FORMULA_UPDATED';

    if (isVersionedEdit) {
      const nextVersion = asString(body.version) ?? nextFormulaVersion(before.version);
      result = await client.query<DbRow>(
        `insert into formula_registry(
          formula_id, formula_code, formula_name, code_basis, code_edition, edition, clause_reference,
          component, damage_mechanism, formula_type, expression_type, expression_body,
          input_schema, output_schema, unit_rules, validation_rules, blocking_rules,
          test_case_reference, status, version, effective_date, locked_flag,
          previous_formula_record_id, created_by, updated_by
        ) values (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12,
          $13::jsonb, $14::jsonb, $15::jsonb, $16::jsonb, $17::jsonb,
          $18, 'draft', $19, $20, false,
          $21, $22, $22
        ) returning *`,
        [
          values.formula_id,
          values.formula_code,
          values.formula_name,
          values.code_basis,
          values.code_edition,
          values.edition,
          values.clause_reference,
          values.component,
          values.damage_mechanism,
          values.formula_type,
          values.expression_type,
          values.expression_body,
          JSON.stringify(asJsonObject(values.input_schema)),
          JSON.stringify(asJsonObject(values.output_schema)),
          JSON.stringify(asJsonObject(values.unit_rules)),
          JSON.stringify(values.validation_rules),
          JSON.stringify(asJsonArray(values.blocking_rules)),
          values.test_case_reference,
          nextVersion,
          values.effective_date,
          before.id,
          actorUserId(req)
        ]
      );
      eventType = 'FORMULA_VERSION_CREATED';
    } else {
      result = await client.query<DbRow>(
        `update formula_registry set
          formula_name = $2,
          code_basis = $3,
          code_edition = $4,
          edition = $4,
          clause_reference = $5,
          component = $6,
          damage_mechanism = $7,
          formula_type = $8,
          expression_type = $9,
          expression_body = $10,
          input_schema = $11::jsonb,
          output_schema = $12::jsonb,
          unit_rules = $13::jsonb,
          validation_rules = $14::jsonb,
          blocking_rules = $15::jsonb,
          test_case_reference = $16,
          effective_date = $17,
          locked_flag = $18,
          updated_by = $19,
          updated_at = now()
        where id = $1
        returning *`,
        [
          recordId,
          values.formula_name,
          values.code_basis,
          values.code_edition,
          values.clause_reference,
          values.component,
          values.damage_mechanism,
          values.formula_type,
          values.expression_type,
          values.expression_body,
          JSON.stringify(asJsonObject(values.input_schema)),
          JSON.stringify(asJsonObject(values.output_schema)),
          JSON.stringify(asJsonObject(values.unit_rules)),
          JSON.stringify(values.validation_rules),
          JSON.stringify(asJsonArray(values.blocking_rules)),
          values.test_case_reference,
          values.effective_date,
          values.locked_flag,
          actorUserId(req)
        ]
      );
    }

    const after = result.rows[0];
    const auditLogId = await writeAudit(client, req, eventType, 'formula_registry', String(after?.id ?? recordId), mapFormula(before), mapFormula(after ?? {}), {
      module: 'formula_registry',
      versioning_reason: isVersionedEdit ? 'approved_or_locked_record_edit' : 'draft_record_edit'
    });
    await client.query('commit');
    res.json({ data: mapFormula(after ?? {}), auditLogId });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});

formulasRouter.post('/formulas/records/:recordId/approve', requirePermission('formula.approve'), async (req, res, next) => {
  if (!requireAdminOrSeniorEngineer(req, res)) return;
  const recordId = req.params.recordId;
  if (!recordId) {
    res.status(400).json({ error: { code: 'MISSING_ROUTE_PARAM', message: 'Missing recordId.' } });
    return;
  }
  const client = await pool.connect();
  try {
    await client.query('begin');
    const before = await getFormulaByRecordId(client, recordId);
    if (!before) {
      await client.query('rollback');
      res.status(404).json({ error: { code: 'FORMULA_NOT_FOUND', message: 'Formula record not found.' } });
      return;
    }
    if (before.status === 'deprecated') {
      await client.query('rollback');
      res.status(409).json({ error: { code: 'FORMULA_DEPRECATED', message: 'Deprecated formulas cannot be approved.' } });
      return;
    }
    const result = await client.query<DbRow>(
      `update formula_registry
       set status = 'approved', approved_by = $2, approval_date = now(), locked_flag = true, updated_by = $2, updated_at = now()
       where id = $1
       returning *`,
      [recordId, actorUserId(req)]
    );
    const after = result.rows[0];
    const auditLogId = await writeAudit(client, req, 'FORMULA_APPROVED', 'formula_registry', recordId, mapFormula(before), mapFormula(after ?? {}), {
      module: 'formula_registry'
    });
    await client.query('commit');
    res.json({ data: mapFormula(after ?? {}), auditLogId });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});

formulasRouter.post('/formulas/records/:recordId/deprecate', requirePermission('formula.retire'), async (req, res, next) => {
  if (!requireAdminOrSeniorEngineer(req, res)) return;
  const recordId = req.params.recordId;
  if (!recordId) {
    res.status(400).json({ error: { code: 'MISSING_ROUTE_PARAM', message: 'Missing recordId.' } });
    return;
  }
  const client = await pool.connect();
  try {
    await client.query('begin');
    const before = await getFormulaByRecordId(client, recordId);
    if (!before) {
      await client.query('rollback');
      res.status(404).json({ error: { code: 'FORMULA_NOT_FOUND', message: 'Formula record not found.' } });
      return;
    }
    const result = await client.query<DbRow>(
      `update formula_registry set status = 'deprecated', updated_by = $2, updated_at = now() where id = $1 returning *`,
      [recordId, actorUserId(req)]
    );
    const after = result.rows[0];
    const auditLogId = await writeAudit(client, req, 'FORMULA_DEPRECATED', 'formula_registry', recordId, mapFormula(before), mapFormula(after ?? {}), {
      module: 'formula_registry'
    });
    await client.query('commit');
    res.json({ data: mapFormula(after ?? {}), auditLogId });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});

formulasRouter.post('/formulas/records/:recordId/test-run', requirePermission('formula.test'), async (req, res, next) => {
  if (!requireAdminOrSeniorEngineer(req, res)) return;
  const recordId = req.params.recordId;
  if (!recordId) {
    res.status(400).json({ error: { code: 'MISSING_ROUTE_PARAM', message: 'Missing recordId.' } });
    return;
  }
  const client = await pool.connect();
  try {
    await client.query('begin');
    const formula = await getFormulaByRecordId(client, recordId);
    if (!formula) {
      await client.query('rollback');
      res.status(404).json({ error: { code: 'FORMULA_NOT_FOUND', message: 'Formula record not found.' } });
      return;
    }
    const runCode = `FTR-${Date.now()}`;
    const message = 'Formula test runner placeholder only. No engineering expression was executed.';
    const insert = await client.query<{ id: string }>(
      `insert into formula_test_runs(
        formula_record_id, run_code, test_case_reference, input_snapshot_json, output_snapshot_json, result_status, message, run_by
      ) values ($1, $2, $3, $4::jsonb, '{}'::jsonb, 'placeholder', $5, $6)
      returning id`,
      [
        recordId,
        runCode,
        asString(req.body?.test_case_reference) ?? asString(formula.test_case_reference) ?? null,
        JSON.stringify(isPlainObject(req.body?.input_snapshot) ? req.body.input_snapshot : {}),
        message,
        actorUserId(req)
      ]
    );
    const result = {
      test_run_id: insert.rows[0]?.id,
      run_code: runCode,
      formula_record_id: recordId,
      result_status: 'placeholder',
      message
    };
    const auditLogId = await writeAudit(client, req, 'FORMULA_TEST_PLACEHOLDER_RUN', 'formula_registry', recordId, null, result, {
      module: 'formula_registry'
    });
    await client.query('commit');
    res.status(201).json({ data: result, auditLogId });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});
