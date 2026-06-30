import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

const TENANT_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const TENANT_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ASSET_A = '11111111-1111-4111-8111-111111111111';
const JOB_A = '22222222-2222-4222-8222-222222222222';
const FIELD_A = '33333333-3333-4333-8333-333333333333';
const STAGING_A = '44444444-4444-4444-8444-444444444444';
const NDT_A = '55555555-5555-4555-8555-555555555555';
const EVIDENCE_A = '66666666-6666-4666-8666-666666666666';
const REPORT_A = '77777777-7777-4777-8777-777777777777';
const CALCULATION_RUN_A = '88888888-8888-4888-8888-888888888888';
const CALCULATION_INPUT_A = '99999999-9999-4999-8999-999999999999';
const INTEGRITY_DECISION_A = 'aaaaaaaa-1111-4111-8111-aaaaaaaa1111';
const REVIEWER_ID = 'bbbbbbbb-1111-4111-8111-bbbbbbbb1111';
const PROMOTER_ID = 'cccccccc-1111-4111-8111-cccccccc1111';
const APPROVER_ID = 'dddddddd-1111-4111-8111-dddddddd1111';

const SHA256 = 'a'.repeat(64);

type DbRow = Record<string, unknown>;
type QueryResult<T extends DbRow = DbRow> = { rows: T[]; rowCount: number };

type FakePool = {
  connect: ReturnType<typeof vi.fn>;
  query: ReturnType<typeof vi.fn>;
};

function rows<T extends DbRow>(items: T[] = []): QueryResult<T> {
  return { rows: items, rowCount: items.length };
}

function normalizeSql(sql: string): string {
  return sql.toLowerCase().replace(/\s+/g, ' ').trim();
}

function testEnv(): NodeJS.ProcessEnv {
  return {
    ...ORIGINAL_ENV,
    APP_ENV: 'local',
    AUTH_ALLOW_LOCAL_DEMO: 'true',
    AUTH_JWT_SECRET: 'local-dev-secret-change-me-32-chars-minimum',
    AUTH_TOKEN_ISSUER: 'aim-api-test',
    DATABASE_URL: 'postgresql://aim_user:aim_password@localhost:5432/aim_tank_integrity_test'
  };
}

function demoHeaders(input: {
  roles: string;
  userId?: string;
  email?: string;
  tenantId?: string;
  tenantSlug?: string;
}): Record<string, string> {
  const tenantId = input.tenantId ?? TENANT_A;
  const tenantSlug = input.tenantSlug ?? (tenantId === TENANT_A ? 'tenant-a' : 'tenant-b');
  return {
    'x-aim-demo-roles': input.roles,
    'x-aim-demo-user-id': input.userId ?? PROMOTER_ID,
    'x-aim-demo-email': input.email ?? 'promoter.engineer@aim.local',
    'x-aim-demo-full-name': 'Governance Runtime Test User',
    'x-aim-demo-tenant-id': tenantId,
    'x-aim-demo-tenant-slug': tenantSlug,
    'x-aim-demo-tenant-name': tenantSlug.toUpperCase()
  };
}

async function importAppWithPool(pool: FakePool) {
  vi.resetModules();
  vi.doMock('../src/db/client.js', () => ({
    pool,
    checkDatabaseConnection: vi.fn().mockResolvedValue({ ok: true, serverTime: '2026-07-01T00:00:00+07:00' })
  }));
  process.env = testEnv();
  const { createApp } = await import('../src/app.js');
  return createApp();
}

type PromotionDbOptions = {
  tenantId?: string;
  targetTable?: string;
  targetColumn?: string;
  reviewStatus?: string;
  fieldStatus?: string;
  hasEvidence?: boolean;
  hasBlockingDataQualityCheck?: boolean;
  promotionValue?: string;
};

