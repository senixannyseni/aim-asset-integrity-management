import { sanitizeObjectKeyPart } from '../object-storage/object-storage-service.js';
import { TenantContextError } from './tenant-context.js';
import { buildTenantScopedObjectKey, tenantObjectStoragePrefix, type TenantObjectScope } from './tenant-object-boundary.js';

export type TenantOnboardingActorType = 'human' | 'ai' | 'n8n' | 'service';
export type TenantOnboardingStage = 'intake' | 'configuration' | 'evidence_ready' | 'support_ready' | 'ready_for_activation';
export type TenantOnboardingStatus = 'blocked' | 'ready_for_human_review' | 'approved_for_activation';
export type TenantSupportTier = 'pilot' | 'standard' | 'premium' | 'enterprise';
export type TenantSupportSeverity = 'sev1' | 'sev2' | 'sev3' | 'sev4';

export const TENANT_ONBOARDING_REQUIRED_GATES = [
  'tenant_context_confirmed',
  'tenant_admin_contact_confirmed',
  'evidence_lifecycle_policy_confirmed',
  'support_sla_profile_confirmed',
  'data_residency_confirmed',
  'human_onboarding_approval_present'
] as const;

export type TenantOnboardingRequiredGate = typeof TENANT_ONBOARDING_REQUIRED_GATES[number];

export type TenantSupportSlaProfile = {
  tenantId: string;
  tenantSlug: string;
  profileCode: string;
  supportTier: TenantSupportTier;
  timezone: string;
  sev1ResponseMinutes: number;
  sev2ResponseMinutes: number;
  escalationTargetMinutes: number;
  customerSuccessOwnerRole: 'Customer Success';
  supportOwnerRole: 'Operations';
  humanApprovalRequired: true;
  aiOrServiceActorMayApprove: false;
};

export type TenantOnboardingPlanInput = {
  tenant: TenantObjectScope;
  customerName: string;
  onboardingOwnerRole?: 'Customer Success' | 'Operations' | 'Engineering';
  supportSlaProfile: TenantSupportSlaProfile;
  completedGateKeys: string[];
  evidenceIds: string[];
  requestedByActorType: TenantOnboardingActorType;
  humanApprovalId?: string | null;
};

export type TenantOnboardingPlan = {
  tenantId: string;
  tenantSlug: string;
  customerName: string;
  onboardingStage: TenantOnboardingStage;
  status: TenantOnboardingStatus;
  onboardingOwnerRole: 'Customer Success' | 'Operations' | 'Engineering';
  supportSlaProfileId: string;
  readinessManifestObjectKey: string;
  completedGateKeys: string[];
  missingGateKeys: TenantOnboardingRequiredGate[];
  evidenceIds: string[];
  blockedReasons: string[];
  humanApprovalId?: string;
  humanApprovalRequired: true;
  aiOrServiceActorMayApprove: false;
};

export type TenantSupportEscalationReview = {
  tenantId: string;
  tenantSlug: string;
  supportCaseReference: string;
  severity: TenantSupportSeverity;
  status: 'requires_human_triage' | 'ready_for_customer_success_review' | 'approved_for_bau_handoff';
  responseTargetMinutes: number;
  escalationTargetMinutes: number;
  caseEvidenceObjectKey: string;
  blockedReasons: string[];
  humanApprovalRequired: true;
  aiOrServiceActorMayClose: false;
};

function normalizeText(value: string, fieldName: string, maxLength = 180): string {
  const normalized = value.trim().replace(/\s+/g, ' ').slice(0, maxLength);
  if (!normalized) {
    throw new TenantContextError('TENANT_ONBOARDING_FIELD_REQUIRED', `${fieldName} is required for tenant onboarding.`, 400);
  }
  return normalized;
}

function normalizeEvidenceIds(evidenceIds: string[]): string[] {
  return Array.from(new Set(evidenceIds.map((id) => id.trim()).filter(Boolean))).slice(0, 50);
}

