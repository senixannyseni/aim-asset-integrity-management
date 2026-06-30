import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('source-of-truth governance completion patch', () => {
  it('promotes AI staging to final tables only through explicit allowlisted mappings', () => {
    const route = readRepoFile('apps/api/src/routes/ai-extraction.ts');
    expect(route).toContain('FINAL_PROMOTION_ALLOWLIST');
    expect(route).toContain('ndt_measurements');
    expect(route).toContain('findings');
    expect(route).toContain('calculation_inputs');
    expect(route).toContain('assets');
    expect(route).toContain('shell_courses');
    expect(route).toContain('promoteReviewedStagingToFinalTable');
    expect(route).toContain('unsupported_promotion_target');
    expect(route).not.toContain('final_table_mutation: false');
  });

  it('blocks promotion unless a human engineer reviewed the field and gates pass', () => {
    const route = readRepoFile('apps/api/src/routes/ai-extraction.ts');
    expect(route).toContain('HUMAN_ENGINEER_ROLE_REQUIRED');
    expect(route).toContain('AI_SERVICE_ACTOR_BLOCKED');
    expect(route).toContain('approved_by_engineer');
    expect(route).toContain('corrected_by_engineer');
    expect(route).toContain('FIELD_ENGINEER_REVIEW_STATUS_REQUIRED');
    expect(route).toContain('VERIFIED_EVIDENCE_LINK_REQUIRED');
    expect(route).toContain('BLOCKING_DATA_QUALITY_CHECKS');
    expect(route).toContain('STAGING_RECORD_ALREADY_PROMOTED');
  });

  it('writes final-table records transactionally with audit and immutable source snapshots', () => {
    const route = readRepoFile('apps/api/src/routes/ai-extraction.ts');
    expect(route).toContain("await client.query('begin')");
    expect(route).toContain("await client.query('commit')");
    expect(route).toContain("await client.query('rollback')");
    expect(route).toContain('immutable_source_snapshot');
    expect(route).toContain('ai_original_value');
    expect(route).toContain('reviewed_value');
    expect(route).toContain('final_promotion_result');
    expect(route).toContain('AI_STAGING_PROMOTED');
    expect(route).toContain('final_table_mutation: true');
  });

  it('preserves tenant isolation for final-table promotion targets', () => {
    const route = readRepoFile('apps/api/src/routes/ai-extraction.ts');
    expect(route).toContain('requireTenantContextFromRequest');
    expect(route).toContain('a.tenant_id = $2::uuid');
    expect(route).toContain('tenant_id = $5::uuid returning');
    expect(route).toContain('cr.tenant_id = $4::uuid');
    expect(route).toContain('assertTargetAssetTenant');
  });

  it('requires calculation-input evidence before report issue where calculation inputs exist', () => {
    const route = readRepoFile('apps/api/src/routes/reports.ts');
    expect(route).toContain('calculationInputTotalCount');
    expect(route).toContain('calculationInputEvidenceCount');
    expect(route).toContain('calculationInputEvidenceComplete');
    expect(route).toContain("missing_required_evidence: [");
    expect(route).toContain("'calculation_input'");
    expect(route).toContain('calculation_input_direct_evidence_file_id_counts_as_equivalent');
    expect(route).toContain('direct_ef.id = calculation_input_rows.evidence_file_id');
    expect(route).toContain("direct_ef.tenant_id = $3::uuid");
  });

  it('allows calculation_input evidence links through the evidence validation layer', () => {
    const validation = readRepoFile('apps/api/src/modules/evidence/validation.ts');
    expect(validation).toContain("| 'calculation_input'");
    expect(validation).toContain("'calculation_input'");
  });

  it('aligns gate-eligible object-storage evidence defaults with evidence governance file types', () => {
    const env = readRepoFile('.env.example');
    const config = readRepoFile('apps/api/src/config/env.ts');
    for (const extension of ['.pdf', '.xlsx', '.csv', '.jpg', '.jpeg', '.png', '.dwg', '.dxf', '.stl', '.zip']) {
      expect(env).toContain(extension);
      expect(config).toContain(extension);
    }
    for (const mimeType of [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'image/jpeg',
      'image/png',
      'application/acad',
      'application/dxf',
      'model/stl',
      'application/zip',
      'application/x-zip-compressed'
    ]) {
      expect(env).toContain(mimeType);
      expect(config).toContain(mimeType);
    }
    expect(env).toContain('ZIP evidence bundles remain controlled evidence only');
  });

  it('keeps OpenAPI aligned with allowlisted final-table promotion behavior', () => {
    const openapi = readRepoFile('04_API/openapi.yaml');
    expect(openapi).toContain('allowlisted final-table promotion mapping');
    expect(openapi).toContain('allowlisted mappings');
    expect(openapi).toContain('never written directly or dynamically');
  });
});
