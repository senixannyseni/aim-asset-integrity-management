import { sanitizeObjectKeyPart } from '../object-storage/object-storage-service.js';
import { TenantContextError, type TenantContext } from './tenant-context.js';

export type TenantObjectScope = Pick<TenantContext, 'tenantId' | 'tenantSlug'>;

const UNSAFE_URL_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//i;
const UNSAFE_OBJECT_KEY_CHARS = /[?#]/;

export function tenantObjectStoragePrefix(tenant: TenantObjectScope): string {
  const slug = sanitizeObjectKeyPart(tenant.tenantSlug, 'tenant');
  const tenantId = sanitizeObjectKeyPart(tenant.tenantId, 'tenant-id');
  return `tenants/${slug}/${tenantId}`;
}

export function normalizeRelativeObjectKey(relativeObjectKey: string): string {
  const rawKey = relativeObjectKey.trim();
  if (!rawKey || UNSAFE_URL_PATTERN.test(rawKey) || UNSAFE_OBJECT_KEY_CHARS.test(rawKey)) {
    throw new TenantContextError(
      'TENANT_OBJECT_KEY_INVALID',
      'Object-storage key must be a relative key without traversal, query-string, fragment, or signed URL content.',
      400
    );
  }

  const normalized = rawKey
    .replace(/^\/+/, '')
    .replace(/\\+/g, '/')
    .replace(/\/+/g, '/');

  if (!normalized || normalized.includes('..') || UNSAFE_URL_PATTERN.test(normalized) || UNSAFE_OBJECT_KEY_CHARS.test(normalized)) {
    throw new TenantContextError(
      'TENANT_OBJECT_KEY_INVALID',
      'Object-storage key must be a relative key without traversal, query-string, fragment, or signed URL content.',
      400
    );
  }
  return normalized;
}

export function buildTenantScopedObjectKey(tenant: TenantObjectScope, relativeObjectKey: string): string {
  return `${tenantObjectStoragePrefix(tenant)}/${normalizeRelativeObjectKey(relativeObjectKey)}`;
}

export function isTenantScopedObjectKey(objectKey: string, tenant: TenantObjectScope): boolean {
  const normalized = normalizeRelativeObjectKey(objectKey);
  return normalized.startsWith(`${tenantObjectStoragePrefix(tenant)}/`);
}

export function assertTenantObjectKeyBoundary(objectKey: string, tenant: TenantObjectScope): void {
  if (!isTenantScopedObjectKey(objectKey, tenant)) {
    throw new TenantContextError('TENANT_OBJECT_KEY_BOUNDARY_VIOLATION', 'Object-storage key is outside the selected tenant boundary.', 403);
  }
}
