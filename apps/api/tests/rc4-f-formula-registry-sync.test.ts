import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { hasPermission } from '../src/rbac/roles.js';
import {
  assertFormulaRegistryRecordCanSync,
  assertFormulaVersionIsExecutable,
  syncApprovedFormulaRegistryToExecutable
} from '../src/modules/formula-registry/executable-sync.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function expectFile(relativePath: string): string {
  const absolutePath = path.join(repoRoot, relativePath);
  expect(fs.existsSync(absolutePath), `${relativePath} should exist`).toBe(true);
  return fs.readFileSync(absolutePath, 'utf8');
}

type Row = Record<string, unknown>;

class FormulaVersionStore {
  rows: Row[] = [];

  async query<T extends Row = Row>(text: string, values: unknown[] = []): Promise<{ rows: T[]; rowCount: number }> {
    if (text.includes('select * from formula_versions')) {
      const registryId = String(values[0] ?? '');
      const code = String(values[1] ?? '');
      const version = String(values[2] ?? '');
      const row = this.rows.find((item) => item.formula_registry_id === registryId || (item.formula_code === code && item.version === version));
      return { rows: (row ? [row] : []) as T[], rowCount: row ? 1 : 0 };
    }

    if (text.includes('insert into formula_versions')) {
      const row: Row = {
        id: '55555555-5555-4555-8555-555555555555',
        formula_registry_id: values[0],
        formula_code: values[1],
        formula_name: values[2],
        version: values[3],
        formula_status: values[4],
        deterministic_flag: values[5],
        formula_expression_source: values[6],
        input_schema: JSON.parse(String(values[7] ?? '{}')),
        output_schema: JSON.parse(String(values[8] ?? '{}')),
        unit_rules: JSON.parse(String(values[9] ?? '{}')),
        validation_rules: JSON.parse(String(values[10] ?? '{}')),
        approved_by: values[11],
        approved_at: '2026-06-28T00:00:00.000Z',
        created_by: values[13],
        created_at: '2026-06-28T00:00:00.000Z',
        updated_at: '2026-06-28T00:00:00.000Z'
      };
      this.rows.push(row);
      return { rows: [row] as T[], rowCount: 1 };
    }

    if (text.includes('update formula_versions')) {
      const registryId = String(values[0] ?? '');
      const code = String(values[1] ?? '');
      const version = String(values[3] ?? '');
      const row = this.rows.find((item) => item.formula_registry_id === registryId && item.formula_code === code && item.version === version);
      if (!row) return { rows: [], rowCount: 0 };
      row.formula_name = values[2];
      row.formula_status = values[4];
      row.deterministic_flag = values[5];
      row.formula_expression_source = values[6];
      row.input_schema = JSON.parse(String(values[7] ?? '{}'));
      row.output_schema = JSON.parse(String(values[8] ?? '{}'));
      row.unit_rules = JSON.parse(String(values[9] ?? '{}'));
      row.validation_rules = JSON.parse(String(values[10] ?? '{}'));
      row.approved_by = values[11];
      row.approved_at = '2026-06-28T00:00:00.000Z';
      row.updated_at = '2026-06-28T00:01:00.000Z';
      return { rows: [row] as T[], rowCount: 1 };
    }

    return { rows: [], rowCount: 0 };
  }
}

const approvedRegistryRecord = {
  id: '11111111-1111-4111-8111-111111111111',
  formula_id: 'AIM-INTERNAL-RC4F-FIXTURE',
  formula_code: 'AIM-INTERNAL-RC4F-FIXTURE',
  formula_name: 'Internal RC4-F fixture formula metadata',
  version: '1.0.0',
  status: 'approved',
  formula_expression_source: 'engineer_entered_or_fixture',
  input_schema: { input_value: 'number' },
  output_schema: { output_value: 'number' },
  unit_rules: { input_value: 'unitless' },
  validation_rules: { fixture_only: true },
  approved_by: '22222222-2222-4222-8222-222222222222',
  approval_date: '2026-06-28T00:00:00.000Z'
};

