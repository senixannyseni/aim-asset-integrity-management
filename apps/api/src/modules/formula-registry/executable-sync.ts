export type FormulaRegistrySyncRow = Record<string, unknown>;

export type Queryable = {
  query: <T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: unknown[]
  ) => Promise<{ rows: T[]; rowCount?: number | null }>;
};

export type FormulaSyncResult = {
  formula_version: Record<string, unknown>;
  sync_status: 'created' | 'updated' | 'already_synchronized';
};

const EXECUTABLE_REGISTRY_STATUSES = new Set(['approved', 'approved_active', 'locked']);
const NON_EXECUTABLE_REGISTRY_STATUSES = new Set(['draft', 'under_review', 'rejected', 'retired', 'deprecated', 'superseded', 'inactive']);
const EXECUTABLE_VERSION_STATUSES = new Set(['approved', 'locked']);

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function asJsonObject(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function normalizeRegistryStatus(value: unknown): string {
  return (asString(value) ?? 'draft').toLowerCase();
}

export function isExecutableRegistryStatus(value: unknown): boolean {
  return EXECUTABLE_REGISTRY_STATUSES.has(normalizeRegistryStatus(value));
}

export function isBlockedRegistryStatus(value: unknown): boolean {
  return NON_EXECUTABLE_REGISTRY_STATUSES.has(normalizeRegistryStatus(value));
}

export function assertFormulaRegistryRecordCanSync(row: FormulaRegistrySyncRow): void {
  const status = normalizeRegistryStatus(row.status);
  if (!isExecutableRegistryStatus(status)) {
    const error = new Error(`Formula Registry record status ${status} cannot be synchronized to executable formula_versions.`);
    (error as Error & { code?: string; statusCode?: number; details?: Record<string, unknown> }).code = 'FORMULA_REGISTRY_NOT_APPROVED_FOR_SYNC';
    (error as Error & { code?: string; statusCode?: number; details?: Record<string, unknown> }).statusCode = 409;
    (error as Error & { code?: string; statusCode?: number; details?: Record<string, unknown> }).details = {
      registry_status: status,
      blocked_status: isBlockedRegistryStatus(status)
    };
    throw error;
  }
}

export function assertFormulaVersionIsExecutable(row: FormulaRegistrySyncRow | undefined): asserts row is FormulaRegistrySyncRow {
  const status = normalizeRegistryStatus(row?.formula_version_status ?? row?.formula_status);
  if (!row || !EXECUTABLE_VERSION_STATUSES.has(status) || row.deterministic_flag === false) {
    const error = new Error('Calculation requires an approved synchronized formula_versions record.');
    (error as Error & { code?: string; statusCode?: number }).code = 'APPROVED_SYNCHRONIZED_FORMULA_VERSION_REQUIRED';
    (error as Error & { code?: string; statusCode?: number }).statusCode = 400;
    throw error;
  }

  const registryStatus = normalizeRegistryStatus(row.status ?? row.registry_status);
  if (!isExecutableRegistryStatus(registryStatus)) {
    const error = new Error('Formula version source registry record is not currently approved/active.');
    (error as Error & { code?: string; statusCode?: number }).code = 'FORMULA_REGISTRY_SOURCE_NOT_APPROVED';
    (error as Error & { code?: string; statusCode?: number }).statusCode = 400;
    throw error;
  }
}

function formulaCode(row: FormulaRegistrySyncRow): string {
  const code = asString(row.formula_id) ?? asString(row.formula_code);
  if (!code) {
    const error = new Error('Formula Registry record is missing formula_id/formula_code.');
    (error as Error & { code?: string; statusCode?: number }).code = 'FORMULA_CODE_REQUIRED';
    (error as Error & { code?: string; statusCode?: number }).statusCode = 400;
    throw error;
  }
  return code;
}

function formulaVersion(row: FormulaRegistrySyncRow): string {
  const version = asString(row.version);
  if (!version) {
    const error = new Error('Formula Registry record is missing version.');
    (error as Error & { code?: string; statusCode?: number }).code = 'FORMULA_VERSION_REQUIRED';
    (error as Error & { code?: string; statusCode?: number }).statusCode = 400;
    throw error;
  }
  return version;
}

function formulaName(row: FormulaRegistrySyncRow): string {
  const name = asString(row.formula_name);
  if (!name) {
    const error = new Error('Formula Registry record is missing formula_name.');
    (error as Error & { code?: string; statusCode?: number }).code = 'FORMULA_NAME_REQUIRED';
    (error as Error & { code?: string; statusCode?: number }).statusCode = 400;
    throw error;
  }
  return name;
}

function formulaVersionStatus(row: FormulaRegistrySyncRow): 'approved' | 'locked' {
  return normalizeRegistryStatus(row.status) === 'locked' ? 'locked' : 'approved';
}

export async function syncApprovedFormulaRegistryToExecutable(
  client: Queryable,
  registryRecord: FormulaRegistrySyncRow,
  actorUserId: string | null
): Promise<FormulaSyncResult> {
  assertFormulaRegistryRecordCanSync(registryRecord);

  const registryId = asString(registryRecord.id);
  if (!registryId) {
    const error = new Error('Formula Registry record id is required for executable synchronization.');
    (error as Error & { code?: string; statusCode?: number }).code = 'FORMULA_REGISTRY_ID_REQUIRED';
    (error as Error & { code?: string; statusCode?: number }).statusCode = 400;
    throw error;
  }

  const code = formulaCode(registryRecord);
  const version = formulaVersion(registryRecord);
  const existing = await client.query(
    `select * from formula_versions
     where formula_registry_id = $1 or (formula_code = $2 and version = $3)
     order by created_at asc
     limit 1`,
    [registryId, code, version]
  );
  const current = existing.rows[0];
  if (current && asString(current.formula_registry_id) !== registryId) {
    const error = new Error('A different Formula Registry record already owns this executable formula_code/version.');
    (error as Error & { code?: string; statusCode?: number; details?: Record<string, unknown> }).code = 'FORMULA_VERSION_SYNC_CONFLICT';
    (error as Error & { code?: string; statusCode?: number; details?: Record<string, unknown> }).statusCode = 409;
    (error as Error & { code?: string; statusCode?: number; details?: Record<string, unknown> }).details = {
      existing_formula_version_id: current.id,
      existing_formula_registry_id: current.formula_registry_id,
      requested_formula_registry_id: registryId
    };
    throw error;
  }

  const values = [
    registryId,
    code,
    formulaName(registryRecord),
    version,
    formulaVersionStatus(registryRecord),
    true,
    asString(registryRecord.formula_expression_source) ?? 'approved_formula_registry_or_fixture_only',
    JSON.stringify(asJsonObject(registryRecord.input_schema ?? registryRecord.inputs_schema)),
    JSON.stringify(asJsonObject(registryRecord.output_schema ?? registryRecord.outputs_schema)),
    JSON.stringify(asJsonObject(registryRecord.unit_rules ?? registryRecord.units_schema)),
    JSON.stringify(asJsonObject(registryRecord.validation_rules)),
    asString(registryRecord.approved_by) ?? actorUserId,
    registryRecord.approval_date ?? registryRecord.approved_at ?? null,
    actorUserId
  ];

  if (current) {
    const updated = await client.query(
      `update formula_versions set
        formula_name = $3,
        formula_status = $5,
        deterministic_flag = $6,
        formula_expression_source = $7,
        input_schema = $8::jsonb,
        output_schema = $9::jsonb,
        unit_rules = $10::jsonb,
        validation_rules = $11::jsonb,
        approved_by = $12,
        approved_at = coalesce($13::timestamptz, approved_at, now()),
        updated_at = now()
       where formula_registry_id = $1
         and formula_code = $2
         and version = $4
       returning *`,
      values
    );
    return {
      formula_version: updated.rows[0] ?? current,
      sync_status: 'updated'
    };
  }

  const inserted = await client.query(
    `insert into formula_versions(
      formula_registry_id,
      formula_code,
      formula_name,
      version,
      formula_status,
      deterministic_flag,
      formula_expression_source,
      input_schema,
      output_schema,
      unit_rules,
      validation_rules,
      approved_by,
      approved_at,
      created_by
    ) values (
      $1, $2, $3, $4, $5, $6, $7,
      $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb,
      $12, coalesce($13::timestamptz, now()), $14
    ) returning *`,
    values
  );

  return {
    formula_version: inserted.rows[0] ?? {},
    sync_status: 'created'
  };
}