function uniqueGateKeys(completedGateKeys: string[]): string[] {
  return Array.from(new Set(completedGateKeys.map((gate) => gate.trim()).filter(Boolean)));
}

function normalizeSupportCaseReference(value: string): string {
  const normalized = normalizeText(value, 'Support case reference', 128)
    .normalize('NFKD')
    .replace(/[\\/]+/g, '-')
    .replace(/\.\.+/g, '.')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/\.-+/g, '.')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 128);
  return normalized || 'support-case';
}

export function buildTenantSupportSlaProfile(input: {
  tenant: TenantObjectScope;
  profileCode: string;
  supportTier?: TenantSupportTier;
  timezone?: string;
  sev1ResponseMinutes?: number;
  sev2ResponseMinutes?: number;
  escalationTargetMinutes?: number;
}): TenantSupportSlaProfile {
  const profileCode = sanitizeObjectKeyPart(input.profileCode, 'tenant-sla');
  const supportTier = input.supportTier ?? 'standard';
  const timezone = normalizeText(input.timezone ?? 'UTC', 'Support timezone', 80);
  const sev1ResponseMinutes = input.sev1ResponseMinutes ?? (supportTier === 'enterprise' ? 30 : 60);
  const sev2ResponseMinutes = input.sev2ResponseMinutes ?? (supportTier === 'enterprise' ? 120 : 240);
  const escalationTargetMinutes = input.escalationTargetMinutes ?? (supportTier === 'enterprise' ? 240 : 480);

  if (sev1ResponseMinutes <= 0 || sev2ResponseMinutes <= 0 || escalationTargetMinutes <= 0) {
    throw new TenantContextError('TENANT_SUPPORT_SLA_INVALID', 'Tenant support SLA targets must be positive.', 400);
  }
  if (sev1ResponseMinutes > sev2ResponseMinutes) {
    throw new TenantContextError('TENANT_SUPPORT_SLA_INVALID', 'SEV1 response target cannot be slower than SEV2.', 400);
  }

  return {
    tenantId: input.tenant.tenantId,
    tenantSlug: input.tenant.tenantSlug,
    profileCode,
    supportTier,
    timezone,
    sev1ResponseMinutes,
    sev2ResponseMinutes,
    escalationTargetMinutes,
    customerSuccessOwnerRole: 'Customer Success',
    supportOwnerRole: 'Operations',
    humanApprovalRequired: true,
    aiOrServiceActorMayApprove: false
  };
}

export function buildTenantOnboardingPlan(input: TenantOnboardingPlanInput): TenantOnboardingPlan {
  const customerName = normalizeText(input.customerName, 'Customer name');
  const completedGateKeys = uniqueGateKeys(input.completedGateKeys);
  const evidenceIds = normalizeEvidenceIds(input.evidenceIds);
  const missingGateKeys = TENANT_ONBOARDING_REQUIRED_GATES.filter((gate) => !completedGateKeys.includes(gate));
  const blockedReasons: string[] = [];

  if (input.supportSlaProfile.tenantId !== input.tenant.tenantId) {
    blockedReasons.push('Support SLA profile belongs to a different tenant.');
  }
  if (evidenceIds.length === 0) {
    blockedReasons.push('Tenant onboarding evidence is required before activation.');
  }
  if (missingGateKeys.length > 0) {
    blockedReasons.push('Tenant onboarding readiness gates are incomplete.');
  }
  if (input.requestedByActorType !== 'human') {
    blockedReasons.push('AI/n8n/service actors cannot approve tenant onboarding, customer activation, support SLA, or BAU handoff.');
  }
  if (!input.humanApprovalId) {
    blockedReasons.push('Human onboarding approval evidence is required before tenant activation.');
  }

  const status: TenantOnboardingStatus = blockedReasons.length > 0
    ? 'blocked'
    : 'approved_for_activation';
  const onboardingStage: TenantOnboardingStage = status === 'approved_for_activation'
    ? 'ready_for_activation'
    : missingGateKeys.includes('evidence_lifecycle_policy_confirmed')
      ? 'configuration'
      : missingGateKeys.includes('support_sla_profile_confirmed')
        ? 'evidence_ready'
        : 'support_ready';

  return {
    tenantId: input.tenant.tenantId,
    tenantSlug: input.tenant.tenantSlug,
    customerName,
    onboardingStage,
    status,
    onboardingOwnerRole: input.onboardingOwnerRole ?? 'Customer Success',
    supportSlaProfileId: input.supportSlaProfile.profileCode,
    readinessManifestObjectKey: buildTenantScopedObjectKey(input.tenant, `onboarding/${sanitizeObjectKeyPart(customerName, 'customer')}/readiness-manifest.json`),
    completedGateKeys,
    missingGateKeys,
    evidenceIds,
    blockedReasons,
    humanApprovalId: input.humanApprovalId ?? undefined,
    humanApprovalRequired: true,
    aiOrServiceActorMayApprove: false
  };
}

