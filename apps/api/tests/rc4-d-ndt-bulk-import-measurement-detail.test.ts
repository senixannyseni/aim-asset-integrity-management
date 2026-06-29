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

describe('RC4-D NDT bulk import UX and measurement detail regression', () => {
  it('keeps NDT list/manual entry/bulk import and measurement detail routes available', () => {
    const ndtPage = expectFile('apps/web/app/ndt/page.tsx');
    const ndtClient = expectFile('apps/web/app/ndt/NdtDataRoomClient.tsx');
    const measurementDetail = expectFile('apps/web/app/ndt/[measurementId]/page.tsx');

    expect(ndtPage).toContain('NdtDataRoomClient');
    expect(ndtClient).toContain('RC4-D');
    expect(ndtClient).toContain('/api/v1/ndt/measurements');
    expect(ndtClient).toContain('/api/v1/ndt/measurements/bulk-import');
    expect(ndtClient).toContain('CSV');
    expect(ndtClient).toContain('XLSX');
    expect(ndtClient).toContain('Status badges display existing validation/reviewer values');
    expect(measurementDetail).toContain('RC4-P');
    expect(measurementDetail).toContain('/api/v1/ndt/measurements/${params.measurementId}');
    expect(measurementDetail).toContain('/api/v1/ndt/measurements/${params.measurementId}/readiness');
    expect(measurementDetail).toContain('Evidence links route to the RC4-C evidence detail page');
    expect(measurementDetail).toContain('No minimum-thickness, FFS, RBI, or API/ASME formula is computed here');
  });

  it('keeps RC4-D release and UAT evidence aligned with NDT governance boundaries', () => {
    const release = expectFile('docs/release/AIM_RC4D_ndt_bulk_import_measurement_detail_report.md');
    const uat = expectFile('docs/uat/uat_rc4d_ndt_bulk_import_measurement_detail.md');

    for (const content of [release, uat]) {
      expect(content).toContain('RC4-D');
      expect(content).toContain('NDT');
      expect(content).toContain('bulk-import');
      expect(content).toContain('Measurement Detail');
      expect(content).not.toMatch(/x-full-api-579-implemented:\s*true/i);
      expect(content).not.toMatch(/x-full-api-581-implemented:\s*true/i);
      expect(content).not.toMatch(/minimum thickness formula implemented/i);
    }

    expect(release).toContain('does not approve NDT records');
    expect(release).toContain('does not calculate engineering outcomes');
    expect(uat).toContain('does not add');
  });

  it('does not introduce approval, finalization, FFS/RBI, or formula execution through NDT UI', () => {
    const ndtClient = readRepoFile('apps/web/app/ndt/NdtDataRoomClient.tsx');
    const measurementDetail = readRepoFile('apps/web/app/ndt/[measurementId]/page.tsx');

    for (const content of [ndtClient, measurementDetail]) {
      expect(content).not.toMatch(/apiFetch\([^)]*\/approve/i);
      expect(content).not.toMatch(/apiFetch\([^)]*\/finalize/i);
      expect(content).not.toMatch(/insert into ffs_cases/i);
      expect(content).not.toMatch(/insert into rbi_cases/i);
      expect(content).not.toMatch(/API\s*579\s*formula/i);
      expect(content).not.toMatch(/API\s*581\s*formula/i);
      expect(content).not.toMatch(/remaining_life\s*=/i);
      expect(content).not.toMatch(/minimum_thickness\s*=/i);
    }
  });
});
