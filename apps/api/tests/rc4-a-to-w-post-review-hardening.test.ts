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

describe('RC4-A through RC4-W post-review hardening closure', () => {
  it('uses the implemented engineering calculation endpoint in Findings UI', () => {
    const findingsClient = expectFile('apps/web/app/findings/FindingsClient.tsx');
    const calculationsRoute = expectFile('apps/api/src/routes/calculations.ts');
    const openapi = expectFile('04_API/openapi.yaml');

    expect(findingsClient).toContain('/api/v1/engineering/calculations');
    expect(findingsClient).not.toContain('/api/v1/calculations?asset_id=');
    expect(findingsClient).not.toContain("'/api/v1/calculations'");
    expect(calculationsRoute).toMatch(/calculationsRouter\.get\(\s*["']\/engineering\/calculations["']/);
    expect(openapi).toContain('/api/v1/engineering/calculations:');
  });

  it('keeps frontend access tokens memory-only by default with explicit legacy session storage opt-in', () => {
    const apiClient = expectFile('apps/web/lib/api-client.ts');
    const loginPage = expectFile('apps/web/app/login/page.tsx');
    const envExample = expectFile('.env.example');

    expect(apiClient).toContain('let inMemoryAccessToken: string | null = null');
    expect(apiClient).toContain('NEXT_PUBLIC_AIM_LEGACY_TOKEN_STORAGE');
    expect(apiClient).toContain('window.sessionStorage');
    expect(apiClient).not.toContain('window.localStorage');
    expect(loginPage).toContain('In-memory token is present');
    expect(envExample).toContain('NEXT_PUBLIC_AIM_LEGACY_TOKEN_STORAGE=false');
  });

  it('stores historical generated patch manifests under docs/release instead of the repository root', () => {
    const rootManifestFiles = fs.readdirSync(repoRoot).filter((fileName) => /^RC[34].*PATCH_MANIFEST\.md$/.test(fileName));
    expect(rootManifestFiles).toEqual([]);

    const manifestFolder = path.join(repoRoot, 'docs/release/patch-manifests');
    expect(fs.existsSync(manifestFolder)).toBe(true);
    const relocatedManifestFiles = fs.readdirSync(manifestFolder).filter((fileName) => /^RC[34].*PATCH_MANIFEST\.md$/.test(fileName));
    expect(relocatedManifestFiles.length).toBeGreaterThanOrEqual(50);
    expect(relocatedManifestFiles).toContain('RC4W_SECURITY_REVIEW_OPERATIONAL_MONITORING_CLOSURE_PATCH_MANIFEST.md');
    expect(readRepoFile('docs/release/patch-manifests/README.md')).toContain('Historical Patch Manifests');
  });
});