export function assertTenantOnboardingReadyForActivation(plan: TenantOnboardingPlan): void {
  if (plan.status !== 'approved_for_activation' || plan.blockedReasons.length > 0 || plan.missingGateKeys.length > 0) {
    throw new TenantContextError('TENANT_ONBOARDING_NOT_APPROVED', 'Tenant onboarding is not approved for activation.', 403);
  }
}

export function buildTenantSupportEscalationReview(input: {
  tenant: TenantObjectScope;
  supportSlaProfile: TenantSupportSlaProfile;
  supportCaseReference: string;
  severity: TenantSupportSeverity;
  requestedByActorType: TenantOnboardingActorType;
  humanApprovalId?: string | null;
}): TenantSupportEscalationReview {
  const supportCaseReference = normalizeSupportCaseReference(input.supportCaseReference);
  const blockedReasons: string[] = [];
  if (input.supportSlaProfile.tenantId !== input.tenant.tenantId) {
    blockedReasons.push('Support case SLA profile belongs to a different tenant.');
  }
  if (input.requestedByActorType !== 'human') {
    blockedReasons.push('AI/n8n/service actors cannot close tenant support escalation, SLA exception, or BAU handoff reviews.');
  }
  if (!input.humanApprovalId) {
    blockedReasons.push('Human approval evidence is required before support escalation closure or BAU handoff.');
  }

  const responseTargetMinutes = input.severity === 'sev1'
    ? input.supportSlaProfile.sev1ResponseMinutes
    : input.severity === 'sev2'
      ? input.supportSlaProfile.sev2ResponseMinutes
      : input.supportSlaProfile.escalationTargetMinutes;

  return {
    tenantId: input.tenant.tenantId,
    tenantSlug: input.tenant.tenantSlug,
    supportCaseReference,
    severity: input.severity,
    status: blockedReasons.length > 0 ? 'requires_human_triage' : 'approved_for_bau_handoff',
    responseTargetMinutes,
    escalationTargetMinutes: input.supportSlaProfile.escalationTargetMinutes,
    caseEvidenceObjectKey: buildTenantScopedObjectKey(input.tenant, `support/${supportCaseReference}/review.json`),
    blockedReasons,
    humanApprovalRequired: true,
    aiOrServiceActorMayClose: false
  };
}

export function summarizeTenantOnboardingGate(plan: TenantOnboardingPlan): string {
  return [
    `tenant=${plan.tenantSlug}`,
    `status=${plan.status}`,
    `stage=${plan.onboardingStage}`,
    `missing_gates=${plan.missingGateKeys.length}`,
    `evidence_count=${plan.evidenceIds.length}`,
    'human_approval_required=true',
    'ai_or_service_actor_may_approve=false',
    `tenant_prefix=${tenantObjectStoragePrefix({ tenantId: plan.tenantId, tenantSlug: plan.tenantSlug })}`
  ].join(';');
}
