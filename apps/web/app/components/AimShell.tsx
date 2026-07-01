'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { apiFetch, clearAimAccessToken, getAimAccessToken } from '../../lib/api-client';
import { AIM_TENANT_SELECTION_EVENT, clearAimTenantSelection, getAimTenantSelection, setAimTenantSelection, tenantSelectionLabel } from '../../lib/tenant-session';

type NavItem = {
  href: string;
  label: string;
  icon: string;
  match?: string[];
  exact?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

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
  error?: { code?: string; message?: string };
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Asset & Inspection',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: '⊞', match: ['/', '/dashboard'] },
      { href: '/assets', label: 'Asset Register', icon: '🏭' },
      { href: '/integrity-workspace', label: 'Integrity Workspace', icon: '🧭' },
      { href: '/inspections', label: 'Inspection Workspace', icon: '📋' },
      { href: '/findings', label: 'Findings', icon: '⚠️' }
    ]
  },
  {
    label: 'Evidence & Document',
    items: [
      { href: '/evidence', label: 'Evidence Repository', icon: '📁' },
      { href: '/evidence-traceability', label: 'Evidence Traceability', icon: '🔗' },
      { href: '/ai-extraction', label: 'AI Extraction', icon: '📷', match: ['/ai-extraction', '/ai-photo-extraction'] },
      { href: '/reviews', label: 'AI Field Review', icon: '🤖' },
      { href: '/ndt', label: 'NDT Data Room', icon: '📡', match: ['/ndt', '/ndt-data-room'] }
    ]
  },
  {
    label: 'Engineering',
    items: [
      { href: '/calculations', label: 'Calculation Workbook', icon: '🔢' },
      { href: '/formulas', label: 'Formula Registry', icon: 'ƒx' },
      { href: '/integrity-decisions', label: 'Integrity Decision', icon: '🛡' },
      { href: '/ffs', label: 'FFS Cases', icon: '🧪' },
      { href: '/rbi', label: 'RBI Interface', icon: '📈' }
    ]
  },
  {
    label: 'Report & Action',
    items: [
      { href: '/reports', label: 'Reports', icon: '📄' },
      { href: '/work-orders', label: 'Work Orders', icon: '🔧' },
      { href: '/workflow-console', label: 'Workflow Console', icon: '⚡' },
      { href: '/audit-logs', label: 'Audit Logs', icon: '📜' }
    ]
  },
  {
    label: 'Admin & Release',
    items: [
      { href: '/admin-governance', label: 'Admin Governance', icon: '⚙' },
      { href: '/tenant-admin', label: 'Tenant Admin', icon: '🏢' },
      { href: '/data-dictionary', label: 'Data Dictionary', icon: '📚' },
      { href: '/validation', label: 'Validation Overview', icon: '🧾', exact: true },
      { href: '/validation/history', label: 'Validation History', icon: '🕘' },
      { href: '/security-monitoring', label: 'Security Monitoring', icon: '🔐' },
      { href: '/golive-readiness', label: 'Go-Live Readiness', icon: '✅' },
      { href: '/production-validation', label: 'Production Validation', icon: '🚀' },
      { href: '/release-closure', label: 'Release Closure', icon: '🏁' }
    ]
  }
];

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Asset health overview and pending actions' },
  '/dashboard': { title: 'Dashboard', subtitle: 'Asset health overview and pending actions' },
  '/assets': { title: 'Asset Register', subtitle: 'Manage atmospheric storage tanks and asset integrity context' },
  '/integrity-workspace': { title: 'Integrity Workspace', subtitle: 'End-to-end asset integrity package chain' },
  '/inspections': { title: 'Inspection Workspace', subtitle: 'Create, manage, and review inspection packages' },
  '/findings': { title: 'Findings', subtitle: 'Review anomalies, severities, actions, and evidence linkage' },
  '/evidence': { title: 'Evidence Repository', subtitle: 'Upload, verify, and link controlled inspection evidence' },
  '/evidence-traceability': { title: 'Evidence Traceability', subtitle: 'Cross-module evidence coverage and missing evidence indicators' },
  '/ai-extraction': { title: 'AI Extraction', subtitle: 'Review staged AI extraction values before promotion' },
  '/ai-photo-extraction': { title: 'AI Extraction', subtitle: 'Review staged AI extraction values before promotion' },
  '/reviews': { title: 'AI Field Review', subtitle: 'Review staged AI extraction fields before promotion' },
  '/ndt': { title: 'NDT Data Room', subtitle: 'Review UT thickness data, CML/TML grids, and evidence-linked measurements' },
  '/ndt-data-room': { title: 'NDT Data Room', subtitle: 'Review UT thickness data, CML/TML grids, and evidence-linked measurements' },
  '/calculations': { title: 'Calculation Workbook', subtitle: 'Deterministic calculation runs, warnings, reviews, and approvals' },
  '/formulas': { title: 'Formula Registry', subtitle: 'Approved deterministic formula versions and validation status' },
  '/integrity-decisions': { title: 'Integrity Decision', subtitle: 'Human-owned engineering decisions based on reviewed data' },
  '/ffs': { title: 'FFS Cases', subtitle: 'Fitness-for-service trigger workflow and case readiness' },
  '/rbi': { title: 'RBI Interface', subtitle: 'RBI trigger workflow and risk review readiness' },
  '/reports': { title: 'Reports', subtitle: 'Generate, preview, approve, and issue gated reports' },
  '/work-orders': { title: 'Work Orders', subtitle: 'Internal AIM fallback actions before external CMMS integration' },
  '/workflow-console': { title: 'Workflow Console', subtitle: 'n8n orchestration visibility through AIM workflow events' },
  '/audit-logs': { title: 'Audit Logs', subtitle: 'Read-only governance audit trail' },
  '/admin-governance': { title: 'Admin Governance', subtitle: 'Users, roles, configuration, and governance controls' },
  '/tenant-admin': { title: 'Tenant Admin', subtitle: 'Tenant context, membership visibility, and tenant isolation health' },
  '/data-dictionary': { title: 'Data Dictionary', subtitle: 'Controlled engineering field definitions, rules, and validation metadata' },
  '/validation': { title: 'Validation Overview', subtitle: 'Deterministic data-quality validation and readiness checks' },
  '/validation/history': { title: 'Validation History', subtitle: 'Read-only validation snapshots and field-level issue history' },
  '/security-monitoring': { title: 'Security Monitoring', subtitle: 'Security evidence, alert routing, and incident readiness' },
  '/golive-readiness': { title: 'Go-Live Readiness', subtitle: 'Hypercare, readiness, and production go-live gates' },
  '/production-validation': { title: 'Production Validation', subtitle: 'Deployment smoke test, backup, rollback, and signoff evidence' },
  '/release-closure': { title: 'Release Closure', subtitle: 'Final release signoff and closure evidence' }
};