function createPromotionDb(options: PromotionDbOptions = {}) {
  const tenantId = options.tenantId ?? TENANT_A;
  const targetTable = options.targetTable ?? 'ndt_measurements';
  const targetColumn = options.targetColumn ?? 'measured_thickness_mm';
  const reviewStatus = options.reviewStatus ?? 'approved_for_promotion';
  const fieldStatus = options.fieldStatus ?? 'approved_by_engineer';
  const hasEvidence = options.hasEvidence ?? true;
  const promotionValue = options.promotionValue ?? '7.2';
  const auditEvents: Array<{ eventType: string; entityType: string; entityId: string | null; metadata: DbRow }> = [];
  const finalMutations: string[] = [];
  const queriedSql: string[] = [];

  const staging: DbRow = {
    id: STAGING_A,
    extraction_job_id: JOB_A,
    extraction_field_id: FIELD_A,
    target_entity_type: 'ndt_measurement',
    target_entity_id: NDT_A,
    target_table: targetTable,
    target_column: targetColumn,
    proposed_value: promotionValue,
    normalized_value: promotionValue,
    unit: 'mm',
    review_status: reviewStatus,
    promotion_status: 'not_promoted',
    reviewer_id: REVIEWER_ID,
    reviewed_at: '2026-07-01T01:00:00+07:00',
    metadata_json: { runtime_test: true }
  };

  const field: DbRow = {
    id: FIELD_A,
    extraction_job_id: JOB_A,
    field_path: 'shell.course_1.measured_thickness_mm',
    field_name: 'measured_thickness_mm',
    extracted_value: promotionValue,
    normalized_value: promotionValue,
    unit: 'mm',
    source_reference_json: { evidence_file_id: EVIDENCE_A, page: 1, table: 'UT readings' },
    confidence_score: 0.96,
    field_status: fieldStatus,
    validation_flags: [],
    reviewer_id: REVIEWER_ID,
    reviewed_at: '2026-07-01T01:00:00+07:00'
  };

  const job: DbRow = {
    id: JOB_A,
    extraction_job_code: 'EXJ-2026-000001',
    asset_id: ASSET_A,
    source_evidence_file_id: EVIDENCE_A,
    schema_name: 'ut_thickness',
    schema_version: '1.0.0',
    status: 'completed',
    staging_only_flag: true
  };

  const query = vi.fn(async (text: string, values: unknown[] = []): Promise<QueryResult> => {
    const sql = normalizeSql(text);
    queriedSql.push(sql);

    if (sql === 'begin' || sql === 'commit' || sql === 'rollback') return rows();

    if (sql.includes('from staging_records sr') && sql.includes('where sr.id = $1::uuid')) {
      return values[1] === tenantId ? rows([staging]) : rows();
    }

    if (sql.includes('from extraction_fields ef') && sql.includes('where ef.id = $1::uuid')) {
      return values[1] === tenantId ? rows([field]) : rows();
    }

    if (sql.includes('from extraction_jobs ej') && sql.includes('where ej.id = $1::uuid')) {
      return values[1] === tenantId ? rows([job]) : rows();
    }

    if (sql.includes('from data_quality_checks dqc')) {
      return options.hasBlockingDataQualityCheck ? rows([{ one: 1 }]) : rows();
    }

    if (sql.includes('select evidence_file_id, evidence_code from candidates')) {
      return hasEvidence ? rows([{ evidence_file_id: EVIDENCE_A, evidence_code: 'EVD-2026-000001' }]) : rows();
    }

    if (sql.includes('insert into review_gates')) return rows();

    if (sql.includes("update staging_records set promotion_status = 'blocked'")) return rows([{ ...staging, promotion_status: 'blocked' }]);

    if (sql.includes('update ndt_measurements set')) {
      finalMutations.push(sql);
      return rows([{ id: NDT_A, tenant_id: tenantId, measured_thickness_mm: Number(promotionValue), evidence_file_id: EVIDENCE_A }]);
    }

    if (sql.includes("update staging_records set review_status = 'promoted'")) {
      return rows([{ ...staging, review_status: 'promoted', promotion_status: 'promoted', metadata_json: { promoted_from_ai_staging: true } }]);
    }

    if (sql.includes('update extraction_jobs set status =')) return rows([{ ...job, status: 'completed' }]);

    if (sql.includes('insert into audit_logs')) {
      const metadata = typeof values[9] === 'string' ? JSON.parse(values[9]) as DbRow : {};
      auditEvents.push({
        eventType: String(values[1]),
        entityType: String(values[4]),
        entityId: values[5] === null || values[5] === undefined ? null : String(values[5]),
        metadata
      });
      return rows([{ id: `audit-${auditEvents.length}` }]);
    }

    return rows();
  });

  const client = { query, release: vi.fn() };
  const pool: FakePool = {
    connect: vi.fn().mockResolvedValue(client),
    query
  };

  return { pool, client, auditEvents, finalMutations, queriedSql };
}

