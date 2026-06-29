export const DEFAULT_SINGLE_TENANT_ID = '00000000-0000-0000-0000-000000000001';
export const DEFAULT_SINGLE_TENANT_SLUG = 'default';
export const DEFAULT_SINGLE_TENANT_NAME = 'Default AIM Tenant';

export type TenantStatus = 'active' | 'suspended' | 'archived';

export type TenantMembership = {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  status: TenantStatus;
  isDefault: boolean;
  roleScope: string[];
};

export type TenantContext = {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  status: TenantStatus;
  selectedBy: 'request_header' | 'default_membership' | 'local_demo_fallback';
};

export type TenantResolutionInput = {
  requestedTenantId?: string;
  requestedTenantSlug?: string;
  authType: 'jwt' | 'local_demo';
  memberships: TenantMembership[];
  allowLegacySingleTenantFallback?: boolean;
};

export class TenantContextError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(code: string, message: string, statusCode = 403) {
    super(message);
    this.name = 'TenantContextError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

function normalizeHeader(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export function defaultLocalDemoTenantMembership(): TenantMembership {
  return {
    tenantId: DEFAULT_SINGLE_TENANT_ID,
    tenantSlug: DEFAULT_SINGLE_TENANT_SLUG,
    tenantName: DEFAULT_SINGLE_TENANT_NAME,
    status: 'active',
    isDefault: true,
    roleScope: []
  };
}

export function normalizeTenantMemberships(value: unknown): TenantMembership[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item): TenantMembership[] => {
    if (!item || typeof item !== 'object') return [];
    const record = item as Record<string, unknown>;
    const tenantId = typeof record.tenantId === 'string' ? record.tenantId : typeof record.tenant_id === 'string' ? record.tenant_id : '';
    const tenantSlug = typeof record.tenantSlug === 'string' ? record.tenantSlug : typeof record.tenant_slug === 'string' ? record.tenant_slug : '';
    const tenantName = typeof record.tenantName === 'string' ? record.tenantName : typeof record.tenant_name === 'string' ? record.tenant_name : tenantSlug;
    const statusValue = typeof record.status === 'string' ? record.status : 'active';
    const status: TenantStatus = statusValue === 'suspended' || statusValue === 'archived' ? statusValue : 'active';
    const isDefault = Boolean(record.isDefault ?? record.is_default);
    const rawRoleScope = record.roleScope ?? record.role_scope;
    const roleScope = Array.isArray(rawRoleScope) ? rawRoleScope.filter((entry): entry is string => typeof entry === 'string') : [];

    if (!tenantId || !tenantSlug) return [];
    return [{ tenantId, tenantSlug, tenantName, status, isDefault, roleScope }];
  });
}

export function resolveTenantContext(input: TenantResolutionInput): TenantContext {
  const requestedTenantId = normalizeHeader(input.requestedTenantId);
  const requestedTenantSlug = normalizeHeader(input.requestedTenantSlug);
  const memberships = normalizeTenantMemberships(input.memberships);

  if (memberships.length === 0 && input.authType === 'local_demo') {
    const fallback = defaultLocalDemoTenantMembership();
    return {
      tenantId: fallback.tenantId,
      tenantSlug: fallback.tenantSlug,
      tenantName: fallback.tenantName,
      status: fallback.status,
      selectedBy: 'local_demo_fallback'
    };
  }

  if (memberships.length === 0 && input.allowLegacySingleTenantFallback) {
    const fallback = defaultLocalDemoTenantMembership();
    return {
      tenantId: fallback.tenantId,
      tenantSlug: fallback.tenantSlug,
      tenantName: fallback.tenantName,
      status: fallback.status,
      selectedBy: 'local_demo_fallback'
    };
  }

  const activeMemberships = memberships.filter((membership) => membership.status === 'active');
  if (activeMemberships.length === 0) {
    throw new TenantContextError('TENANT_CONTEXT_REQUIRED', 'No active tenant membership is available for this user.');
  }

  if (requestedTenantId || requestedTenantSlug) {
    const selected = activeMemberships.find((membership) => {
      return (requestedTenantId && membership.tenantId === requestedTenantId) ||
        (requestedTenantSlug && membership.tenantSlug === requestedTenantSlug);
    });

    if (!selected) {
      throw new TenantContextError('TENANT_ACCESS_DENIED', 'Requested tenant is not available to the authenticated user.');
    }

    return {
      tenantId: selected.tenantId,
      tenantSlug: selected.tenantSlug,
      tenantName: selected.tenantName,
      status: selected.status,
      selectedBy: 'request_header'
    };
  }

  const selected = activeMemberships.find((membership) => membership.isDefault) ?? activeMemberships[0];
  if (!selected) {
    throw new TenantContextError('TENANT_CONTEXT_REQUIRED', 'No active tenant membership is available for this user.');
  }

  return {
    tenantId: selected.tenantId,
    tenantSlug: selected.tenantSlug,
    tenantName: selected.tenantName,
    status: selected.status,
    selectedBy: 'default_membership'
  };
}

export function assertTenantBoundary(entityTenantId: string | null | undefined, context: TenantContext): void {
  if (!entityTenantId) {
    throw new TenantContextError('TENANT_BOUNDARY_REQUIRED', 'Tenant-scoped entity is missing tenant_id.');
  }
  if (entityTenantId !== context.tenantId) {
    throw new TenantContextError('TENANT_BOUNDARY_VIOLATION', 'Tenant-scoped entity belongs to a different tenant.');
  }
}

export function tenantScopedColumn(alias = ''): string {
  const normalizedAlias = alias.trim();
  return normalizedAlias ? `${normalizedAlias}.tenant_id` : 'tenant_id';
}

export function tenantScopedWhereClause(alias = '', parameterName = '$tenantId'): string {
  return `${tenantScopedColumn(alias)} = ${parameterName}`;
}