describe('RC4-F Formula Registry synchronization to executable formula_versions', () => {
  it('synchronizes approved Formula Registry records to executable formula_versions idempotently', async () => {
    const store = new FormulaVersionStore();
    const first = await syncApprovedFormulaRegistryToExecutable(store, approvedRegistryRecord, '33333333-3333-4333-8333-333333333333');
    const second = await syncApprovedFormulaRegistryToExecutable(store, approvedRegistryRecord, '33333333-3333-4333-8333-333333333333');

    expect(first.sync_status).toBe('created');
    expect(second.sync_status).toBe('updated');
    expect(store.rows).toHaveLength(1);
    expect(first.formula_version.formula_status).toBe('approved');
    expect(first.formula_version.formula_registry_id).toBe(approvedRegistryRecord.id);
  });

  it('blocks draft, rejected, retired, deprecated, and superseded Formula Registry records from executable sync', () => {
    for (const status of ['draft', 'under_review', 'rejected', 'retired', 'deprecated', 'superseded']) {
      expect(() => assertFormulaRegistryRecordCanSync({ ...approvedRegistryRecord, status }), status).toThrow('cannot be synchronized');
    }
  });

  it('keeps calculation execution guarded by approved synchronized formula_versions', () => {
    expect(() => assertFormulaVersionIsExecutable(undefined)).toThrow('approved synchronized formula_versions');
    expect(() => assertFormulaVersionIsExecutable({ formula_status: 'draft', deterministic_flag: true, status: 'approved' })).toThrow('approved synchronized formula_versions');
    expect(() => assertFormulaVersionIsExecutable({ formula_status: 'approved', deterministic_flag: false, status: 'approved' })).toThrow('approved synchronized formula_versions');
    expect(() => assertFormulaVersionIsExecutable({ formula_status: 'approved', deterministic_flag: true, status: 'retired' })).toThrow('source registry record');
    expect(() => assertFormulaVersionIsExecutable({ formula_status: 'approved', deterministic_flag: true, status: 'approved' })).not.toThrow();
  });

  it('keeps AI, n8n, and service actors unable to approve or sync formulas to executable state', () => {
    expect(hasPermission(['ai_agent'], 'formula.approve')).toBe(false);
    expect(hasPermission(['ai_agent'], 'formula.create')).toBe(false);
    const formulasRoute = readRepoFile('apps/api/src/routes/formulas.ts');
    expect(formulasRoute).toContain('n8n_service');
    expect(formulasRoute).toContain('service_account');
  });

  it('wires approval/sync routes, audit logs, and calculation guardrails without adding formula math', () => {
    const formulasRoute = readRepoFile('apps/api/src/routes/formulas.ts');
    const calculationsRoute = readRepoFile('apps/api/src/routes/calculations.ts');
    const syncModule = readRepoFile('apps/api/src/modules/formula-registry/executable-sync.ts');

    expect(formulasRoute).toContain("post('/formulas/records/:recordId/sync-to-executable'");
    expect(formulasRoute).toContain('syncApprovedFormulaRegistryToExecutable');
    expect(formulasRoute).toContain('FORMULA_APPROVED');
    expect(formulasRoute).toContain('FORMULA_SYNCED_TO_EXECUTABLE');
    expect(formulasRoute).toContain('FORMULA_SYNC_FAILED');
    expect(calculationsRoute).toContain('assertFormulaVersionIsExecutable');
    expect(calculationsRoute).toContain('FORMULA_VERSION_EXECUTION_BLOCKED');
    expect(calculationsRoute).toContain('formula_version_snapshot_json');
    expect(syncModule).not.toMatch(/API\s*579\s*formula/i);
    expect(syncModule).not.toMatch(/API\s*581\s*formula/i);
    expect(syncModule).not.toMatch(/minimum\s+thickness\s*=|remaining\s+life\s*=/i);
  });

  it('documents API, UI sync status, release, UAT, and source-of-truth alignment for RC4-F', () => {
    const openapi = expectFile('04_API/openapi.yaml');
    const formulaListUi = expectFile('apps/web/app/formulas/FormulaRegistryClient.tsx');
    const formulaDetailUi = expectFile('apps/web/app/formulas/[formulaId]/FormulaDetailClient.tsx');
    const readme = expectFile('README.md');
    const sprintStatus = expectFile('docs/sprint-status.md');
    const checklist = expectFile('docs/operations/source_of_truth_alignment_checklist.md');
    const release = expectFile('docs/release/AIM_RC4F_formula_registry_sync_report.md');
    const uat = expectFile('docs/uat/uat_rc4f_formula_registry_sync.md');

    for (const content of [openapi, formulaListUi, formulaDetailUi, readme, sprintStatus, checklist, release, uat]) {
      expect(content).toContain('RC4-F');
      expect(content).not.toMatch(/x-full-api-579-implemented:\s*true/i);
      expect(content).not.toMatch(/x-full-api-581-implemented:\s*true/i);
      expect(content).not.toMatch(/invented API\/ASME formula/i);
    }

    expect(openapi).toContain('/api/v1/formulas/records/{recordId}/sync-to-executable:');
    expect(openapi).toContain('FORMULA_SYNCED_TO_EXECUTABLE|FORMULA_SYNC_FAILED');
    expect(formulaListUi).toContain('sync_status');
    expect(formulaDetailUi).toContain('Sync to Executable');
  });
});