describe('source-of-truth AI staging promotion runtime governance', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.doUnmock('../src/db/client.js');
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('blocks AI and n8n/service-like actors from final-table staging promotion even when they carry broad permissions', async () => {
    const firstDb = createPromotionDb();
    const firstApp = await importAppWithPool(firstDb.pool);

    await request(firstApp)
      .post(`/api/v1/staging-records/${STAGING_A}/promote`)
      .set(demoHeaders({ roles: 'engineer,ai_agent', userId: PROMOTER_ID, email: 'ai-agent@aim.local' }))
      .send({ comment: 'Human independent promotion rationale.' })
      .expect(403)
      .expect((res) => {
        expect(res.body.error.code).toBe('AI_SERVICE_ACTOR_BLOCKED');
      });

    const secondDb = createPromotionDb();
    const secondApp = await importAppWithPool(secondDb.pool);

    await request(secondApp)
      .post(`/api/v1/staging-records/${STAGING_A}/promote`)
      .set(demoHeaders({ roles: 'engineer', userId: PROMOTER_ID, email: 'n8n.service@aim.local' }))
      .send({ comment: 'Human independent promotion rationale.' })
      .expect(403)
      .expect((res) => {
        expect(res.body.error.code).toBe('AI_SERVICE_ACTOR_BLOCKED');
      });
  });

  it('allows a human engineer to promote only reviewed staging records through the final-table allowlist and writes audit/source snapshot', async () => {
    const db = createPromotionDb();
    const app = await importAppWithPool(db.pool);

    await request(app)
      .post(`/api/v1/staging-records/${STAGING_A}/promote`)
      .set(demoHeaders({ roles: 'engineer', userId: PROMOTER_ID }))
      .send({ comment: 'Independent engineer promotion after evidence review.' })
      .expect(200)
      .expect((res) => {
        expect(res.body.data.final_table_mutation).toBe(true);
        expect(res.body.data.final_promotion_result).toMatchObject({
          final_table: 'ndt_measurements',
          final_record_id: NDT_A,
          final_column: 'measured_thickness_mm',
          operation: 'update',
          evidence_file_id: EVIDENCE_A
        });
        expect(res.body.data.final_promotion_result.immutable_source_snapshot).toMatchObject({
          source: 'ai_staging_promotion',
          ai_original_value: '7.2',
          reviewed_value: '7.2',
          reviewer_id: REVIEWER_ID,
          evidence_file_id: EVIDENCE_A,
          target_table: 'ndt_measurements',
          target_column: 'measured_thickness_mm'
        });
      });

    expect(db.finalMutations).toHaveLength(1);
    expect(db.finalMutations[0]).toContain('update ndt_measurements set measured_thickness_mm');
    expect(db.finalMutations[0]).toContain('tenant_id = $5::uuid');
    const promotionAudit = db.auditEvents.find((event) => event.eventType === 'AI_STAGING_PROMOTED');
    expect(promotionAudit?.metadata).toMatchObject({
      final_table_mutation: true,
      immutable_source_snapshot: expect.objectContaining({
        staging_record_id: STAGING_A,
        ai_original_value: '7.2',
        reviewed_value: '7.2',
        promoted_by: PROMOTER_ID
      })
    });
  });

  it.each([
    {
      name: 'unreviewed field status',
      options: { reviewStatus: 'pending_review', fieldStatus: 'ai_extracted' },
      expectedStatus: 409,
      expectedCode: 'PROMOTION_GATE_FAILED',
      expectedText: 'FIELD_ENGINEER_REVIEW_STATUS_REQUIRED'
    },
    {
      name: 'missing verified evidence linkage',
      options: { hasEvidence: false },
      expectedStatus: 409,
      expectedCode: 'PROMOTION_GATE_FAILED',
      expectedText: 'VERIFIED_EVIDENCE_LINK_REQUIRED'
    },
    {
      name: 'unresolved critical data quality flags',
      options: { hasBlockingDataQualityCheck: true },
      expectedStatus: 409,
      expectedCode: 'PROMOTION_GATE_FAILED',
      expectedText: 'BLOCKING_DATA_QUALITY_CHECKS'
    },
    {
      name: 'unsupported target table',
      options: { targetTable: 'audit_logs' },
      expectedStatus: 422,
      expectedCode: 'unsupported_promotion_target',
      expectedText: 'audit_logs'
    },
    {
      name: 'unsupported target column',
      options: { targetColumn: 'tenant_id' },
      expectedStatus: 422,
      expectedCode: 'unsupported_promotion_target',
      expectedText: 'tenant_id'
    }
  ])('fails closed for $name and does not mutate final tables', async ({ options, expectedStatus, expectedCode, expectedText }) => {
    const db = createPromotionDb(options);
    const app = await importAppWithPool(db.pool);

    await request(app)
      .post(`/api/v1/staging-records/${STAGING_A}/promote`)
      .set(demoHeaders({ roles: 'engineer', userId: PROMOTER_ID }))
      .send({ comment: 'Independent engineer promotion after evidence review.' })
      .expect(expectedStatus)
      .expect((res) => {
        expect(res.body.error.code).toBe(expectedCode);
        expect(JSON.stringify(res.body)).toContain(expectedText);
      });

    expect(db.finalMutations).toHaveLength(0);
  });

  it('does not allow Tenant A to promote Tenant B staging records', async () => {
    const db = createPromotionDb({ tenantId: TENANT_B });
    const app = await importAppWithPool(db.pool);

    await request(app)
      .post(`/api/v1/staging-records/${STAGING_A}/promote`)
      .set(demoHeaders({ roles: 'engineer', userId: PROMOTER_ID, tenantId: TENANT_A }))
      .send({ comment: 'Independent engineer promotion after evidence review.' })
      .expect(404)
      .expect((res) => {
        expect(res.body.error.code).toBe('STAGING_RECORD_NOT_FOUND');
      });

    expect(db.finalMutations).toHaveLength(0);
  });
});

