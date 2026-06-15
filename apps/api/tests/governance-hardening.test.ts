import { describe, expect, it } from 'vitest';
import { hasPermission } from '../src/rbac/roles.js';
import { canSetNdtReviewerStatus, evaluateNdtEvidenceGate } from '../src/modules/ndt/governance.js';

describe('AIM governance hardening controls', () => {
  it('requires ndt.approve for NDT approval status', () => {
    expect(canSetNdtReviewerStatus(['engineer'], 'reviewed')).toBe(true);
    expect(canSetNdtReviewerStatus(['engineer'], 'approved')).toBe(false);
    expect(canSetNdtReviewerStatus(['senior_engineer'], 'approved')).toBe(true);
  });

  it('blocks ai_agent from approval permissions', () => {
    expect(hasPermission(['ai_agent'], 'ndt.approve')).toBe(false);
    expect(hasPermission(['ai_agent'], 'calculation.approve')).toBe(false);
    expect(hasPermission(['ai_agent'], 'report.issue')).toBe(false);
  });

  it('passes NDT evidence gate when direct evidence exists', () => {
    const result = evaluateNdtEvidenceGate({ isCritical: true, directEvidenceFileId: 'evidence-1' });
    expect(result.status).toBe('pass');
  });

  it('passes NDT evidence gate when evidence_links exist', () => {
    const result = evaluateNdtEvidenceGate({ isCritical: true, linkedEvidenceFileIds: ['evidence-1'] });
    expect(result.status).toBe('pass');
  });

  it('blocks critical NDT approval when evidence is missing', () => {
    const result = evaluateNdtEvidenceGate({ isCritical: true });
    expect(result.status).toBe('blocked');
  });

  it('warns instead of blocks when a non-critical NDT record lacks evidence', () => {
    const result = evaluateNdtEvidenceGate({ isCritical: false });
    expect(result.status).toBe('warning');
  });
});