function isActive(pathname: string, item: NavItem): boolean {
  const candidates = item.match ?? [item.href];
  return candidates.some((candidate) => pathname === candidate || (!item.exact && candidate !== '/' && pathname.startsWith(`${candidate}/`)));
}

function resolveMeta(pathname: string): { title: string; subtitle: string } {
  const exact = PAGE_META[pathname];
  if (exact) return exact;

  const matched = Object.entries(PAGE_META)
    .filter(([path]) => path !== '/' && pathname.startsWith(`${path}/`))
    .sort(([a], [b]) => b.length - a.length)[0];

  return matched?.[1] ?? { title: 'AIM Tank Integrity', subtitle: 'Controlled engineering workspace' };
}

export default function AimShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '/';
  const router = useRouter();
  const isLogin = pathname === '/login';
  const meta = resolveMeta(pathname);
  const [hasToken, setHasToken] = useState(false);
  const [tenantContext, setTenantContext] = useState<TenantContextView | null>(null);
  const [availableTenants, setAvailableTenants] = useState<TenantMembershipView[]>([]);
  const [tenantStatus, setTenantStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');

  async function loadTenantContext() {
    setTenantStatus('loading');
    try {
      const response = await apiFetch('/api/v1/tenant/context', { cache: 'no-store' });
      const payload = await response.json() as TenantContextPayload;
      if (!response.ok) {
        setTenantContext(null);
        setAvailableTenants([]);
        setTenantStatus('unavailable');
        return;
      }
      setTenantContext(payload.tenant_context ?? null);
      setAvailableTenants(payload.available_tenants ?? []);
      setTenantStatus('ready');
    } catch {
      setTenantContext(null);
      setAvailableTenants([]);
      setTenantStatus('unavailable');
    }
  }

  useEffect(() => {
    setHasToken(Boolean(getAimAccessToken()));
    void loadTenantContext();
  }, [pathname]);

  useEffect(() => {
    function onTenantSelectionChanged() {
      void loadTenantContext();
    }
    window.addEventListener(AIM_TENANT_SELECTION_EVENT, onTenantSelectionChanged);
    return () => window.removeEventListener(AIM_TENANT_SELECTION_EVENT, onTenantSelectionChanged);
  }, []);

  if (isLogin) return <>{children}</>;

  function logout() {
    clearAimAccessToken();
    clearAimTenantSelection();
    router.push('/login');
  }

  function chooseTenant(tenantId: string) {
    const selected = availableTenants.find((tenant) => tenant.tenant_id === tenantId);
    if (!selected) return;
    setAimTenantSelection({ tenantId: selected.tenant_id, tenantSlug: selected.tenant_slug, tenantName: selected.tenant_name });
    window.location.reload();
  }

  const currentSelectionLabel = tenantContext?.tenantName ?? tenantSelectionLabel(getAimTenantSelection(), 'Tenant context');

  return (
    <div className="aim-shell-preview">
      <aside className="aim-sidebar" aria-label="AIM module navigation">
        <div className="aim-sidebar__head">
          <div className="aim-sidebar__logo" aria-hidden="true">🛡</div>
          <div>
            <div className="aim-sidebar__brand">AIM AI</div>
            <div className="aim-sidebar__tagline">Asset Integrity Management</div>
          </div>
        </div>

        <nav className="aim-sidebar__scroll">
          {NAV_GROUPS.map((group) => (
            <section key={group.label} className="aim-sidebar__group">
              <div className="aim-sidebar__group-title">{group.label}</div>
              {group.items.map((item) => {
                const active = isActive(pathname, item);
                return (
                  <Link key={item.href} href={item.href} className={active ? 'aim-sidebar__link is-active' : 'aim-sidebar__link'}>
                    <span className="aim-sidebar__icon" aria-hidden="true">{item.icon}</span>
                    <span>{item.label}</span>
                    {active && <span className="aim-sidebar__arrow" aria-hidden="true">›</span>}
                  </Link>
                );
              })}
            </section>
          ))}
        </nav>

        <div className="aim-sidebar__foot">
          <div className="aim-tenant-mini-card" aria-label="Current tenant context">
            <div className="aim-tenant-mini-card__label">Tenant context</div>
            <div className="aim-tenant-mini-card__name">{tenantStatus === 'ready' ? currentSelectionLabel : 'Tenant unavailable'}</div>
            <div className="aim-tenant-mini-card__meta">
              {tenantContext ? `${tenantContext.tenantSlug} · ${tenantContext.selectedBy}` : 'Backend membership enforced'}
            </div>
            {availableTenants.length > 1 && (
              <select className="aim-tenant-mini-card__select" aria-label="Switch tenant context" value={tenantContext?.tenantId ?? ''} onChange={(event) => chooseTenant(event.target.value)}>
                {availableTenants.map((tenant) => (
                  <option key={tenant.tenant_id} value={tenant.tenant_id}>{tenant.tenant_name}</option>
                ))}
              </select>
            )}
            <div className="aim-tenant-mini-card__meta">AI/n8n/service actors cannot approve tenant context.</div>
            <Link href="/tenant-admin" className="aim-tenant-mini-card__link">Open tenant admin</Link>
          </div>
          <div className="aim-sidebar__user-row">
            <div className="aim-sidebar__avatar" aria-hidden="true">👤</div>
            <div>
              <div className="aim-sidebar__user">AIM User</div>
              <div className="aim-sidebar__role">{hasToken ? 'Authenticated session' : 'Local / demo session'}</div>
            </div>
          </div>
          <button type="button" className="aim-sidebar__logout" onClick={logout}>⏻ Logout</button>
          <div className="aim-sidebar__version">v0.1.0 MVP · AIM + n8n</div>
        </div>
      </aside>

      <div className="aim-main">
        <header className="aim-topbar">
          <div>
            <div className="aim-topbar__title">{meta.title}</div>
            <div className="aim-topbar__subtitle">{meta.subtitle}</div>
          </div>
          <div className="aim-topbar__right">
            <Link href="/tenant-admin" className="aim-topbar__pill aim-topbar__pill--tenant" title="Open tenant admin" aria-label="Open tenant admin">
              🏢 {tenantStatus === 'ready' ? currentSelectionLabel : 'Tenant context'}
            </Link>
            <Link href="/workflow-console" className="aim-topbar__notification" title="Open workflow console" aria-label="Open workflow console">
              🔔<span className="aim-topbar__dot" aria-hidden="true" />
            </Link>
            <Link href="/audit-logs" className="aim-topbar__pill">Audit Trail</Link>
            <div className="aim-topbar__user"><span aria-hidden="true">👤</span><span>AIM User</span></div>
          </div>
        </header>

        <div className="aim-content" role="main">{children}</div>
      </div>
    </div>
  );
}
