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

describe('RC4-X final release decision pack cleanup', () => {
  it('adds final release decision, readiness, and evidence-control documents', () => {
    const readiness = expectFile('docs/release/final_release_readiness_status.md');
    const decision = expectFile('docs/release/final_go_no_go_decision_record.md');
    const evidence = expectFile('docs/release/final_release_evidence_register.md');

    expect(readiness).toContain('MVP release-candidate complete');
    expect(readiness).toContain('production go-live remains conditional');
    expect(readiness).toContain('RC4-A through RC4-W');
    expect(readiness).toContain('AI/n8n/service actors');
    expect(readiness).toContain('Production Go-Live Evidence Still Required');

    expect(decision).toContain('Final Go / No-Go Decision Record');
    expect(decision).toContain('Production go-live must not be approved by AI, n8n, service accounts, automation, or static tests');
    expect(decision).toContain('No-Go Conditions');
    expect(decision).toContain('Human Signoff Table');

    expect(evidence).toContain('Final Release Evidence Register');
    expect(evidence).toContain('EV-FINAL-001');
    expect(evidence).toContain('EV-FINAL-017');
    expect(evidence).toContain('Do not paste secrets');
    expect(evidence).toContain('signed URLs');
  });

  it('updates final release/go-live documents and removes stale blanket no-frontend wording', () => {
    const readme = readRepoFile('README.md');
    const sprint = readRepoFile('docs/sprint-status.md');
    const goLive = readRepoFile('docs/deployment/go_live_checklist.md');
    const checklist = readRepoFile('docs/release/release_candidate_checklist.md');
    const releaseDecision = readRepoFile('docs/release/release_candidate_go_no_go_decision.md');
    const releaseNotes = readRepoFile('docs/release/release_notes_phase2_candidate.md');
    const phase20 = readRepoFile('docs/release/phase2_0_release_readiness_report.md');

    expect(readme).toContain('RC4-X Final Release Decision Pack Cleanup');
    expect(sprint).toContain('RC4-X Final Release Decision Pack Cleanup');
    expect(goLive).toContain('Final RC4-X Decision Pack');
    expect(checklist).toContain('RC4-X Final Decision Pack Gates');
    expect(releaseDecision).toContain('Superseded for final RC4 decisioning');
    expect(releaseNotes).toContain('RC4-X Supersession Note');
    expect(phase20).toContain('RC4-X Supersession Note');

    for (const [name, content] of [
      ['release_candidate_go_no_go_decision.md', releaseDecision],
      ['release_notes_phase2_candidate.md', releaseNotes],
      ['phase2_0_release_readiness_report.md', phase20],
      ['release_candidate_checklist.md', checklist],
      ['go_live_checklist.md', goLive]
    ] as const) {
      expect(content, `${name} should not retain stale blanket no-frontend wording`).not.toContain('No frontend UI implementation');
      expect(content, `${name} should describe governed RC4 frontend scope`).toContain('governed RC4');
    }
  });

  it('keeps RC4-X documentation-only and preserves source-of-truth boundaries', () => {
    const readme = readRepoFile('README.md');
    const readiness = readRepoFile('docs/release/final_release_readiness_status.md');
    const decision = readRepoFile('docs/release/final_go_no_go_decision_record.md');

    expect(readme).toContain('RC4-X does not add runtime APIs, database migrations, formulas, AI behavior, n8n behavior, object-storage behavior, report issue behavior, approval behavior, work-order behavior, or external CMMS integration');
    expect(readiness).toContain('n8n remains orchestration-only');
    expect(readiness).toContain('AI output remains staging-only');
    expect(readiness).toContain('API/API-ASME formulas are not invented, copied, or embedded');
    expect(decision).toContain('Full API 579/API 581, external CMMS integration, 3D processing, or invented API/API-ASME formula implementation appears unexpectedly');
  });
});
