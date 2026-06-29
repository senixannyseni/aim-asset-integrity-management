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

describe('RC4-C evidence upload UI and evidence detail regression', () => {
  it('keeps evidence repository upload-url, complete-upload, fallback metadata, and audited download flows visible', () => {
    const repositoryPage = expectFile('apps/web/app/evidence/page.tsx');
    const repositoryClient = expectFile('apps/web/app/evidence/EvidenceRepositoryClient.tsx');
    const detailPage = expectFile('apps/web/app/evidence/[evidenceId]/page.tsx');

    expect(repositoryPage).toContain('RC4-C');
    expect(repositoryPage).toContain('/api/v1/evidence/upload-url');
    expect(repositoryPage).toContain('/api/v1/evidence/complete-upload');
    expect(repositoryPage).toContain('/api/v1/evidence/upload');
    expect(repositoryPage).toMatch(/signed URLs and raw object keys .*displayed/i);
    expect(repositoryClient).toContain('/api/v1/evidence/${evidenceId}/download-url');
    expect(repositoryClient).toContain('malware-status');
    expect(repositoryClient).toContain('audit checks');
    expect(detailPage).toContain('RC4-C');
    expect(detailPage).toContain('Audited Open / Download');
    expect(detailPage).toContain('Safe Preview');
    expect(detailPage).toContain('Signed URL is not displayed');
    expect(detailPage).toContain('Raw object keys and signed URLs are intentionally not displayed');
  });

  it('keeps RC4-C release and UAT evidence aligned with object-storage governance', () => {
    const release = expectFile('docs/release/AIM_RC4C_evidence_upload_ui_report.md');
    const uat = expectFile('docs/uat/uat_rc4c_evidence_upload_ui.md');

    for (const content of [release, uat]) {
      expect(content).toContain('RC4-C');
      expect(content).toContain('Evidence');
      expect(content).toContain('upload-url');
      expect(content).toContain('complete-upload');
      expect(content).toContain('malware');
      expect(content).not.toMatch(/raw object keys are displayed/i);
      expect(content).not.toMatch(/x-full-api-579-implemented:\s*true/i);
      expect(content).not.toMatch(/x-full-api-581-implemented:\s*true/i);
    }

    expect(release).toContain('AI extraction remains staging-first');
    expect(uat).toContain('blocked evidence cannot be previewed/opened');
  });

  it('does not expose signed URLs or raw object keys as durable UI state', () => {
    const repositoryPage = readRepoFile('apps/web/app/evidence/page.tsx');
    const detailPage = readRepoFile('apps/web/app/evidence/[evidenceId]/page.tsx');

    for (const content of [repositoryPage, detailPage]) {
      expect(content).not.toMatch(/setMessage\([^)]*signed_url/i);
      expect(content).not.toMatch(/setMessage\([^)]*download_url/i);
      expect(content).not.toMatch(/<dd>\{evidence\.object_key/i);
      expect(content).not.toMatch(/<dd>\{evidence\.storage_key/i);
      expect(content).not.toMatch(/insert into/i);
    }
  });
});
