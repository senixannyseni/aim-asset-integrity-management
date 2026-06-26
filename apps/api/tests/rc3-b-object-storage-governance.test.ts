import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { hasPermission } from '../src/rbac/roles.js';
import { buildEvidenceObjectKey, validateEvidenceObjectRequest } from '../src/modules/object-storage/evidence-storage.js';
import { buildReportExportObjectKey } from '../src/modules/object-storage/report-storage.js';
import { redactSignedUrl } from '../src/modules/object-storage/object-storage-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('RC3-B object-storage foundation', () => {
  it('adds S3-compatible object-storage modules without hard-coded credentials', () => {
    for (const file of [
      'apps/api/src/modules/object-storage/object-storage-types.ts',
      'apps/api/src/modules/object-storage/s3-client.ts',
      'apps/api/src/modules/object-storage/object-storage-service.ts',
      'apps/api/src/modules/object-storage/evidence-storage.ts',
      'apps/api/src/modules/object-storage/report-storage.ts'
    ]) {
      expect(fs.existsSync(path.join(repoRoot, file))).toBe(true);
      expect(readRepoFile(file)).not.toContain('minioadmin');
    }
    const apiPackage = readRepoFile('apps/api/package.json');
    expect(apiPackage).toContain('@aws-sdk/client-s3');
    expect(apiPackage).toContain('@aws-sdk/s3-request-presigner');
  });

  it('sanitizes evidence and report object keys and prevents traversal', () => {
    const key = buildEvidenceObjectKey({
      assetTagOrId: 'TK-001/../bad',
      inspectionId: null,
      evidenceCode: 'EVD-2026-000001',
      filename: 'shell UT report.pdf'
    });
    expect(key).toBe('evidence/TK-001-.bad/na/EVD-2026-000001/shell-UT-report.pdf');
    expect(key).not.toContain('..');

    const reportKey = buildReportExportObjectKey({
      reportId: '38000000-0000-4000-8000-000000000001',
      exportId: '39000000-0000-4000-8000-000000000001',
      filename: 'report.pdf'
    });
    expect(reportKey).toContain('reports/38000000-0000-4000-8000-000000000001/exports/39000000-0000-4000-8000-000000000001/report.pdf');
    expect(() => buildEvidenceObjectKey({ assetTagOrId: 'TK-001', inspectionId: null, evidenceCode: 'EVD-1', filename: '../secret.env' })).toThrow(/path traversal/i);
  });

  it('validates allowed evidence extension, MIME type, and size', () => {
    expect(validateEvidenceObjectRequest({ filename: 'report.pdf', mimeType: 'application/pdf', sizeBytes: 1024 }).safeFilename).toBe('report.pdf');
    expect(() => validateEvidenceObjectRequest({ filename: 'report.exe', mimeType: 'application/pdf', sizeBytes: 1024 })).toThrow(/extension/i);
    expect(() => validateEvidenceObjectRequest({ filename: 'report.pdf', mimeType: 'application/x-msdownload', sizeBytes: 1024 })).toThrow(/MIME/i);
    expect(() => validateEvidenceObjectRequest({ filename: 'report.pdf', mimeType: 'application/pdf', sizeBytes: 0 })).toThrow(/size/i);
  });

  it('redacts signed URL query strings before audit logging', () => {
    const redacted = redactSignedUrl('https://object.example/bucket/key.pdf?X-Amz-Signature=secret&X-Amz-Credential=secret');
    expect(redacted).toContain('?REDACTED');
    expect(redacted).not.toContain('secret');
    expect(redacted).not.toContain('X-Amz-Signature');
  });
});

