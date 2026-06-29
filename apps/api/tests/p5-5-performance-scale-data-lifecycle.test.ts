import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');

function read(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function expectFile(relativePath: string): string {
  const absolutePath = path.join(repoRoot, relativePath);
  expect(fs.existsSync(absolutePath), `${relativePath} should exist`).toBe(true);
  return fs.readFileSync(absolutePath, 'utf8');
}

describe('P5-5 performance, scale, and data lifecycle evidence pack', () => {
  it('adds concrete P5-5 performance, scale, capacity, lifecycle, and signoff records', () => {
    const pack = expectFile('docs/operations/p5_5_performance_scale_data_lifecycle_pack.md');
    const performance = expectFile('docs/operations/p5_5_performance_reliability_evidence_record.md');
    const lifecycle = expectFile('docs/operations/p5_5_data_lifecycle_retention_record.md');
    const capacity = expectFile('docs/operations/p5_5_capacity_query_review_record.md');
    const runbook = expectFile('docs/operations/p5_5_performance_scale_data_lifecycle_runbook.md');

    expect(pack).toContain('P5-5 Performance, Scale, and Data Lifecycle Pack');
    expect(pack).toContain('P5-PERF-001');
    expect(pack).toContain('P5-PERF-012');
    expect(pack).toContain('AI/n8n/service actors cannot accept performance evidence');
    expect(pack).toContain('AI/n8n/service actors cannot approve data-retention exceptions');

    expect(performance).toContain('P5-5 Performance and Reliability Evidence Record');
    expect(performance).toContain('API Load Smoke Test');
    expect(performance).toContain('Report Export Throughput Check');
    expect(performance).toContain('Object-Storage Throughput Check');
    expect(performance).toContain('n8n remains orchestration-only');

    expect(lifecycle).toContain('P5-5 Data Lifecycle and Retention Record');
    expect(lifecycle).toContain('Data Retention Matrix');
    expect(lifecycle).toContain('Archive / Export / Purge Lifecycle Procedure');
    expect(lifecycle).toContain('AI/n8n/service actors cannot close lifecycle gaps');

    expect(capacity).toContain('P5-5 Capacity and Query Review Record');
    expect(capacity).toContain('Capacity Assumptions');
    expect(capacity).toContain('Database Query Review');
    expect(capacity).toContain('Large Evidence / Large Dataset Handling');

    expect(runbook).toContain('P5-5 Performance, Scale, and Data Lifecycle Runbook');
    expect(runbook).toContain('pnpm -r test');
    expect(runbook).toContain('node scripts/repo-hygiene.mjs');
    expect(runbook).toContain('AI/n8n/service actors cannot approve performance readiness');
  });

  it('links P5-5 into Phase 5 status, acceptance gates, roadmap, backlog, and release evidence without reopening runtime scope', () => {
    const readme = read('README.md');
    const sprint = read('docs/sprint-status.md');
    const register = read('docs/release/final_release_evidence_register.md');
    const gates = read('docs/operations/phase5_production_hardening_acceptance_gates.md');
    const roadmap = read('docs/roadmap/phase5_production_hardening_roadmap.md');
    const backlog = read('docs/roadmap/phase5_backlog_prioritization_matrix.md');

    expect(readme).toContain('P5-5 Performance, Scale, and Data Lifecycle');
    expect(readme).toContain('P5-5 does not add runtime APIs');
    expect(readme).toContain('AI/n8n/service actors cannot accept performance evidence');

    expect(sprint).toContain('P5-5 — Performance, Scale, and Data Lifecycle');
    expect(register).toContain('P5-5 Performance, Scale, and Data Lifecycle Mapping');
    expect(register).toContain('P5-PERF-001');
    expect(register).toContain('P5-PERF-012');
    expect(gates).toContain('P5-5 Execution Pack');
    expect(gates).toContain('P5-GATE-006 Performance/reliability gate');
    expect(roadmap).toContain('P5-5 Execution Pack');
    expect(backlog).toContain('P5-5 Backlog Mapping');
  });

  it('preserves performance/lifecycle safety boundaries and avoids unsafe committed evidence examples', () => {
    const pack = read('docs/operations/p5_5_performance_scale_data_lifecycle_pack.md');
    const performance = read('docs/operations/p5_5_performance_reliability_evidence_record.md');
    const lifecycle = read('docs/operations/p5_5_data_lifecycle_retention_record.md');
    const runbook = read('docs/operations/p5_5_performance_scale_data_lifecycle_runbook.md');

    expect(pack).toContain('Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials');
    expect(pack).toContain('database dumps');
    expect(pack).toContain('n8n has direct PostgreSQL write access');
    expect(pack).toContain('full API 579');
    expect(pack).toContain('full API 581');
    expect(pack).toContain('copied API/API-ASME formulas');

    expect(performance).not.toMatch(/AKIA[0-9A-Z]{16}/);
    expect(performance).not.toMatch(/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/);
    expect(performance).not.toContain('postgres://admin:password');
    expect(performance).not.toContain('D:/AIM_UAT_Evidence');
    expect(performance).not.toContain('mongodb+srv://');

    expect(lifecycle).not.toContain('postgres://admin:password');
    expect(lifecycle).not.toContain('D:/AIM_UAT_Evidence');
    expect(lifecycle).not.toMatch(/AKIA[0-9A-Z]{16}/);

    expect(runbook).toContain('Do not paste secrets');
    expect(runbook).toContain('AI/n8n/service actors cannot approve performance readiness');
    expect(runbook).toContain('AI/n8n/service actors cannot approve data-retention exceptions');
  });
});
