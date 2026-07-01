import { randomUUID } from 'node:crypto';
import type { Express } from 'express';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { Pool } from 'pg';

type DbRow = Record<string, unknown>;

type FixtureIds = {
  runKey: string;
  tenantA: string;
  tenantB: string;
  reviewer: string;
  promoter: string;
  approver: string;
  aiActor: string;
  assetA: string;
  assetB: string;
  inspectionA: string;
  evidenceA: string;
  formula: string;
  formulaVersion: string;
  calculationRun: string;
  calculationInput: string;
  integrityDecision: string;
  report: string;
  ndtMeasurement: string;
  extractionJob: string;
  extractionField: string;
  stagingRecord: string;
  dataQualityCheck: string;
};

const SHA256 = 'b'.repeat(64);
const LIVE_SMOKE_ENV = {
  APP_ENV: 'local',
  AUTH_ALLOW_LOCAL_DEMO: 'true',
  AUTH_JWT_SECRET: 'local-dev-secret-change-me-32-chars-minimum',
  AUTH_TOKEN_ISSUER: 'aim-api-live-db-smoke',
  EVIDENCE_ALLOWED_EXTENSIONS: '.pdf,.xlsx,.csv,.jpg,.jpeg,.png,.dwg,.dxf,.stl,.zip',
  EVIDENCE_ALLOWED_MIME_TYPES: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/acad',
    'application/x-acad',
    'image/vnd.dwg',
    'application/dxf',
    'image/vnd.dxf',
    'model/stl',
    'application/sla',
    'application/vnd.ms-pki.stl',
    'application/zip',
    'application/x-zip-compressed',
    'application/octet-stream'
  ].join(',')
};

let app: Express;
let pool: Pool;
let activeFixtures: FixtureIds[] = [];

function makeIds(): FixtureIds {
  const runKey = randomUUID().slice(0, 8);
  return {
    runKey,
    tenantA: randomUUID(),
    tenantB: randomUUID(),
    reviewer: randomUUID(),
    promoter: randomUUID(),
    approver: randomUUID(),
    aiActor: randomUUID(),
    assetA: randomUUID(),
    assetB: randomUUID(),
    inspectionA: randomUUID(),
    evidenceA: randomUUID(),
    formula: randomUUID(),
    formulaVersion: randomUUID(),
    calculationRun: randomUUID(),
    calculationInput: randomUUID(),
    integrityDecision: randomUUID(),
    report: randomUUID(),
    ndtMeasurement: randomUUID(),
    extractionJob: randomUUID(),
    extractionField: randomUUID(),
    stagingRecord: randomUUID(),
    dataQualityCheck: randomUUID()
  };
}

function demoHeaders(input: {
  roles: string;
  userId: string;
  email: string;
  tenantId: string;
  tenantSlug?: string;
}): Record<string, string> {
  return {
    'x-aim-demo-roles': input.roles,
    'x-aim-demo-user-id': input.userId,
    'x-aim-demo-email': input.email,
    'x-aim-demo-full-name': 'Live DB Governance Smoke User',
    'x-aim-demo-tenant-id': input.tenantId,
    'x-aim-demo-tenant-slug': input.tenantSlug ?? `live-${input.tenantId.slice(0, 8)}`,
    'x-aim-demo-tenant-name': 'Live DB Governance Smoke Tenant'
  };
}

function valuesFromFixtures(fixtures: FixtureIds[], selector: (ids: FixtureIds) => string[]): string[] {
  return fixtures.flatMap(selector);
}

async function withReportLockTriggersDisabled(work: () => Promise<void>): Promise<void> {
  try {
    await pool.query('alter table reports disable trigger trg_prevent_locked_report_update');
    await pool.query('alter table reports disable trigger trg_prevent_locked_report_delete');
    await work();
  } finally {
    await pool.query('alter table reports enable trigger trg_prevent_locked_report_update').catch(() => undefined);
    await pool.query('alter table reports enable trigger trg_prevent_locked_report_delete').catch(() => undefined);
  }
}