type ReportDbOptions = {
  tenantId?: string;
  calculationInputEvidenceCount?: number;
  calculationInputTotalCount?: number;
};

function createReportIssueDb(options: ReportDbOptions = {}) {
  const tenantId = options.tenantId ?? TENANT_A;
  const calculationInputEvidenceCount = options.calculationInputEvidenceCount ?? 1;
  const calculationInputTotalCount = options.calculationInputTotalCount ?? 1;
  const auditEvents: Array<{ eventType: string; metadata: DbRow }> = [];
  const persistedGates: DbRow[] = [];

  const report: DbRow = {
    id: REPORT_A,
    report_number: 'RPT-2026-000001',
    asset_id: ASSET_A,
    calculation_run_id: CALCULATION_RUN_A,
    report_status: 'approved',
    locked_flag: false,
    content_hash: 'hash-001',
    sections_json: [{ title: 'Summary', body: ['Ready'] }],
    traceability_json: { calculation_run_id: CALCULATION_RUN_A },
    validation_warnings_json: [],
    generated_by: REVIEWER_ID,
    tenant_id: tenantId
  };

  const query = vi.fn(async (text: string, values: unknown[] = []): Promise<QueryResult> => {
    const sql = normalizeSql(text);

    if (sql === 'begin' || sql === 'commit' || sql === 'rollback') return rows();

    if (sql.includes('select * from reports where id = $1 and tenant_id = $2::uuid for update')) {
      return values[1] === tenantId ? rows([report]) : rows();
    }

    if (sql.includes('select * from calculation_runs where id = $1 and tenant_id = $2::uuid')) {
      return rows([{ id: CALCULATION_RUN_A, tenant_id: tenantId, run_status: 'completed', status: 'completed', final_use_status: 'approved', review_status: 'approved', approval_status: 'approved' }]);
    }

    if (sql.includes('with calculation_input_rows as')) {
      return rows([{
        report_evidence_count: '1',
        calculation_run_evidence_count: '1',
        calculation_input_evidence_count: String(calculationInputEvidenceCount),
        calculation_input_total_count: String(calculationInputTotalCount),
        integrity_decision_evidence_count: '1',
        total_evidence_count: String(3 + calculationInputEvidenceCount)
      }]);
    }

    if (sql.includes('select * from integrity_decisions where calculation_run_id = $1 and tenant_id = $2::uuid order by created_at desc limit 1')) {
      return rows([{ id: INTEGRITY_DECISION_A, tenant_id: tenantId, calculation_run_id: CALCULATION_RUN_A, decision_status: 'approved' }]);
    }

    if (sql.includes('from integrity_decisions') && sql.includes("decision_status = 'approved'")) {
      return rows([{ id: INTEGRITY_DECISION_A, tenant_id: tenantId, calculation_run_id: CALCULATION_RUN_A, decision_status: 'approved' }]);
    }

    if (sql.includes('from error_logs') && sql.includes('select count(*)::text as count')) return rows([{ count: '0' }]);
    if (sql.includes('from review_gates') && sql.includes('select count(*)::text as count')) return rows([{ count: '0' }]);

    if (sql.includes('insert into review_gates')) {
      persistedGates.push({ gate_type: values[1], gate_status: values[2], metadata_json: values[6] });
      return rows();
    }

    if (sql.includes('insert into error_logs')) return rows([{ id: 'error-report-gate-1' }]);

    if (sql.includes("update reports set report_status = 'issued'")) {
      return rows([{ ...report, report_status: 'issued', locked_flag: true, issued_by: APPROVER_ID }]);
    }

    if (sql.includes("update error_logs set status = 'resolved'")) return rows();

    if (sql.includes('insert into audit_logs')) {
      const metadata = typeof values[9] === 'string' ? JSON.parse(values[9]) as DbRow : {};
      auditEvents.push({ eventType: String(values[1]), metadata });
      return rows([{ id: `audit-report-${auditEvents.length}` }]);
    }

    return rows();
  });

  const client = { query, release: vi.fn() };
  const pool: FakePool = {
    connect: vi.fn().mockResolvedValue(client),
    query
  };

  return { pool, client, auditEvents, persistedGates };
}

