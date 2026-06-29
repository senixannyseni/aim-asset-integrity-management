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

describe('AIM MVP final go/no-go evidence bundle', () => {
  it('adds an archive-ready final evidence bundle and index', () => {
    const bundle = expectFile('docs/release/aim_mvp_final_go_no_go_evidence_bundle.md');
    const index = expectFile('docs/release/final_evidence_bundle_index.md');
    const handoff = expectFile('docs/release/final_release_handoff_record.md');

    expect(bundle).toContain('AIM MVP Final Go/No-Go Evidence Bundle');
    expect(bundle).toContain('EV-BUNDLE-001');
    expect(bundle).toContain('EV-BUNDLE-010');
    expect(bundle).toContain('Evidence bundle location');
    expect(bundle).toContain('Release tag');
    expect(bundle).toContain('Commit SHA');
    expect(bundle).toContain('AI/n8n/service actors cannot approve the bundle');
    expect(bundle).toContain('Do not paste secrets');
    expect(bundle).toContain('signed URLs');

    expect(index).toContain('AIM Final Evidence Bundle Index');
    expect(index).toContain('EV-BUNDLE-001');
    expect(index).toContain('EV-BUNDLE-010');
    expect(index).toContain('AI/n8n/service actors cannot accept evidence');

    expect(handoff).toContain('AIM Final Release Handoff Record');
    expect(handoff).toContain('Release baseline locked');
    expect(handoff).toContain('Hypercare active');
    expect(handoff).toContain('AI/n8n/service actors cannot approve handoff');
  });

  it('links final bundle back to release decision and evidence register', () => {
    const decision = read('docs/release/final_go_no_go_decision_record.md');
    const register = read('docs/release/final_release_evidence_register.md');
    const readme = read('README.md');
    const sprint = read('docs/sprint-status.md');

    expect(decision).toContain('AIM MVP Final Evidence Bundle Gate');
    expect(decision).toContain('aim_mvp_final_go_no_go_evidence_bundle.md');
    expect(decision).toContain('final_evidence_bundle_index.md');
    expect(decision).toContain('final_release_handoff_record.md');
    expect(decision).toContain('Missing final evidence bundle');

    expect(register).toContain('AIM MVP Final Go/No-Go Evidence Bundle Mapping');
    expect(register).toContain('EV-BUNDLE-001');
    expect(register).toContain('EV-BUNDLE-010');
    expect(register).toContain('AI/n8n/service actors cannot accept the final evidence bundle');

    expect(readme).toContain('AIM MVP Final Go/No-Go Evidence Bundle');
    expect(readme).toContain('The final evidence bundle does not add runtime APIs');
    expect(sprint).toContain('AIM MVP Final Go/No-Go Evidence Bundle');
  });

  it('preserves documentation-only scope and go-live authority boundaries', () => {
    const bundle = read('docs/release/aim_mvp_final_go_no_go_evidence_bundle.md');
    const handoff = read('docs/release/final_release_handoff_record.md');

    expect(bundle).toContain('documentation/evidence-control only');
    expect(bundle).toContain('does not add runtime APIs, database migrations, formulas, AI behavior, n8n behavior, object-storage behavior, report issue behavior, approval behavior, work-order behavior, external CMMS integration');
    expect(bundle).toContain('full API 579');
    expect(bundle).toContain('full API 581');
    expect(bundle).toContain('copied API/API-ASME formulas');
    expect(handoff).not.toContain('production_' + 'deployment/');
    expect(handoff).not.toContain('D:/AIM_' + 'UAT_Evidence');
  });
});