async function cleanupFixtures(fixtures: FixtureIds[]): Promise<void> {
  if (fixtures.length === 0 || !pool) return;

  const reportIds = valuesFromFixtures(fixtures, (ids) => [ids.report]);
  const stagingIds = valuesFromFixtures(fixtures, (ids) => [ids.stagingRecord]);
  const fieldIds = valuesFromFixtures(fixtures, (ids) => [ids.extractionField]);
  const jobIds = valuesFromFixtures(fixtures, (ids) => [ids.extractionJob]);
  const decisionIds = valuesFromFixtures(fixtures, (ids) => [ids.integrityDecision]);
  const calculationInputIds = valuesFromFixtures(fixtures, (ids) => [ids.calculationInput]);
  const calculationRunIds = valuesFromFixtures(fixtures, (ids) => [ids.calculationRun]);
  const formulaVersionIds = valuesFromFixtures(fixtures, (ids) => [ids.formulaVersion]);
  const formulaIds = valuesFromFixtures(fixtures, (ids) => [ids.formula]);
  const ndtIds = valuesFromFixtures(fixtures, (ids) => [ids.ndtMeasurement]);
  const evidenceIds = valuesFromFixtures(fixtures, (ids) => [ids.evidenceA]);
  const inspectionIds = valuesFromFixtures(fixtures, (ids) => [ids.inspectionA]);
  const assetIds = valuesFromFixtures(fixtures, (ids) => [ids.assetA, ids.assetB]);
  const userIds = valuesFromFixtures(fixtures, (ids) => [ids.reviewer, ids.promoter, ids.approver, ids.aiActor]);
  const tenantIds = valuesFromFixtures(fixtures, (ids) => [ids.tenantA, ids.tenantB]);

  await withReportLockTriggersDisabled(async () => {
    await pool.query('delete from report_exports where report_id = any($1::uuid[])', [reportIds]);
    await pool.query('delete from report_versions where report_id = any($1::uuid[])', [reportIds]);
    await pool.query('delete from review_gates where entity_id = any($1::uuid[]) or entity_id = any($2::uuid[]) or entity_id = any($3::uuid[])', [reportIds, stagingIds, calculationRunIds]);
    await pool.query('delete from error_logs where related_entity_id = any($1::uuid[]) or related_entity_id = any($2::uuid[]) or tenant_id = any($3::uuid[])', [reportIds, calculationRunIds, tenantIds]);
    await pool.query('delete from audit_logs where entity_id = any($1::uuid[]) or entity_id = any($2::uuid[]) or tenant_id = any($3::uuid[])', [reportIds, stagingIds, tenantIds]);
    await pool.query('delete from evidence_links where evidence_file_id = any($1::uuid[]) or linked_entity_id = any($2::uuid[]) or linked_entity_id = any($3::uuid[]) or linked_entity_id = any($4::uuid[]) or linked_entity_id = any($5::uuid[])', [evidenceIds, reportIds, calculationRunIds, calculationInputIds, decisionIds]);
    await pool.query('delete from data_quality_checks where id = any($1::uuid[]) or staging_record_id = any($2::uuid[])', [valuesFromFixtures(fixtures, (ids) => [ids.dataQualityCheck]), stagingIds]);
    await pool.query('delete from manual_overrides where staging_record_id = any($1::uuid[]) or extraction_field_id = any($2::uuid[])', [stagingIds, fieldIds]);
    await pool.query('delete from staging_records where id = any($1::uuid[])', [stagingIds]);
    await pool.query('delete from extraction_fields where id = any($1::uuid[])', [fieldIds]);
    await pool.query('delete from extraction_jobs where id = any($1::uuid[])', [jobIds]);
    await pool.query('delete from reports where id = any($1::uuid[])', [reportIds]);
    await pool.query('delete from integrity_decisions where id = any($1::uuid[])', [decisionIds]);
    await pool.query('delete from calculation_inputs where id = any($1::uuid[])', [calculationInputIds]);
    await pool.query('delete from calculation_outputs where calculation_run_id = any($1::uuid[])', [calculationRunIds]);
    await pool.query('delete from calculation_runs where id = any($1::uuid[])', [calculationRunIds]);
    await pool.query('delete from formula_versions where id = any($1::uuid[])', [formulaVersionIds]);
    await pool.query('delete from formula_registry where id = any($1::uuid[])', [formulaIds]);
    await pool.query('delete from ndt_measurements where id = any($1::uuid[])', [ndtIds]);
    await pool.query('delete from evidence_files where id = any($1::uuid[])', [evidenceIds]);
    await pool.query('delete from inspection_events where id = any($1::uuid[])', [inspectionIds]);
    await pool.query('delete from assets where id = any($1::uuid[])', [assetIds]);
    await pool.query('delete from user_tenant_memberships where user_id = any($1::uuid[]) or tenant_id = any($2::uuid[])', [userIds, tenantIds]);
    await pool.query('delete from users where id = any($1::uuid[])', [userIds]);
    await pool.query('delete from tenants where id = any($1::uuid[])', [tenantIds]);
  });
}