describe('RC3-B evidence object-storage API contract', () => {
  it('adds migration for evidence object storage and upload sessions', () => {
    const migration = readRepoFile('db/migrations/0020_object_storage_evidence_hardening.sql');
    expect(migration).toContain('create table if not exists evidence_upload_sessions');
    expect(migration).toContain('object_key');
    expect(migration).toContain('upload_status');
    expect(migration).toContain('evidence.download_url');
  });

  it('implements evidence upload, complete-upload, download-url, and download routes', () => {
    const route = readRepoFile('apps/api/src/routes/evidence.ts');
    expect(route).toContain("evidenceRouter.post('/evidence/upload-url'");
    expect(route).toContain("evidenceRouter.post('/evidence/complete-upload'");
    expect(route).toContain("evidenceRouter.get('/evidence/:evidenceId/download-url'");
    expect(route).toContain("evidenceRouter.get('/evidence/:evidenceId/download'");
    expect(route).toContain('objectStorageService.headObject');
    expect(route).toContain('EVIDENCE_OBJECT_NOT_FOUND');
    expect(route).toContain('EVIDENCE_BLOCKED_BY_SCAN');
    expect(route).toContain('EVIDENCE_DOWNLOAD_URL_CREATED');
    expect(route).toContain('HUMAN_EVIDENCE_UPLOAD_REQUIRED');
    expect(route).toContain('evidence_code_source');
    expect(route).toContain('checksum_required');
    expect(route).toContain('EVIDENCE_CHECKSUM_REQUIRED');
    expect(route).toContain('EVIDENCE_CHECKSUM_VERIFICATION_REQUIRED');
    expect(route).toContain('objectHead.metadata?.checksum_sha256');
    expect(route).not.toContain("sha256Hex(`${objectKey}:${objectHead.contentLength}:${objectHead.eTag ?? ''}`)");
    expect(route.match(/EVIDENCE_BLOCKED_BY_SCAN/g)?.length).toBe(1);
    expect(route.match(/EVIDENCE_OBJECT_KEY_MISSING/g)?.length).toBe(1);
  });

  it('does not grant evidence upload or report export to ai_agent', () => {
    expect(hasPermission(['ai_agent'], 'evidence.upload')).toBe(false);
    expect(hasPermission(['ai_agent'], 'evidence.download_url')).toBe(false);
    expect(hasPermission(['ai_agent'], 'report.export')).toBe(false);
  });
});

describe('RC3-B report artifact object-storage API contract', () => {
  it('adds migration for report export object-storage metadata', () => {
    const migration = readRepoFile('db/migrations/0021_report_export_object_storage.sql');
    expect(migration).toContain('content_hash_sha256');
    expect(migration).toContain('download_status');
    expect(migration).toContain('report.export');
  });

  it('implements object-storage report export and download-url routes', () => {
    const route = readRepoFile('apps/api/src/routes/reports.ts');
    expect(route).toContain("reportsRouter.post('/reports/:reportId/exports'");
    expect(route).toContain("reportsRouter.get('/reports/:reportId/exports'");
    expect(route).toContain("reportsRouter.get('/report-exports/:exportId/download-url'");
    expect(route).toContain('objectStorageService.putObject');
    expect(route).toContain('REPORT_EXPORT_CREATED');
    expect(route).toContain('REPORT_EXPORT_DOWNLOAD_URL_CREATED');
    expect(route).toContain('HUMAN_REPORT_EXPORT_REQUIRED');
    expect(route).toContain('normal_api_base64_response: false');
    expect(route).toContain("ef.upload_status = 'verified'");
  });

  it('updates minimal frontend evidence and report object-storage controls', () => {
    const evidenceClient = readRepoFile('apps/web/app/evidence/EvidenceRepositoryClient.tsx');
    expect(evidenceClient).toContain('Create Audited Download URL');
    expect(evidenceClient).toContain('/download-url');
    expect(evidenceClient).toContain('upload_status');
    expect(evidenceClient).toContain('malware_scan_status');

    const reportsClient = readRepoFile('apps/web/app/reports/ReportsClient.tsx');
    expect(reportsClient).toContain('/exports');
    expect(reportsClient).toContain('Export JSON');
    expect(reportsClient).toContain('Export Final PDF');
    expect(reportsClient).toContain('object storage');
  });

  it('documents new endpoints and governance boundaries', () => {
    const openapi = readRepoFile('04_API/openapi.yaml');
    for (const path of [
      '/evidence/upload-url:',
      '/evidence/complete-upload:',
      '/evidence/{evidenceId}/download-url:',
      '/evidence/{evidenceId}/download:',
      '/reports/{reportId}/exports:',
      '/report-exports/{exportId}/download-url:'
    ]) {
      expect(openapi).toContain(path);
    }
    const readme = readRepoFile('README.md');
    expect(readme).toContain('RC3-B');
    expect(readme).toContain('object storage stores original evidence files');
    expect(readme).toContain('AIM backend generates evidence codes');

    const n8nAddendum = readRepoFile('05_n8n/rc3b_object_storage_workflow_addendum.md');
    expect(n8nAddendum).toContain('n8n remains workflow orchestration only');
    expect(n8nAddendum).toContain('AIM-generated');
  });
});
