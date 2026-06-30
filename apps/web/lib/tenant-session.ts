export type AimTenantSelection = {
  tenantId?: string;
  tenantSlug?: string;
  tenantName?: string;
};

const TENANT_ID_STORAGE_KEY = 'aim.selectedTenantId';
const TENANT_SLUG_STORAGE_KEY = 'aim.selectedTenantSlug';
const TENANT_NAME_STORAGE_KEY = 'aim.selectedTenantName';
export const AIM_TENANT_SELECTION_EVENT = 'aim:tenant-selection-changed';

function browserSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function normalize(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function getAimTenantSelection(): AimTenantSelection {
  const storage = browserSessionStorage();
  if (!storage) return {};
  return {
    tenantId: normalize(storage.getItem(TENANT_ID_STORAGE_KEY)),
    tenantSlug: normalize(storage.getItem(TENANT_SLUG_STORAGE_KEY)),
    tenantName: normalize(storage.getItem(TENANT_NAME_STORAGE_KEY))
  };
}

export function setAimTenantSelection(selection: AimTenantSelection): void {
  const storage = browserSessionStorage();
  if (!storage) return;

  const tenantId = normalize(selection.tenantId);
  const tenantSlug = normalize(selection.tenantSlug);
  const tenantName = normalize(selection.tenantName);

  if (tenantId) storage.setItem(TENANT_ID_STORAGE_KEY, tenantId);
  else storage.removeItem(TENANT_ID_STORAGE_KEY);

  if (tenantSlug) storage.setItem(TENANT_SLUG_STORAGE_KEY, tenantSlug);
  else storage.removeItem(TENANT_SLUG_STORAGE_KEY);

  if (tenantName) storage.setItem(TENANT_NAME_STORAGE_KEY, tenantName);
  else storage.removeItem(TENANT_NAME_STORAGE_KEY);

  window.dispatchEvent(new CustomEvent(AIM_TENANT_SELECTION_EVENT, { detail: { tenantId, tenantSlug, tenantName } }));
}

export function clearAimTenantSelection(): void {
  setAimTenantSelection({});
}

export function tenantSelectionLabel(selection: AimTenantSelection, fallback = 'Default tenant'): string {
  return selection.tenantName ?? selection.tenantSlug ?? selection.tenantId ?? fallback;
}