async function seedBaseFixture(ids: FixtureIds): Promise<void> {
  await cleanupFixtures([ids]);
  activeFixtures.push(ids);

  await pool.query(
    `insert into tenants(id, tenant_code, tenant_slug, tenant_name, status, metadata)
     values
       ($1::uuid, $3, $4, $5, 'active', $6::jsonb),
       ($2::uuid, $7, $8, $9, 'active', $6::jsonb)`,
    [
      ids.tenantA,
      ids.tenantB,
      `LIVE-A-${ids.runKey}`,
      `live-a-${ids.runKey}`,
      `Live Smoke Tenant A ${ids.runKey}`,
      JSON.stringify({ live_db_smoke_test: true }),
      `LIVE-B-${ids.runKey}`,
      `live-b-${ids.runKey}`,
      `Live Smoke Tenant B ${ids.runKey}`
    ]
  );

  await pool.query(
    `insert into users(id, email, full_name, password_hash, status, default_tenant_id)
     values
       ($1::uuid, $5, 'Live Smoke Reviewer', 'not-used-in-demo-auth', 'active', $9::uuid),
       ($2::uuid, $6, 'Live Smoke Promoter', 'not-used-in-demo-auth', 'active', $9::uuid),
       ($3::uuid, $7, 'Live Smoke Approver', 'not-used-in-demo-auth', 'active', $9::uuid),
       ($4::uuid, $8, 'Live Smoke AI Actor', 'not-used-in-demo-auth', 'active', $9::uuid)`,
    [
      ids.reviewer,
      ids.promoter,
      ids.approver,
      ids.aiActor,
      `reviewer.${ids.runKey}@aim.local`,
      `promoter.${ids.runKey}@aim.local`,
      `approver.${ids.runKey}@aim.local`,
      `ai-agent.${ids.runKey}@aim.local`,
      ids.tenantA
    ]
  );

  await pool.query(
    `insert into user_tenant_memberships(user_id, tenant_id, status, is_default)
     values
       ($1::uuid, $5::uuid, 'active', true),
       ($2::uuid, $5::uuid, 'active', true),
       ($3::uuid, $5::uuid, 'active', true),
       ($4::uuid, $5::uuid, 'active', true),
       ($1::uuid, $6::uuid, 'active', false),
       ($2::uuid, $6::uuid, 'active', false),
       ($3::uuid, $6::uuid, 'active', false),
       ($4::uuid, $6::uuid, 'active', false)`,
    [ids.reviewer, ids.promoter, ids.approver, ids.aiActor, ids.tenantA, ids.tenantB]
  );

  await pool.query(
    `insert into assets(id, tenant_id, asset_tag, asset_name, asset_type, facility, area, service_fluid, status, owner_user_id)
     values
       ($1::uuid, $3::uuid, $5, $6, 'aboveground_storage_tank', 'Live Smoke Facility', 'Tank Farm', 'Diesel', 'approved', $9::uuid),
       ($2::uuid, $4::uuid, $7, $8, 'aboveground_storage_tank', 'Live Smoke Facility B', 'Tank Farm B', 'Diesel', 'approved', $9::uuid)`,
    [
      ids.assetA,
      ids.assetB,
      ids.tenantA,
      ids.tenantB,
      `LIVE-TANK-A-${ids.runKey}`,
      `Live Tank A ${ids.runKey}`,
      `LIVE-TANK-B-${ids.runKey}`,
      `Live Tank B ${ids.runKey}`,
      ids.promoter
    ]
  );

  await pool.query(
    `insert into inspection_events(id, tenant_id, asset_id, inspection_code, inspection_type, inspection_date, inspector_user_id, status)
     values ($1::uuid, $2::uuid, $3::uuid, $4, 'external', '2026-07-01', $5::uuid, 'approved')`,
    [ids.inspectionA, ids.tenantA, ids.assetA, `LIVE-INSP-${ids.runKey}`, ids.reviewer]
  );
}

async function insertVerifiedEvidence(ids: FixtureIds, tenantId = ids.tenantA): Promise<void> {
  await pool.query(
    `insert into evidence_files(
       id, tenant_id, evidence_code, asset_id, inspection_event_id, object_storage_uri, object_storage_path,
       storage_bucket, object_key, original_filename, file_name, file_extension, file_type, mime_type,
       file_size_bytes, size_bytes, checksum_sha256, checksum, method, component, inspection_date,
       uploaded_by, status, evidence_status, upload_status, uploaded_at, completed_at
     ) values (
       $1::uuid, $2::uuid, $3, $4::uuid, $5::uuid, $6, $6, 'aim-evidence-local', $7, $8, $8,
       '.pdf', 'PDF', 'application/pdf', 4096, 4096, $9, $9, 'UT_THICKNESS', 'SHELL_COURSE_1',
       '2026-07-01', $10::uuid, 'active', 'active', 'verified', now(), now()
     )`,
    [
      ids.evidenceA,
      tenantId,
      `EVD-2026-${ids.runKey}`,
      tenantId === ids.tenantA ? ids.assetA : ids.assetB,
      tenantId === ids.tenantA ? ids.inspectionA : null,
      `/evidence/live-smoke/${ids.runKey}/source.pdf`,
      `evidence/live-smoke/${ids.runKey}/source.pdf`,
      `source-${ids.runKey}.pdf`,
      SHA256,
      ids.reviewer
    ]
  );
}

