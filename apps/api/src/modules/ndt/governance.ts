import { hasPermission, type Role } from '../../rbac/roles.js';

export type NdtReviewerStatus = 'needs_review' | 'reviewed' | 'rejected' | 'approved';

export type NdtEvidenceGateInput = {
  isCritical: boolean;
  directEvidenceFileId?: string | null;
  linkedEvidenceFileIds?: string[];
};

export type NdtEvidenceGateResult = {
  status: 'pass' | 'warning' | 'blocked';
  reason: string;
};

export function canSetNdtReviewerStatus(roles: Role[], targetStatus: NdtReviewerStatus): boolean {
  if (targetStatus === 'approved') {
    return hasPermission(roles, 'ndt.approve');
  }

  return hasPermission(roles, 'ndt.review');
}

export function evaluateNdtEvidenceGate(input: NdtEvidenceGateInput): NdtEvidenceGateResult {
  const hasDirectEvidence = Boolean(input.directEvidenceFileId);
  const hasLinkedEvidence = (input.linkedEvidenceFileIds ?? []).length > 0;

  if (hasDirectEvidence || hasLinkedEvidence) {
    return {
      status: 'pass',
      reason: 'NDT record has traceable evidence through direct evidence_file_id or evidence_links.'
    };
  }

  if (input.isCritical) {
    return {
      status: 'blocked',
      reason: 'Critical NDT record cannot be approved without traceable evidence.'
    };
  }

  return {
    status: 'warning',
    reason: 'Non-critical NDT record has no linked evidence; engineering review required.'
  };
}
