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

describe('P5-1 security and secrets hardening evidence pack', () => {
  it('adds concrete P5-1 security evidence records and runbook', () => {
    const pack = expectFile('docs/security/p5_1_security_and_secrets_hardening_pack.md');
    const secrets = expectFile('docs/security/p5_1_secrets_scanning_evidence_record.md');
    const rbac = expectFile('docs/security/p5_1_rbac_service_actor_review_record.md');
    const risks = expectFile('docs/security/p5_1_security_accepted_risk_register.md');
    const runbook = expectFile('docs/operations/p5_1_security_evidence_runbook.md');

    expect(pack).toContain('P5-1 Security and Secrets Hardening Pack');
    expect(pack).toContain('P5-SEC-001');
    expect(pack).toContain('P5-SEC-012');
    expect(pack).toContain('AI/n8n/service actors cannot approve');

    expect(secrets).toContain('P5-1 Secrets Scanning Evidence Record');
    expect(secrets).toContain('No real secrets or production credentials are committed');
    expect(secrets).toContain('signed URLs or raw object keys');

    expect(rbac).toContain('P5-1 RBAC and Service Actor Review Record');
    expect(rbac).toContain('n8n remains orchestration-only');
    expect(rbac).toContain('Cannot approve, promote, finalize, issue reports, close work orders, accept evidence, accept risk, or sign go-live');

    expect(risks).toContain('P5-1 Security Accepted-Risk Register');
    expect(risks).toContain('AI/n8n/service actors cannot accept risk');

    expect(runbook).toContain('P5-1 Security Evidence Runbook');
    expect(runbook).toContain('pnpm -r test');
    expect(runbook).toContain('node scripts/repo-hygiene.mjs');
  });

  it('links P5-1 into Phase 5 status and release evidence without reopening runtime scope', () => {
    const readme = read('README.md');
    const sprint = read('docs/sprint-status.md');
    const register = read('docs/release/final_release_evidence_register.md');
    const phase5Security = read('docs/security/phase5_security_hardening_plan.md');

    expect(readme).toContain('P5-1 Security and Secrets Hardening');
    expect(readme).toContain('P5-1 does not add runtime APIs');
    expect(readme).toContain('AI/n8n/service actors cannot accept security evidence');

    expect(sprint).toContain('P5-1 — Security and Secrets Hardening');
    expect(register).toContain('P5-1 Security and Secrets Hardening Mapping');
    expect(register).toContain('P5-SEC-001');
    expect(register).toContain('P5-SEC-012');
    expect(phase5Security).toContain('P5-1 Execution Pack');
  });

  it('preserves security boundaries and avoids unsafe committed evidence examples', () => {
    const pack = read('docs/security/p5_1_security_and_secrets_hardening_pack.md');
    const secrets = read('docs/security/p5_1_secrets_scanning_evidence_record.md');
    const risks = read('docs/security/p5_1_security_accepted_risk_register.md');

    expect(pack).toContain('Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials');
    expect(pack).toContain('n8n has direct PostgreSQL write access');
    expect(pack).toContain('full API 579');
    expect(pack).toContain('full API 581');
    expect(pack).toContain('copied API/API-ASME formulas');

    expect(secrets).not.toMatch(/AKIA[0-9A-Z]{16}/);
    expect(secrets).not.toMatch(/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/);
    expect(secrets).not.toContain('postgres://admin:password');

    expect(risks).toContain('Risk acceptance should be rejected');
    expect(risks).toContain('n8n has direct PostgreSQL write access');
  });
});
