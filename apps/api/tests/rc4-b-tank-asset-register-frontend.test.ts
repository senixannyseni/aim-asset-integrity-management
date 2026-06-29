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

describe('RC4-B tank asset register frontend regression', () => {
  it('keeps the tank asset register and asset detail frontend routes available', () => {
    const registerPage = expectFile('apps/web/app/assets/page.tsx');
    const assetDetailPage = expectFile('apps/web/app/assets/[assetId]/page.tsx');
    const assetDetailClient = expectFile('apps/web/app/assets/[assetId]/AssetDetailClient.tsx');

    expect(registerPage).toContain('RC4-B');
    expect(registerPage).toContain('Tank Asset Register');
    expect(registerPage).toContain("apiFetch('/api/v1/assets'");
    expect(registerPage).toContain("method: 'POST'");
    expect(registerPage).toContain('Backend validation and audit logging remain authoritative');
    expect(assetDetailPage).toContain('AssetDetailClient');
    expect(assetDetailClient).toContain('/api/v1/assets/${assetId}/readiness');
    expect(assetDetailClient).toContain('Asset Integrity Package');
    expect(assetDetailClient).toContain('/audit-logs?entity_type=asset');
  });

  it('keeps RC4-B release and UAT evidence aligned with governance boundaries', () => {
    const release = expectFile('docs/release/AIM_RC4B_tank_asset_register_frontend_report.md');
    const uat = expectFile('docs/uat/uat_rc4b_tank_asset_register_frontend.md');
    const sprintStatus = expectFile('docs/sprint-status.md');

    for (const content of [release, uat, sprintStatus]) {
      expect(content).toContain('RC4-B');
      expect(content).toContain('Tank Asset Register');
      expect(content).not.toMatch(/x-full-api-579-implemented:\s*true/i);
      expect(content).not.toMatch(/x-full-api-581-implemented:\s*true/i);
      expect(content).not.toMatch(/minimum thickness formula implemented/i);
    }

    expect(release).toContain('does not introduce calculations');
    expect(uat).toContain('No calculation changes');
    expect(uat).toContain('No AI/n8n changes');
  });

  it('does not introduce formula, AI, n8n, report issue, or final decision behavior from asset UI', () => {
    const registerPage = readRepoFile('apps/web/app/assets/page.tsx');
    const assetDetailClient = readRepoFile('apps/web/app/assets/[assetId]/AssetDetailClient.tsx');

    for (const content of [registerPage, assetDetailClient]) {
      expect(content).not.toMatch(/insert into/i);
      expect(content).not.toMatch(/apiFetch\([^)]*\/api\/v1\/reports\/[^)]*\/issue/i);
      expect(content).not.toMatch(/apiFetch\([^)]*\/api\/v1\/integrity-decisions\/[^)]*\/approve/i);
      expect(content).not.toMatch(/API\s*579\s*formula/i);
      expect(content).not.toMatch(/API\s*581\s*formula/i);
      expect(content).not.toMatch(/remaining_life\s*=/i);
      expect(content).not.toMatch(/minimum_thickness\s*=/i);
    }
  });
});