async function seedPromotionFixture(ids: FixtureIds, options: {
  tenantId?: string;
  hasEvidence?: boolean;
  reviewStatus?: string;
  fieldStatus?: string;
  targetTable?: string;
  targetColumn?: string;
  hasBlockingDataQualityCheck?: boolean;
} = {}): Promise<void> {
  const tenantId = options.tenantId ?? ids.tenantA;
  const assetId = tenantId === ids.tenantA ? ids.assetA : ids.assetB;
  const hasEvidence = options.hasEvidence ?? true;
  if (hasEvidence) await insertVerifiedEvidence(ids, tenantId);

  await pool.query(
    `insert into ndt_measurements(
       id, tenant_id, measurement_code, asset_id, inspection_event_id, component,
       shell_course_no, measured_thickness_mm, reading_date, method, evidence_file_id,
       reviewer_status, validation_status, created_by
     ) values ($1::uuid, $2::uuid, $3, $4::uuid, $5::uuid, 'SHELL_COURSE_1', 1, 5.000, '2026-07-01', 'UT', $6::uuid, 'reviewed', 'valid', $7::uuid)`,
    [ids.ndtMeasurement, tenantId, `LIVE-NDT-${ids.runKey}`, assetId, tenantId === ids.tenantA ? ids.inspectionA : null, hasEvidence ? ids.evidenceA : null, ids.reviewer]
  );

  await pool.query(
    `insert into extraction_jobs(
       id, extraction_job_code, asset_id, inspection_event_id, source_evidence_file_id,
       schema_name, schema_version, extraction_purpose, status, created_by, metadata_json, started_at, completed_at
     ) values ($1::uuid, $2, $3::uuid, $4::uuid, $5::uuid, 'ut_thickness', '1.0.0', 'live_db_smoke', 'completed', $6::uuid, $7::jsonb, now(), now())`,
    [ids.extractionJob, `LIVE-EXJ-${ids.runKey}`, assetId, tenantId === ids.tenantA ? ids.inspectionA : null, hasEvidence ? ids.evidenceA : null, ids.reviewer, JSON.stringify({ live_db_smoke_test: true })]
  );

  await pool.query(
    `insert into extraction_fields(
       id, extraction_job_id, field_path, field_name, extracted_value, normalized_value, unit,
       source_reference_json, confidence_score, field_status, review_required, validation_flags,
       reviewer_id, reviewed_at
     ) values ($1::uuid, $2::uuid, 'shell.course_1.measured_thickness_mm', 'measured_thickness_mm', '7.200', '7.200', 'mm', $3::jsonb, 0.9600, $4, true, '{}', $5::uuid, now())`,
    [
      ids.extractionField,
      ids.extractionJob,
      JSON.stringify(hasEvidence ? { evidence_file_id: ids.evidenceA, page: 1, table: 'UT readings' } : { page: 1, table: 'UT readings' }),
      options.fieldStatus ?? 'approved_by_engineer',
      ids.reviewer
    ]
  );

  await pool.query(
    `insert into staging_records(
       id, extraction_job_id, extraction_field_id, target_entity_type, target_entity_id,
       target_table, target_column, proposed_value, normalized_value, unit, review_status,
       promotion_status, reviewer_id, reviewed_at, created_by, metadata_json
     ) values ($1::uuid, $2::uuid, $3::uuid, 'ndt_measurement', $4::uuid, $5, $6, '7.200', '7.200', 'mm', $7, 'not_promoted', $8::uuid, now(), $8::uuid, $9::jsonb)`,
    [
      ids.stagingRecord,
      ids.extractionJob,
      ids.extractionField,
      ids.ndtMeasurement,
      options.targetTable ?? 'ndt_measurements',
      options.targetColumn ?? 'measured_thickness_mm',
      options.reviewStatus ?? 'approved_for_promotion',
      ids.reviewer,
      JSON.stringify({ live_db_smoke_test: true })
    ]
  );

  if (options.hasBlockingDataQualityCheck) {
    await pool.query(
      `insert into data_quality_checks(
         id, extraction_job_id, extraction_field_id, staging_record_id, check_code,
         severity, check_status, message, is_blocking
       ) values ($1::uuid, $2::uuid, $3::uuid, $4::uuid, 'MISSING_EVIDENCE_REFERENCE', 'critical', 'failed', 'Live DB smoke blocking validation flag.', true)`,
      [ids.dataQualityCheck, ids.extractionJob, ids.extractionField, ids.stagingRecord]
    );
  }
}

