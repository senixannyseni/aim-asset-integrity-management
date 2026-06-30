import { sanitizeObjectKeyPart } from '../object-storage/object-storage-service.js';
import { assertTenantObjectKeyBoundary, buildTenantScopedObjectKey, tenantObjectStoragePrefix, type TenantObjectScope } from './tenant-object-boundary.js';
import { TenantContextError } from './tenant-context.js';

export type TenantEvidenceRetentionClass = 'standard_7_years' | 'legal_hold' | 'customer_contractual' | 'pilot_short_term';
export type TenantLifecycleAction = 'retain' | 'archive' | 'restore' | 'export' | 'delete_request';
export type TenantExportReviewStatus = 'blocked' | 'ready_for_human_review' | 'approved_for_execution';

export type TenantEvidenceLifecyclePolicy = {
  tenantId: string;
  tenantSlug: string;
  retentionClass: TenantEvidenceRetentionClass;
  retentionDays: number;
  archiveAfterDays: number;
  legalHoldRequired: boolean;
  tenantObjectPrefix: string;
  backupScopePrefix: string;
  exportRequiresHumanApproval: true;
  restoreRequiresHumanApproval: true;
  deleteRequiresHumanApproval: true;
};

export type TenantBackupRestoreScope = {
  tenantId: string;
  tenantSlug: string;
  operationId: string;
  operationType: 'backup' | 'restore' | 'dr_rehearsal';
  sourcePrefix: string;
  restoreTargetPrefix: string;
  evidencePrefix: string;
  reportExportPrefix: string;
  requiresHumanApproval: true;
  aiOrServiceActorMayApprove: false;
};

export type TenantExportControlReviewInput = {
  tenant: TenantObjectScope;
  exportId: string;
  requestedObjectKeys: string[];
  requestedByActorType: 'human' | 'ai' | 'n8n' | 'service';
  purpose: string;
  humanApprovalId?: string | null;
};

export type TenantExportControlReview = {
  tenantId: string;
  tenantSlug: string;
  exportId: string;
  status: TenantExportReviewStatus;
  allowedObjectKeys: string[];
  blockedObjectKeys: string[];
  blockedReasons: string[];
  purpose: string;
  humanApprovalId?: string;
  exportManifestKey: string;
};

export function buildTenantEvidenceLifecyclePolicy(
  tenant: TenantObjectScope,
  overrides: Partial<Pick<TenantEvidenceLifecyclePolicy, 'retentionClass' | 'retentionDays' | 'archiveAfterDays' | 'legalHoldRequired'>> = {}
): TenantEvidenceLifecyclePolicy {
  const retentionClass = overrides.retentionClass ?? 'standard_7_years';
  const retentionDays = overrides.retentionDays ?? 2555;
  const archiveAfterDays = overrides.archiveAfterDays ?? 365;
  const legalHoldRequired = overrides.legalHoldRequired ?? retentionClass === 'legal_hold';
  const tenantObjectPrefix = tenantObjectStoragePrefix(tenant);

  if (archiveAfterDays > retentionDays) {
    throw new TenantContextError('TENANT_LIFECYCLE_POLICY_INVALID', 'Archive timing cannot exceed total tenant retention period.', 400);
  }

  return {
    tenantId: tenant.tenantId,
    tenantSlug: tenant.tenantSlug,
    retentionClass,
    retentionDays,
    archiveAfterDays,
    legalHoldRequired,
    tenantObjectPrefix,
    backupScopePrefix: `${tenantObjectPrefix}/backups`,
    exportRequiresHumanApproval: true,
    restoreRequiresHumanApproval: true,
    deleteRequiresHumanApproval: true
  };
}

export function assertTenantEvidenceLifecycleObjectKey(tenant: TenantObjectScope, objectKey: string): void {
  assertTenantObjectKeyBoundary(objectKey, tenant);
}

export function buildTenantBackupRestoreScope(input: {
  tenant: TenantObjectScope;
  operationId: string;
  operationType: TenantBackupRestoreScope['operationType'];
}): TenantBackupRestoreScope {
  const operationPart = sanitizeObjectKeyPart(input.operationId, 'operation');
  const sourcePrefix = tenantObjectStoragePrefix(input.tenant);
  return {
    tenantId: input.tenant.tenantId,
    tenantSlug: input.tenant.tenantSlug,
    operationId: operationPart,
    operationType: input.operationType,
    sourcePrefix,
    restoreTargetPrefix: buildTenantScopedObjectKey(input.tenant, `restore/${operationPart}`),
    evidencePrefix: buildTenantScopedObjectKey(input.tenant, 'evidence'),
    reportExportPrefix: buildTenantScopedObjectKey(input.tenant, 'reports'),
    requiresHumanApproval: true,
    aiOrServiceActorMayApprove: false
  };
}

function normalizePurpose(purpose: string): string {
  const normalized = purpose.trim().replace(/\s+/g, ' ').slice(0, 180);
  if (!normalized) {
    throw new TenantContextError('TENANT_EXPORT_PURPOSE_REQUIRED', 'Tenant export purpose is required for human review.', 400);
  }
  return normalized;
}

export function buildTenantExportControlReview(input: TenantExportControlReviewInput): TenantExportControlReview {
  const purpose = normalizePurpose(input.purpose);
  const allowedObjectKeys: string[] = [];
  const blockedObjectKeys: string[] = [];
  const blockedReasons: string[] = [];

  for (const objectKey of input.requestedObjectKeys) {
    try {
      assertTenantObjectKeyBoundary(objectKey, input.tenant);
      allowedObjectKeys.push(objectKey);
    } catch {
      blockedObjectKeys.push(objectKey);
    }
  }

  if (blockedObjectKeys.length > 0) {
    blockedReasons.push('Cross-tenant or malformed object key requested.');
  }
  if (input.requestedByActorType !== 'human') {
    blockedReasons.push('AI/n8n/service actors cannot approve tenant export, restore, backup, or lifecycle actions.');
  }
  if (!input.humanApprovalId) {
    blockedReasons.push('Human approval evidence is required before export execution.');
  }

  const exportPart = sanitizeObjectKeyPart(input.exportId, 'export');
  const status: TenantExportReviewStatus = blockedReasons.length > 0
    ? 'blocked'
    : input.humanApprovalId
      ? 'approved_for_execution'
      : 'ready_for_human_review';

  return {
    tenantId: input.tenant.tenantId,
    tenantSlug: input.tenant.tenantSlug,
    exportId: exportPart,
    status,
    allowedObjectKeys,
    blockedObjectKeys,
    blockedReasons,
    purpose,
    humanApprovalId: input.humanApprovalId ?? undefined,
    exportManifestKey: buildTenantScopedObjectKey(input.tenant, `exports/${exportPart}/manifest.json`)
  };
}

export function assertTenantExportControlApproved(review: TenantExportControlReview): void {
  if (review.status !== 'approved_for_execution' || review.blockedReasons.length > 0 || review.blockedObjectKeys.length > 0) {
    throw new TenantContextError('TENANT_EXPORT_CONTROL_NOT_APPROVED', 'Tenant export is not approved for execution.', 403);
  }
}

export function summarizeTenantEvidenceLifecycleGate(policy: TenantEvidenceLifecyclePolicy): string {
  return [
    `tenant=${policy.tenantSlug}`,
    `retention=${policy.retentionClass}`,
    `retention_days=${policy.retentionDays}`,
    `archive_after_days=${policy.archiveAfterDays}`,
    'export_requires_human_approval=true',
    'restore_requires_human_approval=true',
    'delete_requires_human_approval=true'
  ].join(';');
}