describe('source-of-truth report issue calculation-input evidence runtime gate', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.doUnmock('../src/db/client.js');
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('blocks report issue when calculation inputs exist but lack verified evidence and returns calculation_input gate details', async () => {
    const db = createReportIssueDb({ calculationInputEvidenceCount: 0, calculationInputTotalCount: 1 });
    const app = await importAppWithPool(db.pool);

    await request(app)
      .post(`/api/v1/reports/${REPORT_A}/issue`)
      .set(demoHeaders({ roles: 'approver', userId: APPROVER_ID, email: 'approver@aim.local' }))
      .send({ issue_comment: 'Approver issue review after gate verification.' })
      .expect(409)
      .expect((res) => {
        expect(res.body.error.code).toBe('REPORT_GATES_NOT_SATISFIED');
        const evidenceGate = (res.body.error.gates as DbRow[]).find((item) => item.gate_type === 'evidence_linked');
        expect(evidenceGate).toBeDefined();
        expect(evidenceGate?.metadata).toMatchObject({
          calculation_input_evidence_count: 0,
          calculation_input_total_count: 1,
          calculation_input_evidence_complete: false
        });
        expect(evidenceGate?.metadata).toHaveProperty('missing_required_evidence');
        expect((evidenceGate?.metadata as { missing_required_evidence: string[] }).missing_required_evidence).toContain('calculation_input');
      });

    expect(db.auditEvents.some((event) => event.eventType === 'REPORT_ISSUE_BLOCKED')).toBe(true);
  });

  it('passes report issue only when report, calculation, calculation-input, integrity decision, review, and approval gates are satisfied', async () => {
    const db = createReportIssueDb({ calculationInputEvidenceCount: 1, calculationInputTotalCount: 1 });
    const app = await importAppWithPool(db.pool);

    await request(app)
      .post(`/api/v1/reports/${REPORT_A}/issue`)
      .set(demoHeaders({ roles: 'approver', userId: APPROVER_ID, email: 'approver@aim.local' }))
      .send({ issue_comment: 'Approver issue review after gate verification.' })
      .expect(200)
      .expect((res) => {
        expect(res.body.data.report_status).toBe('issued');
      });

    const issuedAudit = db.auditEvents.find((event) => event.eventType === 'REPORT_ISSUED');
    expect(issuedAudit?.metadata).toMatchObject({ report_gate_check: true, human_approver_required: true });
    expect(JSON.stringify(issuedAudit?.metadata)).toContain('calculation_input_evidence_complete');
  });

  it('does not allow Tenant A to read or satisfy Tenant B report evidence gates', async () => {
    const db = createReportIssueDb({ tenantId: TENANT_B, calculationInputEvidenceCount: 1, calculationInputTotalCount: 1 });
    const app = await importAppWithPool(db.pool);

    await request(app)
      .post(`/api/v1/reports/${REPORT_A}/issue`)
      .set(demoHeaders({ roles: 'approver', userId: APPROVER_ID, email: 'approver@aim.local', tenantId: TENANT_A }))
      .send({ issue_comment: 'Approver issue review after gate verification.' })
      .expect(404)
      .expect((res) => {
        expect(res.body.error.code).toBe('REPORT_NOT_FOUND');
      });
  });
});