async function seedReportFixture(ids: FixtureIds, options: {
  tenantId?: string;
  calculationInputHasEvidence?: boolean;
} = {}): Promise<void> {
  const tenantId = options.tenantId ?? ids.tenantA;
  const assetId = tenantId === ids.tenantA ? ids.assetA : ids.assetB;
  const calculationInputHasEvidence = options.calculationInputHasEvidence ?? true;

  await insertVerifiedEvidence(ids, tenantId);

  await pool.query(
    `insert into formula_registry(id, formula_code, formula_name, code_basis, formula_expression_source, version, status, approver_id, approved_at, created_by)
     values ($1::uuid, $2, 'Live DB Smoke Formula', 'approved_fixture_only', 'approved_formula_registry_or_fixture_only', '1.0.0', 'approved', $3::uuid, now(), $4::uuid)`,
    [ids.formula, `LIVE-FORMULA-${ids.runKey}`, ids.approver, ids.reviewer]
  );

  await pool.query(
    `insert into formula_versions(id, formula_registry_id, formula_code, formula_name, version, formula_status, deterministic_flag, formula_expression_source, approved_by, approved_at, created_by)
     values ($1::uuid, $2::uuid, $3, 'Live DB Smoke Formula', '1.0.0', 'approved', true, 'approved_formula_registry_or_fixture_only', $4::uuid, now(), $5::uuid)`,
    [ids.formulaVersion, ids.formula, `LIVE-FORMULA-${ids.runKey}`, ids.approver, ids.reviewer]
  );

  await pool.query(
    `insert into calculation_runs(
       id, tenant_id, asset_id, inspection_event_id, formula_registry_id, formula_version_id,
       run_version, status, run_id, run_status, validation_status, review_status, approval_status,
       final_use_status, input_snapshot_hash, input_snapshot_json, unit_normalized_input_json,
       validation_result_json, warnings_json, output_summary, formula_version_snapshot_json,
       output_snapshot_json, output_snapshot_hash, reviewer_id, approver_id, reviewed_at, approved_at, created_by, initiated_by
     ) values (
       $1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, $6::uuid,
       1, 'approved', $7, 'completed', 'valid', 'approved', 'approved',
       'approved_for_final_use', $8, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, '[]'::jsonb, '{}'::jsonb,
       '{}'::jsonb, '{}'::jsonb, $8, $9::uuid, $10::uuid, now(), now(), $9::uuid, $9::uuid
     )`,
    [ids.calculationRun, tenantId, assetId, tenantId === ids.tenantA ? ids.inspectionA : null, ids.formula, ids.formulaVersion, `LIVE-CALC-${ids.runKey}`, SHA256, ids.reviewer, ids.approver]
  );

  await pool.query(
    `insert into calculation_inputs(
       id, calculation_run_id, input_name, raw_value, normalized_value, raw_unit,
       normalized_unit, source_entity_type, source_entity_id, evidence_file_id, validation_status
     ) values ($1::uuid, $2::uuid, 'current_thickness_mm', '7.2', 7.2, 'mm', 'mm', 'evidence_file', $3::uuid, $4::uuid, 'valid')`,
    [ids.calculationInput, ids.calculationRun, ids.evidenceA, calculationInputHasEvidence ? ids.evidenceA : null]
  );

  await pool.query(
    `insert into integrity_decisions(
       id, tenant_id, decision_code, asset_id, inspection_event_id, calculation_run_id,
       decision_type, integrity_status, decision_status, decision_summary,
       created_by, reviewed_by, approved_by, reviewed_at, approved_at
     ) values ($1::uuid, $2::uuid, $3, $4::uuid, $5::uuid, $6::uuid,
       'tank_integrity', 'acceptable', 'approved', 'Live DB smoke approved integrity decision.',
       $7::uuid, $7::uuid, $8::uuid, now(), now())`,
    [ids.integrityDecision, tenantId, `LIVE-DEC-${ids.runKey}`, assetId, tenantId === ids.tenantA ? ids.inspectionA : null, ids.calculationRun, ids.reviewer, ids.approver]
  );

  await pool.query(
    `insert into reports(
       id, tenant_id, report_code, report_title, report_type, report_status, report_version,
       asset_id, calculation_run_id, template_code, format_requested, content_hash,
       traceability_json, sections_json, evidence_register_json, validation_warnings_json,
       limitations_json, generated_by, reviewed_by, approved_by, reviewed_at, approved_at
     ) values ($1::uuid, $2::uuid, $3, $4, 'tank_integrity', 'approved', 1,
       $5::uuid, $6::uuid, 'tank-integrity-mvp-v1', '["pdf"]'::jsonb, $7,
       $8::jsonb, $9::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, $10::uuid, $10::uuid, $11::uuid, now(), now())`,
    [
      ids.report,
      tenantId,
      `LIVE-RPT-${ids.runKey}`,
      `Live DB Smoke Report ${ids.runKey}`,
      assetId,
      ids.calculationRun,
      SHA256,
      JSON.stringify({ calculation_run_id: ids.calculationRun, live_db_smoke_test: true }),
      JSON.stringify([{ title: 'Summary', body: ['Live DB smoke report ready.'] }]),
      ids.reviewer,
      ids.approver
    ]
  );

  for (const [entityType, entityId] of [
    ['report', ids.report],
    ['calculation_run', ids.calculationRun],
    ['integrity_decision', ids.integrityDecision]
  ] as const) {
    await pool.query(
      `insert into evidence_links(evidence_file_id, linked_entity_type, linked_entity_id, link_reason, linked_by)
       values ($1::uuid, $2, $3::uuid, 'Live DB smoke verified evidence gate.', $4::uuid)`,
      [ids.evidenceA, entityType, entityId, ids.reviewer]
    );
  }
}

