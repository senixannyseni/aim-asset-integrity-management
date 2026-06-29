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

describe('RC4-Z final go/no-go signoff preparation', () => {
  it('adds final human signoff packet, meeting minutes, and authorization record', () => {
    const signoff = expectFile('docs/release/final_go_no_go_signoff_packet.md');
    const minutes = expectFile('docs/release/final_go_no_go_meeting_minutes_template.md');
    const authorization = expectFile('docs/release/final_go_live_authorization_record.md');

    expect(signoff).toContain('RC4-Z Final Go/No-Go Signoff Preparation');
    expect(signoff).toContain('Production go-live can only be approved by named human accountable roles');
    expect(signoff).toContain('SIG-ATT-001');
    expect(signoff).toContain('SIG-ATT-010');
    expect(signoff).toContain('AI/n8n/service actors cannot approve this release');
    expect(signoff).toContain('Do not paste secrets');
    expect(signoff).toContain('signed URLs');

    expect(minutes).toContain('AIM Final Go / No-Go Meeting Minutes Template');
    expect(minutes).toContain('Evidence Review Summary');
    expect(minutes).toContain('AI/n8n/service actors cannot approve go-live');

    expect(authorization).toContain('AIM Final Go-Live Authorization Record');
    expect(authorization).toContain('Invalid Approval Sources');
    expect(authorization).toContain('AI/n8n/service actors cannot sign this authorization record');
  });

  it('links RC4-Z signoff artifacts back to final decision and evidence records', () => {
    const decision = read('docs/release/final_go_no_go_decision_record.md');
    const register = read('docs/release/final_release_evidence_register.md');
    const readme = read('README.md');
    const sprint = read('docs/sprint-status.md');

    expect(decision).toContain('RC4-Z Final Human Signoff Gate');
    expect(decision).toContain('final_go_no_go_signoff_packet.md');
    expect(decision).toContain('final_go_live_authorization_record.md');
    expect(decision).toContain('Missing RC4-Z signoff');

    expect(register).toContain('RC4-Z Final Signoff Evidence Mapping');
    expect(register).toContain('EV-SIGNOFF-001');
    expect(register).toContain('EV-SIGNOFF-005');
    expect(register).toContain('AI/n8n/service actors cannot sign final authorization');

    expect(readme).toContain('RC4-Z Final Go/No-Go Signoff Preparation');
    expect(readme).toContain('RC4-Z does not add runtime APIs');
    expect(sprint).toContain('RC4-Z Final Go/No-Go Signoff Preparation');
  });

  it('preserves documentation-only scope and source-of-truth boundaries', () => {
    const signoff = read('docs/release/final_go_no_go_signoff_packet.md');
    const authorization = read('docs/release/final_go_live_authorization_record.md');

    expect(signoff).toContain('AI/n8n/service actors cannot approve go-live');
    expect(signoff).toContain('n8n direct database write access');
    expect(signoff).toContain('full API 579');
    expect(signoff).toContain('full API 581');
    expect(signoff).toContain('copied API/API-ASME formulas');
    expect(authorization).not.toContain('production_' + 'deployment/');
    expect(authorization).not.toContain('D:/AIM_' + 'UAT_Evidence');
  });
});