describe('source-of-truth evidence upload file-type runtime validator coverage', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it.each([
    ['.pdf', 'PDF', 'application/pdf'],
    ['.xlsx', 'XLSX', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    ['.csv', 'CSV', 'text/csv'],
    ['.jpg', 'JPG', 'image/jpeg'],
    ['.jpeg', 'JPEG', 'image/jpeg'],
    ['.png', 'PNG', 'image/png'],
    ['.dwg', 'DWG', 'application/acad'],
    ['.dxf', 'DXF', 'application/dxf'],
    ['.stl', 'STL', 'model/stl'],
    ['.zip', 'ZIP', 'application/zip']
  ])('accepts source-of-truth evidence type %s through payload and object-storage validators', async (extension, fileType, mimeType) => {
    process.env = testEnv();
    vi.resetModules();
    const validation = await import('../src/modules/evidence/validation.js');
    const storage = await import('../src/modules/object-storage/evidence-storage.js');

    const uploadIssues = validation.validateEvidenceUploadPayload({
      asset_id: ASSET_A,
      file_name: `source-evidence${extension}`,
      file_type: fileType,
      mime_type: mimeType,
      method: 'UT_THICKNESS',
      component: 'SHELL_COURSE_1',
      inspection_date: '2026-07-01',
      checksum: SHA256,
      file_size_bytes: 4096
    });

    expect(uploadIssues).toEqual([]);
    expect(() => storage.validateEvidenceObjectRequest({ filename: `source-evidence${extension}`, mimeType, sizeBytes: 4096 })).not.toThrow();
  });

  it('rejects unsupported evidence extensions and keeps ZIP checksum/object-storage controls in force', async () => {
    process.env = testEnv();
    vi.resetModules();
    const validation = await import('../src/modules/evidence/validation.js');
    const storage = await import('../src/modules/object-storage/evidence-storage.js');

    const unsupportedIssues = validation.validateEvidenceUploadPayload({
      asset_id: ASSET_A,
      file_name: 'malware.exe',
      file_type: 'EXE',
      mime_type: 'application/octet-stream',
      method: 'UT_THICKNESS',
      component: 'SHELL_COURSE_1',
      inspection_date: '2026-07-01',
      checksum: SHA256,
      file_size_bytes: 4096
    });
    expect(unsupportedIssues.some((issue) => issue.field === 'file_type')).toBe(true);
    expect(() => storage.validateEvidenceObjectRequest({ filename: 'malware.exe', mimeType: 'application/octet-stream', sizeBytes: 4096 })).toThrow(/File extension is not allowed/);

    const zipWithoutChecksum = validation.validateEvidenceUploadPayload({
      asset_id: ASSET_A,
      file_name: 'controlled-bundle.zip',
      file_type: 'ZIP',
      mime_type: 'application/zip',
      method: 'UT_THICKNESS',
      component: 'SHELL_COURSE_1',
      inspection_date: '2026-07-01',
      file_size_bytes: 4096
    });
    expect(zipWithoutChecksum.some((issue) => issue.field === 'checksum')).toBe(true);
    expect(() => storage.validateEvidenceObjectRequest({ filename: 'controlled-bundle.zip', mimeType: 'application/zip', sizeBytes: 0 })).toThrow(/File size exceeds allowed limit/);
  });
});