beforeAll(async () => {
  Object.assign(process.env, LIVE_SMOKE_ENV);
  const appModule = await import('../src/app.js');
  const dbModule = await import('../src/db/client.js');
  app = appModule.createApp();
  pool = dbModule.pool;
  await pool.query('select 1');
});

afterEach(async () => {
  const fixturesToClean = [...activeFixtures];
  activeFixtures = [];
  await cleanupFixtures(fixturesToClean);
});

afterAll(async () => {
  await cleanupFixtures(activeFixtures);
  await pool?.end();
});

describe('source-of-truth live DB AI staging promotion governance smoke', () => {
  it('allows a human engineer to promote reviewed staging through the allowlist and persists audit/source snapshot', async () => {
    const ids = makeIds();
    await seedBaseFixture(ids);
    await seedPromotionFixture(ids);

    await request(app)
      .post(`/api/v1/staging-records/${ids.stagingRecord}/promote`)
      .set(demoHeaders({ roles: 'engineer', userId: ids.promoter, email: `promoter.${ids.runKey}@aim.local`, tenantId: ids.tenantA }))
      .send({ comment: 'Independent human engineer verified evidence and promotion gates.' })
      .expect(200)
      .expect((res) => {
        expect(res.body.data.final_table_mutation).toBe(true);
        expect(res.body.data.final_promotion_result).toMatchObject({
          final_table: 'ndt_measurements',
          final_record_id: ids.ndtMeasurement,
          final_column: 'measured_thickness_mm',
          operation: 'update',
          evidence_file_id: ids.evidenceA
        });
      });

    const finalRow = await pool.query<DbRow>('select measured_thickness_mm, evidence_file_id, extraction_source, reviewer_status, validation_status from ndt_measurements where id = $1::uuid', [ids.ndtMeasurement]);
    expect(Number(finalRow.rows[0]?.measured_thickness_mm)).toBeCloseTo(7.2);
    expect(finalRow.rows[0]).toMatchObject({
      evidence_file_id: ids.evidenceA,
      extraction_source: 'ai_staging',
      reviewer_status: 'reviewed',
      validation_status: 'valid'
    });

    const staging = await pool.query<DbRow>('select review_status, promotion_status, metadata_json from staging_records where id = $1::uuid', [ids.stagingRecord]);
    expect(staging.rows[0]).toMatchObject({ review_status: 'promoted', promotion_status: 'promoted' });
    expect(staging.rows[0]?.metadata_json).toMatchObject({
      final_table_mutation: true,
      immutable_source_snapshot: {
        source: 'ai_staging_promotion',
        ai_original_value: '7.200',
        reviewed_value: '7.200',
        reviewer_id: ids.reviewer,
        promoted_by: ids.promoter,
        evidence_file_id: ids.evidenceA,
        target_table: 'ndt_measurements',
        target_column: 'measured_thickness_mm'
      }
    });

    const audit = await pool.query<DbRow>(
      `select event_type, metadata_json from audit_logs
       where entity_type = 'staging_record' and entity_id = $1::uuid and event_type = 'AI_STAGING_PROMOTED'`,
      [ids.stagingRecord]
    );
    expect(audit.rowCount).toBe(1);
    expect(audit.rows[0]?.metadata_json).toMatchObject({
      final_table_mutation: true,
      immutable_source_snapshot: {
        extraction_job_id: ids.extractionJob,
        extraction_field_id: ids.extractionField,
        staging_record_id: ids.stagingRecord,
        target_table: 'ndt_measurements',
        target_column: 'measured_thickness_mm'
      }
    });
  });

  it('blocks AI/service actors and cross-tenant staging promotion against the live DB', async () => {
    const ids = makeIds();
    await seedBaseFixture(ids);
    await seedPromotionFixture(ids, { tenantId: ids.tenantB });

    await request(app)
      .post(`/api/v1/staging-records/${ids.stagingRecord}/promote`)
      .set(demoHeaders({ roles: 'engineer,ai_agent', userId: ids.aiActor, email: `ai-agent.${ids.runKey}@aim.local`, tenantId: ids.tenantB }))
      .send({ comment: 'This service-like actor must not be allowed to promote.' })
      .expect(403)
      .expect((res) => {
        expect(res.body.error.code).toBe('AI_SERVICE_ACTOR_BLOCKED');
      });

    await request(app)
      .post(`/api/v1/staging-records/${ids.stagingRecord}/promote`)
      .set(demoHeaders({ roles: 'engineer', userId: ids.promoter, email: `promoter.${ids.runKey}@aim.local`, tenantId: ids.tenantA }))
      .send({ comment: 'Tenant A must not promote a Tenant B staging record.' })
      .expect(404)
      .expect((res) => {
        expect(res.body.error.code).toBe('STAGING_RECORD_NOT_FOUND');
      });
  });

  it('fails closed for unreviewed fields, missing evidence, critical validation flags, unsupported tables, and unsupported columns', async () => {
    const cases: Array<{
      name: string;
      options: Parameters<typeof seedPromotionFixture>[1];
      expectedStatus: number;
      expectedCode: string;
      responsePath?: 'gate' | 'direct';
    }> = [
      { name: 'unreviewed-field', options: { reviewStatus: 'pending_review', fieldStatus: 'needs_review' }, expectedStatus: 409, expectedCode: 'PROMOTION_GATE_FAILED', responsePath: 'gate' },
      { name: 'missing-evidence', options: { hasEvidence: false }, expectedStatus: 409, expectedCode: 'PROMOTION_GATE_FAILED', responsePath: 'gate' },
      { name: 'critical-validation', options: { hasBlockingDataQualityCheck: true }, expectedStatus: 409, expectedCode: 'PROMOTION_GATE_FAILED', responsePath: 'gate' },
      { name: 'unsupported-table', options: { targetTable: 'unsafe_ai_target_table' }, expectedStatus: 422, expectedCode: 'unsupported_promotion_target', responsePath: 'direct' },
      { name: 'unsupported-column', options: { targetColumn: 'unsafe_column' }, expectedStatus: 422, expectedCode: 'unsupported_promotion_target', responsePath: 'direct' }
    ];

    for (const testCase of cases) {
      const ids = makeIds();
      await seedBaseFixture(ids);
      await seedPromotionFixture(ids, testCase.options);

      await request(app)
        .post(`/api/v1/staging-records/${ids.stagingRecord}/promote`)
        .set(demoHeaders({ roles: 'engineer', userId: ids.promoter, email: `promoter.${ids.runKey}@aim.local`, tenantId: ids.tenantA }))
        .send({ comment: `Live DB smoke ${testCase.name} should fail closed.` })
        .expect(testCase.expectedStatus)
        .expect((res) => {
          expect(res.body.error.code).toBe(testCase.expectedCode);
          if (testCase.responsePath === 'gate') {
            expect(JSON.stringify(res.body.error.promotion_gate_results)).toContain('blocked');
          }
        });

      const finalRow = await pool.query<DbRow>('select measured_thickness_mm, extraction_source from ndt_measurements where id = $1::uuid', [ids.ndtMeasurement]);
      expect(Number(finalRow.rows[0]?.measured_thickness_mm)).toBeCloseTo(5.0);
      expect(finalRow.rows[0]?.extraction_source).toBe('manual');
    }
  });
});

