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

function expectFile(relativePath: string): string {
  const absolutePath = path.join(repoRoot, relativePath);
  expect(fs.existsSync(absolutePath), `${relativePath} should exist`).toBe(true);
  return fs.readFileSync(absolutePath, 'utf8');
}

describe('RC4-Y final release operations evidence collection', () => {
  it('adds the final operations evidence collection matrix and runbook', () => {
    const collection = expectFile('docs/release/final_release_operations_evidence_collection.md');
    const runbook = expectFile('docs/operations/final_release_operations_evidence_runbook.md');
    const cutover = expectFile('docs/operations/final_release_cutover_rollback_evidence_record.md');

    expect(collection).toContain('RC4-Y Final Release Operations Evidence Collection');
    expect(collection).toContain('EV-OPS-001');
    expect(collection).toContain('EV-OPS-017');
    expect(collection).toContain('AI/n8n/service actors cannot approve go-live');
    expect(collection).toContain('Do not paste secrets');
    expect(collection).toContain('signed URLs');

    expect(runbook).toContain('pnpm -r test');
    expect(runbook).toContain('pnpm -r lint');
    expect(runbook).toContain('node scripts/repo-hygiene.mjs');
    expect(runbook).toContain('backup/restore');
    expect(runbook).toContain('monitoring dashboard/log review');

    expect(cutover).toContain('Final Release Cutover and Rollback Evidence Record');
    expect(cutover).toContain('Rollback Readiness Summary');
    expect(cutover).toContain('Hypercare Window');
    expect(cutover).toContain('AI/n8n/service actors cannot sign');
  });

  it('links RC4-Y evidence collection back to final release decision records', () => {
    const register = readRepoFile('docs/release/final_release_evidence_register.md');
    const decision = readRepoFile('docs/release/final_go_no_go_decision_record.md');
    const readme = readRepoFile('README.md');
    const sprint = readRepoFile('docs/sprint-status.md');

    expect(register).toContain('RC4-Y Operations Evidence Collection Mapping');
    expect(register).toContain('EV-OPS-001');
    expect(register).toContain('EV-OPS-017');
    expect(register).toContain('AI/n8n/service actors cannot accept evidence');

    expect(decision).toContain('RC4-Y Operations Evidence Gate');
    expect(decision).toContain('final_release_operations_evidence_collection.md');
    expect(decision).toContain('Missing evidence');

    expect(readme).toContain('RC4-Y Final Release Operations Evidence Collection');
    expect(readme).toContain('RC4-Y does not add runtime APIs');
    expect(sprint).toContain('RC4-Y Final Release Operations Evidence Collection');
  });

  it('preserves documentation-only scope and source-of-truth boundaries', () => {
    const collection = readRepoFile('docs/release/final_release_operations_evidence_collection.md');
    const runbook = readRepoFile('docs/operations/final_release_operations_evidence_runbook.md');

    expect(collection).toContain('n8n remains orchestration-only');
    expect(collection).toContain('AI output remains staging-only');
    expect(collection).toContain('No API/API-ASME formulas are invented, copied, embedded, or expanded by RC4-Y');
    expect(collection).toContain('RC4-Y does not add runtime APIs, database migrations, formulas, AI behavior, n8n behavior, object-storage behavior, approval behavior, report issue behavior, work-order behavior, or CMMS integration');
    expect(runbook).not.toContain('production_' + 'deployment/');
    expect(runbook).not.toContain('D:/AIM_' + 'UAT_Evidence');
  });
});
