import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');
const migrationsDir = path.join(repoRoot, 'db/migrations');

describe('Migration reproducibility baseline', () => {
  it('tracks all migrations required for a clean Sprint 6 database setup', () => {
    const files = fs.readdirSync(migrationsDir).filter((file) => file.endsWith('.sql')).sort();
    expect(files).toEqual([
      '0001_baseline.sql',
      '0002_tank_asset_master_data.sql',
      '0003_governance_hardening.sql',
      '0004_evidence_ndt_data_room.sql',
      '0005_engineering_validation_engine.sql',
      '0006_formula_registry_module.sql',
      '0007_deterministic_calculation_engine.sql',
      '0008_ffs_trigger_workflow.sql'
    ]);
  });

  it('keeps Formula Registry source traceability in schema migrations', () => {
    const migration = fs.readFileSync(path.join(migrationsDir, '0006_formula_registry_module.sql'), 'utf8');
    expect(migration).toContain('formula_expression_source');
    expect(migration).toContain('alter table formula_registry alter column formula_expression_source set not null');
  });

  it('keeps deterministic calculation engine free of API formula clauses', () => {
    const migration = fs.readFileSync(path.join(migrationsDir, '0007_deterministic_calculation_engine.sql'), 'utf8');
    expect(migration).toContain('AIM-UNIVERSAL-THICKNESS-CORROSION-ENGINE');
    expect(migration).toContain('NO_API_FORMULA');
  });
});