describe('source-of-truth live DB report issue calculation-input evidence smoke', () => {
  it('blocks report issue when calculation inputs exist but lack evidence and returns calculation_input gate details', async () => {
    const ids = makeIds();
    await seedBaseFixture(ids);
    await seedReportFixture(ids, { calculationInputHasEvidence: false });

    await request(app)
      .post(`/api/v1/reports/${ids.report}/issue`)
      .set(demoHeaders({ roles: 'approver', userId: ids.approver, email: `approver.${ids.runKey}@aim.local`, tenantId: ids.tenantA }))
      .send({ issue_comment: 'Approver issue review after live DB gate verification.' })
      .expect(409)
      .expect((res) => {
        expect(res.body.error.code).toBe('REPORT_GATES_NOT_SATISFIED');
        const gates = res.body.error.gates as Array<{ gate_type: string; metadata?: Record<string, unknown> }>;
        const evidenceGate = gates.find((gateItem) => gateItem.gate_type === 'evidence_linked');
        expect(evidenceGate?.metadata).toMatchObject({
          calculation_input_evidence_count: 0,
          calculation_input_total_count: 1,
          calculation_input_evidence_complete: false
        });
        expect(evidenceGate?.metadata?.missing_required_evidence).toContain('calculation_input');
      });
  });

  it('issues report only when calculation-input evidence and all other live DB gates pass', async () => {
    const ids = makeIds();
    await seedBaseFixture(ids);
    await seedReportFixture(ids, { calculationInputHasEvidence: true });

    await request(app)
      .post(`/api/v1/reports/${ids.report}/issue`)
      .set(demoHeaders({ roles: 'approver', userId: ids.approver, email: `approver.${ids.runKey}@aim.local`, tenantId: ids.tenantA }))
      .send({ issue_comment: 'Approver issue review after live DB gate verification.' })
      .expect(200)
      .expect((res) => {
        expect(res.body.data.report_status).toBe('issued');
      });

    const audit = await pool.query<DbRow>(
      `select metadata_json from audit_logs
       where entity_type = 'report' and entity_id = $1::uuid and event_type = 'REPORT_ISSUED'`,
      [ids.report]
    );
    expect(audit.rowCount).toBe(1);
    expect(JSON.stringify(audit.rows[0]?.metadata_json)).toContain('calculation_input_evidence_complete');
  });

  it('does not allow Tenant A to issue a Tenant B report', async () => {
    const ids = makeIds();
    await seedBaseFixture(ids);
    await seedReportFixture(ids, { tenantId: ids.tenantB, calculationInputHasEvidence: true });

    await request(app)
      .post(`/api/v1/reports/${ids.report}/issue`)
      .set(demoHeaders({ roles: 'approver', userId: ids.approver, email: `approver.${ids.runKey}@aim.local`, tenantId: ids.tenantA }))
      .send({ issue_comment: 'Tenant A must not issue Tenant B report.' })
      .expect(404)
      .expect((res) => {
        expect(res.body.error.code).toBe('REPORT_NOT_FOUND');
      });
  });
});

