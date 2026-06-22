import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { hasPermission } from '../src/rbac/roles.js';
import {
  ENGINEERING_REVIEW_DISCLAIMER,
  hashInputSnapshot,
  runDeterministicCalculation
} from '../src/modules/calculation-engine/deterministic-engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

const reviewedCalculationContext = {
  validation_scope: 'calculation_readiness' as const,
  asset: {
    tank_tag: 'TK-PHASE15',
    code_edition: 'Engineer supplied API edition basis',
    original_design_code: 'API 650'
  },
  geometry: {
    diameter_m: 20,
    shell_height_m: 12
  },
  shell_courses: [
    {
      course_no: 1,
      material_id: 'mat-1',
      joint_efficiency: 1,
      material_allowable_stress_mpa: 150,
      minimum_required_thickness_mm: 8
    }
  ],
  ndt_measurements: [
    {
      measurement_id: 'NDT-2020',
      source_entity_id: '11111111-1111-4111-8111-111111111111',
      component: 'shell',
      shell_course_no: 1,
      cml_tml_id: 'CML-001',
      grid_ref: 'A1',
      measured_thickness: 12,
      measured_thickness_unit: 'mm',
      reading_date: '2020-01-01',
      is_critical: true,
      evidence_file_id: '22222222-2222-4222-8222-222222222222'
    },
    {
      measurement_id: 'NDT-2024',
      source_entity_id: '33333333-3333-4333-8333-333333333333',
      component: 'shell',
      shell_course_no: 1,
      cml_tml_id: 'CML-001',
      grid_ref: 'A1',
      measured_thickness: 10,
      measured_thickness_unit: 'mm',
      reading_date: '2024-01-01',
      is_critical: true,
      evidence_file_id: '44444444-4444-4444-8444-444444444444'
    }
  ],
  evidence_links: [],
  formula_registry: [{ formula_id: 'AIM-UNIVERSAL-THICKNESS-CORROSION-ENGINE', formula_name: 'Thickness engine', status: 'approved' }],
  calculation_request: {
    thickness_check_requested: true,
    retirement_thickness_mm: 8
  },
  thresholds: {
    high_corrosion_rate_mm_per_year: 1,
    low_remaining_life_years: 1
  }
};

describe('Phase 1.5 calculation governance hardening', () => {
  it('requires explicit approved formula version and blocks silent/default formulas in route code', () => {
    const route = readRepoFile('apps/api/src/routes/calculations.ts');
    expect(route).toContain("formula_id is required. Silent/default formula selection is not allowed.");
    expect(route).toContain('APPROVED_FORMULA_VERSION_REQUIRED');
    expect(route).toContain("fv.formula_status in ('approved','locked')");
    expect(route).toContain('no_silent_formula_default');
    expect(route).not.toContain("?? 'AIM-UNIVERSAL-THICKNESS-CORROSION-ENGINE'");
  });

  it('produces deterministic output snapshots and mandatory engineering disclaimer', () => {
    const first = runDeterministicCalculation(reviewedCalculationContext);
    const second = runDeterministicCalculation(JSON.parse(JSON.stringify(reviewedCalculationContext)) as typeof reviewedCalculationContext);

    expect(first.final_use_disclaimer).toBe(ENGINEERING_REVIEW_DISCLAIMER);
    expect(first.final_use_status).toBe('requires_engineering_review');
    expect(first.output_snapshot_hash).toBe(second.output_snapshot_hash);
    expect(hashInputSnapshot(first.normalized_inputs)).toBe(hashInputSnapshot(second.normalized_inputs));
  });

  it('blocks final use when evidence or unit review gates are unresolved', () => {
    const missingEvidence = runDeterministicCalculation({
      ...reviewedCalculationContext,
      ndt_measurements: reviewedCalculationContext.ndt_measurements.map((measurement) => ({
        ...measurement,
        evidence_file_id: null
      }))
    });
    const unitMismatch = runDeterministicCalculation({
      ...reviewedCalculationContext,
      ndt_measurements: reviewedCalculationContext.ndt_measurements.map((measurement) => ({
        ...measurement,
        measured_thickness: measurement.measured_thickness / 25.4,
        measured_thickness_unit: 'inch'
      }))
    });

    expect(missingEvidence.final_use_status).toBe('blocked');
    expect(missingEvidence.final_use_blockers).toContain('MISSING_EVIDENCE');
    expect(unitMismatch.final_use_status).toBe('blocked');
    expect(unitMismatch.final_use_blockers).toContain('UNIT_REVIEW_REQUIRED');
  });

  it('persists formula, input, output, warning, evidence, and final-use governance snapshots', () => {
    const route = readRepoFile('apps/api/src/routes/calculations.ts');
    const migration = readRepoFile('db/migrations/0015_phase1_5_calculation_governance_hardening.sql');

    for (const token of [
      'formula_version_snapshot_json',
      'input_snapshot_json',
      'output_snapshot_json',
      'warnings_json',
      'final_use_blockers_json',
      'output_snapshot_hash',
      'Engineering review required before final use.'
    ]) {
      expect(route + migration).toContain(token);
    }
  });

  it('writes calculation audit events and blocks approval final use gates', () => {
    const route = readRepoFile('apps/api/src/routes/calculations.ts');
    const approvals = readRepoFile('apps/api/src/routes/engineering-reviews.ts');

    for (const eventType of [
      'calculation.run_requested',
      'calculation.completed',
      'calculation.failed',
      'calculation.warning_raised',
      'calculation.final_use_blocked',
      'calculation.reviewed',
      'calculation.approved',
      'calculation.rejected'
    ]) {
      expect(route + approvals).toContain(eventType);
    }

    expect(approvals).toContain('validateCalculationApprovalGate');
    expect(approvals).toContain('CALCULATION_FINAL_USE_GATE_BLOCKED');
    expect(approvals).toContain('SEGREGATION_OF_DUTY_BLOCKED');
    expect(approvals).toContain('APPROVAL_COMMENT_REQUIRED');
  });

  it('keeps RBAC aligned and leaves ai_agent unable to run or approve calculations', () => {
    expect(hasPermission(['engineer'], 'calculation.run')).toBe(true);
    expect(hasPermission(['engineer'], 'calculation.review')).toBe(true);
    expect(hasPermission(['lead_engineer'], 'calculation.approve')).toBe(true);
    expect(hasPermission(['ai_agent'], 'calculation.run')).toBe(false);
    expect(hasPermission(['ai_agent'], 'calculation.approve')).toBe(false);
  });

  it('keeps OpenAPI contract aligned without claiming out-of-scope implementations', () => {
    const openapi = readRepoFile('04_API/openapi.yaml');
    const calculationSection = openapi.slice(openapi.indexOf('/api/v1/engineering/calculate:'));

    expect(calculationSection).toContain('x-permission-required: calculation.run');
    expect(calculationSection).toContain('x-human-review-required: true');
    expect(calculationSection).toContain('x-evidence-link-required: true');
    expect(calculationSection).toContain('formula_version_snapshot');
    expect(calculationSection).toContain('Engineering review required before final use.');
    expect(openapi).not.toMatch(/quantitative API 581 implementation/i);
    expect(openapi).not.toMatch(/full API 579 implementation/i);
    expect(openapi).not.toMatch(/CMMS integration implemented/i);
    expect(openapi).not.toMatch(/3D processing implemented/i);
  });
});
