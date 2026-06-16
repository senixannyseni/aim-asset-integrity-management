import { describe, expect, it } from 'vitest';
import { buildEvidenceObjectPath, isSupportedEvidenceFileType, validateEvidenceLinkPayload, validateEvidenceUploadPayload } from '../src/modules/evidence/validation.js';
import { normalizeThicknessToMillimeters, validateNdtMeasurementPayload } from '../src/modules/ndt/validation.js';
import { canSetNdtReviewerStatus, evaluateNdtEvidenceGate } from '../src/modules/ndt/governance.js';
import { hasPermission } from '../src/rbac/roles.js';

describe('Evidence and NDT validation controls', () => {
  it('allows only supported evidence file types', () => {
    expect(isSupportedEvidenceFileType('PDF')).toBe(true);
    expect(isSupportedEvidenceFileType('.png')).toBe(true);
    expect(isSupportedEvidenceFileType('exe')).toBe(false);
  });

  it('builds the required evidence object path convention', () => {
    expect(buildEvidenceObjectPath({ assetTag: 'TK-001', inspectionId: 'INS-001', evidenceCode: 'EVD-2026-000001', fileName: 'report.pdf' })).toBe('/evidence/TK-001/INS-001/EVD-2026-000001/report.pdf');
  });

  it('validates evidence upload required metadata', () => {
    const issues = validateEvidenceUploadPayload({ file_type: 'PDF' });
    expect(issues.map((issue) => issue.field)).toContain('asset_id');
    expect(issues.map((issue) => issue.field)).toContain('checksum');
  });

  it('validates evidence link entity type', () => {
    const issues = validateEvidenceLinkPayload({ linked_entity_type: 'unsupported', linked_entity_id: 'id', link_reason: 'reason' });
    expect(issues.map((issue) => issue.field)).toContain('linked_entity_type');
  });

  it('normalizes NDT thickness units to millimeters', () => {
    expect(normalizeThicknessToMillimeters(1, 'inch')).toBe(25.4);
    expect(normalizeThicknessToMillimeters(1.2, 'cm')).toBe(12);
  });

  it('requires NDT core fields', () => {
    const issues = validateNdtMeasurementPayload({ component: 'shell' });
    expect(issues.map((issue) => issue.field)).toContain('asset_id');
    expect(issues.map((issue) => issue.field)).toContain('measured_thickness');
  });

  it('keeps NDT review separate from approval', () => {
    expect(canSetNdtReviewerStatus(['engineer'], 'reviewed')).toBe(true);
    expect(canSetNdtReviewerStatus(['engineer'], 'approved')).toBe(false);
    expect(canSetNdtReviewerStatus(['senior_engineer'], 'approved')).toBe(true);
  });

  it('blocks AI agent from NDT approval', () => {
    expect(hasPermission(['ai_agent'], 'ndt.approve')).toBe(false);
  });

  it('blocks critical NDT approval when evidence is missing', () => {
    const gate = evaluateNdtEvidenceGate({ isCritical: true });
    expect(gate.status).toBe('blocked');
  });
});