describe('source-of-truth live DB evidence upload validator/config smoke', () => {
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
  ])('accepts governed evidence file type %s', async (extension, fileType, mimeType) => {
    const validation = await import('../src/modules/evidence/validation.js');
    const storage = await import('../src/modules/object-storage/evidence-storage.js');

    expect(validation.validateEvidenceUploadPayload({
      asset_id: randomUUID(),
      file_name: `live-db-evidence${extension}`,
      file_type: fileType,
      mime_type: mimeType,
      method: 'UT_THICKNESS',
      component: 'SHELL_COURSE_1',
      inspection_date: '2026-07-01',
      checksum: SHA256,
      file_size_bytes: 4096
    })).toEqual([]);

    expect(() => storage.validateEvidenceObjectRequest({ filename: `live-db-evidence${extension}`, mimeType, sizeBytes: 4096 })).not.toThrow();
  });

  it('rejects unsupported extensions and keeps ZIP checksum/object-storage controls active', async () => {
    const validation = await import('../src/modules/evidence/validation.js');
    const storage = await import('../src/modules/object-storage/evidence-storage.js');

    const unsupportedIssues = validation.validateEvidenceUploadPayload({
      asset_id: randomUUID(),
      file_name: 'unsafe-live-db-smoke.exe',
      file_type: 'EXE',
      mime_type: 'application/octet-stream',
      method: 'UT_THICKNESS',
      component: 'SHELL_COURSE_1',
      inspection_date: '2026-07-01',
      checksum: SHA256,
      file_size_bytes: 4096
    });
    expect(unsupportedIssues.some((issue) => issue.field === 'file_type')).toBe(true);
    expect(() => storage.validateEvidenceObjectRequest({ filename: 'unsafe-live-db-smoke.exe', mimeType: 'application/octet-stream', sizeBytes: 4096 })).toThrow(/File extension is not allowed/);

    const zipWithoutChecksum = validation.validateEvidenceUploadPayload({
      asset_id: randomUUID(),
      file_name: 'controlled-live-db-bundle.zip',
      file_type: 'ZIP',
      mime_type: 'application/zip',
      method: 'UT_THICKNESS',
      component: 'SHELL_COURSE_1',
      inspection_date: '2026-07-01',
      file_size_bytes: 4096
    });
    expect(zipWithoutChecksum.some((issue) => issue.field === 'checksum')).toBe(true);
    expect(() => storage.validateEvidenceObjectRequest({ filename: 'controlled-live-db-bundle.zip', mimeType: 'application/zip', sizeBytes: 0 })).toThrow(/File size exceeds allowed limit/);
  });
});
