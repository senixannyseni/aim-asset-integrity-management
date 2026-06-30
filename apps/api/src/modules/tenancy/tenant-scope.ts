import type { Request } from 'express';
import { TenantContextError, type TenantContext } from './tenant-context.js';

type QueryParameter = string | number | boolean | null | Date;

export type TenantScopedQuery = {
  clause: string;
  params: QueryParameter[];
  nextIndex: number;
};

export type TenantScopedEntityRow = {
  tenant_id?: string | null;
  tenantId?: string | null;
};

export function requireTenantContextFromRequest(req: Request): TenantContext {
  if (!req.tenant) {
    throw new TenantContextError('TENANT_CONTEXT_REQUIRED', 'Tenant context is required before tenant-scoped route access.', 400);
  }
  return req.tenant;
}

export function tenantIdForInsert(req: Request): string {
  return requireTenantContextFromRequest(req).tenantId;
}

export function tenantWhereClause(alias = '', parameterIndex = 1): string {
  const normalizedAlias = alias.trim();
  const column = normalizedAlias ? `${normalizedAlias}.tenant_id` : 'tenant_id';
  return `${column} = $${parameterIndex}`;
}

export function appendTenantWhereClause(input: {
  baseWhere?: string;
  alias?: string;
  params?: QueryParameter[];
  tenant: TenantContext;
}): TenantScopedQuery {
  const params = [...(input.params ?? [])];
  params.push(input.tenant.tenantId);
  const tenantClause = tenantWhereClause(input.alias, params.length);
  const baseWhere = input.baseWhere?.trim();
  return {
    clause: baseWhere && baseWhere.length > 0 ? `${baseWhere} and ${tenantClause}` : `where ${tenantClause}`,
    params,
    nextIndex: params.length + 1
  };
}

export function assertTenantScopedRow(row: TenantScopedEntityRow | null | undefined, tenant: TenantContext): void {
  const rowTenantId = row?.tenant_id ?? row?.tenantId;
  if (!rowTenantId) {
    throw new TenantContextError('TENANT_BOUNDARY_REQUIRED', 'Tenant-scoped row is missing tenant_id.', 409);
  }
  if (rowTenantId !== tenant.tenantId) {
    throw new TenantContextError('TENANT_BOUNDARY_VIOLATION', 'Tenant-scoped row belongs to a different tenant.', 403);
  }
}

export function tenantScopeMetadata(tenant: TenantContext): Record<string, string> {
  return {
    tenant_id: tenant.tenantId,
    tenant_slug: tenant.tenantSlug,
    tenant_boundary: 'tenant-scoped-runtime-filter'
  };
}
