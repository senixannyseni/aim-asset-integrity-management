'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../lib/api-client';
import { clearAimTenantSelection, getAimTenantSelection, setAimTenantSelection, tenantSelectionLabel } from '../../lib/tenant-session';

type TenantMembershipView = {
  tenant_id: string;
  tenant_slug: string;
  tenant_name: string;
  status: string;
  is_default: boolean;
};

type TenantContextView = {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  status: string;
  selectedBy: string;
};

type TenantContextPayload = {
  tenant_context?: TenantContextView;
  available_tenants?: TenantMembershipView[];
  governance?: Record<string, unknown>;
  error?: { code?: string; message?: string };
};

type TenantIsolationHealthPayload = {
  tenant_id?: string;
  tenant_slug?: string;
  isolation_controls?: string[];
  n8n_boundary?: string;
  system_of_record?: string;
  error?: { code?: string; message?: string };
};

function ErrorPanel({ message }: { message: string }) {
  return (
    <section className="error-list" role="alert">
      <h2>Tenant context unavailable</h2>
      <p>{message}</p>
    </section>
  );
}

export default function TenantAdminClient() {
  const [tenantContext, setTenantContext] = useState<TenantContextView | null>(null);
  const [availableTenants, setAvailableTenants] = useState<TenantMembershipView[]>([]);
  const [health, setHealth] = useState<TenantIsolationHealthPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const storedSelection = useMemo(() => getAimTenantSelection(), [tenantContext?.tenantId]);
  const selectedLabel = tenantContext?.tenantName ?? tenantSelectionLabel(storedSelection, 'Default tenant');

  async function loadTenantAdmin() {
    setLoading(true);
    setMessage(null);
    try {
      const [contextResponse, healthResponse] = await Promise.all([
        apiFetch('/api/v1/tenant/context', { cache: 'no-store' }),
        apiFetch('/api/v1/tenant/isolation-health', { cache: 'no-store' })
      ]);

      const contextPayload = await contextResponse.json() as TenantContextPayload;
      const healthPayload = await healthResponse.json() as TenantIsolationHealthPayload;

      if (!contextResponse.ok) {
        setTenantContext(null);
        setAvailableTenants([]);
        setHealth(null);
        setMessage(contextPayload.error?.message ?? 'The current user does not have readable tenant context.');
        return;
      }

      setTenantContext(contextPayload.tenant_context ?? null);
      setAvailableTenants(contextPayload.available_tenants ?? []);
      setHealth(healthResponse.ok ? healthPayload : null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Tenant admin data could not be loaded.');
      setTenantContext(null);
      setAvailableTenants([]);
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTenantAdmin();
  }, []);

  function chooseTenant(tenant: TenantMembershipView) {
    setAimTenantSelection({ tenantId: tenant.tenant_id, tenantSlug: tenant.tenant_slug, tenantName: tenant.tenant_name });
    window.location.reload();
  }

  function resetTenant() {
    clearAimTenantSelection();
    window.location.reload();
  }

  if (loading) {
    return <section className="notice" role="status"><h2>Loading tenant context</h2><p>Checking current tenant membership and isolation health.</p></section>;
  }

  if (message) {
    return <ErrorPanel message={message} />;
  }

  return (
    <div className="aim-tenant-admin-page">
      <section className="aim-page-hero aim-tenant-hero">
        <div>
          <p className="eyebrow">Enterprise multi-tenant runtime Sprint 4</p>
          <h1>Tenant UX & Admin Console</h1>
          <p>
            Tenant context is visible in the frontend, but authority remains backend-enforced through RBAC,
            tenant membership, and tenant boundary checks. Frontend tenant selection only sends
            x-aim-tenant-id / x-aim-tenant-slug headers for subsequent requests.
          </p>
        </div>
        <div className="aim-tenant-hero__card">
          <span className="aim-tenant-hero__label">Current tenant</span>
          <strong>{selectedLabel}</strong>
          <span>{tenantContext?.tenantSlug ?? storedSelection.tenantSlug ?? 'default'} · {tenantContext?.selectedBy ?? 'frontend-selected header'}</span>
        </div>
      </section>

      <section className="aim-preview-grid-3">
        <article className="aim-preview-card">
          <span className="aim-preview-card__label">Tenant ID</span>
          <strong>{tenantContext?.tenantId ?? storedSelection.tenantId ?? '-'}</strong>
          <p>Resolved by the API from authenticated membership, not trusted from frontend alone.</p>
        </article>
        <article className="aim-preview-card">
          <span className="aim-preview-card__label">Tenant status</span>
          <strong>{tenantContext?.status ?? 'unknown'}</strong>
          <p>Inactive or unavailable tenants are blocked by backend tenant context middleware.</p>
        </article>
        <article className="aim-preview-card">
          <span className="aim-preview-card__label">System boundary</span>
          <strong>AIM system of record</strong>
          <p>n8n remains orchestration-only; AI/n8n/service actors cannot approve tenant admin changes.</p>
        </article>
      </section>

      <section className="aim-split-panels">
        <article className="aim-panel">
          <div className="aim-panel__head">
            <div>
              <p className="eyebrow">Memberships</p>
              <h2>Available tenant contexts</h2>
            </div>
            <button type="button" className="secondary-button" onClick={resetTenant}>Use default membership</button>
          </div>
          <div className="aim-tenant-list">
            {availableTenants.map((tenant) => {
              const active = tenantContext?.tenantId === tenant.tenant_id;
              return (
                <div key={tenant.tenant_id} className={active ? 'aim-tenant-row is-active' : 'aim-tenant-row'}>
                  <div>
                    <strong>{tenant.tenant_name}</strong>
                    <p>{tenant.tenant_slug} · {tenant.status}{tenant.is_default ? ' · default' : ''}</p>
                  </div>
                  <button type="button" className="secondary-button" disabled={active || tenant.status !== 'active'} onClick={() => chooseTenant(tenant)}>
                    {active ? 'Current' : 'Switch'}
                  </button>
                </div>
              );
            })}
          </div>
        </article>

        <article className="aim-panel">
          <div className="aim-panel__head">
            <div>
              <p className="eyebrow">Isolation health</p>
              <h2>Backend controls</h2>
            </div>
          </div>
          <ul className="aim-control-list">
            {(health?.isolation_controls ?? [
              'Tenant context endpoint unavailable or not authorized for this user.',
              'Backend still enforces membership and RBAC on tenant-aware routes.'
            ]).map((control) => <li key={control}>{control}</li>)}
          </ul>
          <div className="aim-tenant-boundary-note">
            <strong>{health?.system_of_record ?? 'AIM remains the system of record'}</strong>
            <span>{health?.n8n_boundary ?? 'n8n remains orchestration-only'}</span>
          </div>
        </article>
      </section>

      <section className="aim-panel">
        <p className="eyebrow">Human authority boundary</p>
        <h2>What this console does not do</h2>
        <div className="aim-preview-grid-3">
          <article className="aim-preview-card"><strong>No tenant creation</strong><p>This Sprint 4 page is read/switch UX only; provisioning belongs to a reviewed backend onboarding flow.</p></article>
          <article className="aim-preview-card"><strong>No approval delegation</strong><p>AI/n8n/service actors cannot approve tenant membership, isolation readiness, or tenant admin changes.</p></article>
          <article className="aim-preview-card"><strong>No frontend enforcement claim</strong><p>Frontend visibility improves usability; backend RBAC and tenant filters remain the enforcement layer.</p></article>
        </div>
      </section>
    </div>
  );
}
