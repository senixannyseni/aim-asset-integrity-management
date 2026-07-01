'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { apiFetch, getAimAccessToken, logoutFromAim } from '../../lib/api-client';
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

type NavIconKey =
  | 'dashboard'
  | 'assets'
  | 'integrityWorkspace'
  | 'inspections'
  | 'findings'
  | 'evidence'
  | 'traceability'
  | 'photoExtraction'
  | 'photoReview'
  | 'ndt'
  | 'calculations'
  | 'formulas'
  | 'integrityDecision'
  | 'ffs'
  | 'rbi'
  | 'reports'
  | 'workOrders'
  | 'workflow'
  | 'audit'
  | 'admin'
  | 'tenant'
  | 'dictionary'
  | 'validation'
  | 'history'
  | 'security'
  | 'goLive'
  | 'production'
  | 'closure';

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'aim.sidebarCollapsed';
const SIDEBAR_GROUPS_STORAGE_KEY = 'aim.sidebarOpenGroups';
const NAV_GROUP_ABBREVIATIONS: Record<string, string> = {
  'Asset & Inspection': 'AS',
  'Evidence & Document': 'EV',
  Engineering: 'EN',
  'Report & Action': 'RP',
  'Admin & Release': 'AD'
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
      { href: '/ai-extraction', label: 'Photo Extraction', icon: '📷', match: ['/ai-extraction', '/ai-photo-extraction'] },
      { href: '/reviews', label: 'Photo Field Review', icon: '🤖' },
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
  '/ai-extraction': { title: 'Photo Extraction', subtitle: 'Review staged photo extraction values before promotion' },
  '/ai-photo-extraction': { title: 'Photo Extraction', subtitle: 'Review staged photo extraction values before promotion' },
  '/reviews': { title: 'Photo Field Review', subtitle: 'Review staged photo extraction fields before promotion' },
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

const NAV_ICON_PATHS: Record<NavIconKey, ReactNode> = {
  dashboard: <><rect x="4" y="5" width="7" height="6" rx="1.5" /><rect x="13" y="5" width="7" height="14" rx="1.5" /><rect x="4" y="13" width="7" height="6" rx="1.5" /></>,
  assets: <><path d="M4 20V9l8-4 8 4v11" /><path d="M8 20v-7h8v7" /><path d="M9 9h6" /></>,
  integrityWorkspace: <><path d="M12 4l7 4v5c0 4-3 6-7 7-4-1-7-3-7-7V8l7-4z" /><path d="M9 12l2 2 4-5" /></>,
  inspections: <><path d="M8 4h8v16H8z" /><path d="M10 8h4" /><path d="M10 12h4" /><path d="M10 16h3" /></>,
  findings: <><path d="M12 4l8 16H4L12 4z" /><path d="M12 9v4" /><path d="M12 17h.01" /></>,
  evidence: <><path d="M6 4h9l3 3v13H6z" /><path d="M14 4v4h4" /><path d="M9 12h6" /><path d="M9 16h4" /></>,
  traceability: <><path d="M7 8l-4 4 4 4" /><path d="M17 8l4 4-4 4" /><path d="M4 12h16" /></>,
  photoExtraction: <><path d="M5 8h3l1.5-2h5L16 8h3v10H5z" /><circle cx="12" cy="13" r="3" /></>,
  photoReview: <><path d="M5 5h14v10H9l-4 4V5z" /><path d="M9 10h6" /><path d="M9 13h4" /></>,
  ndt: <><path d="M4 16c4-4 12-4 16 0" /><path d="M7 13c3-3 7-3 10 0" /><path d="M10 10c1.2-1 2.8-1 4 0" /><path d="M12 18h.01" /></>,
  calculations: <><rect x="7" y="4" width="10" height="16" rx="1.5" /><path d="M9 8h6" /><path d="M9 12h2" /><path d="M13 12h2" /><path d="M9 16h2" /><path d="M13 16h2" /></>,
  formulas: <><path d="M5 7h14" /><path d="M8 17l3-10" /><path d="M13 17l3-10" /></>,
  integrityDecision: <><path d="M12 4l7 4v5c0 4-3 6-7 7-4-1-7-3-7-7V8l7-4z" /><path d="M8.5 12.5l2.5 2.5 4.5-5" /></>,
  ffs: <><path d="M9 4h6" /><path d="M10 4v5l-4 9h12l-4-9V4" /><path d="M8 15h8" /></>,
  rbi: <><path d="M5 19V5" /><path d="M5 19h14" /><path d="M8 16l3-4 3 2 4-7" /></>,
  reports: <><path d="M7 4h7l4 4v12H7z" /><path d="M14 4v5h4" /><path d="M9 13h6" /><path d="M9 17h4" /></>,
  workOrders: <><path d="M14 5a4 4 0 0 0 5 5l-9 9H6v-4l9-9" /><path d="M8 17l2 2" /></>,
  workflow: <><path d="M13 3L5 14h6l-1 7 8-11h-6l1-7z" /></>,
  audit: <><path d="M6 5h12v14H6z" /><path d="M9 9h6" /><path d="M9 13h6" /><path d="M9 17h3" /></>,
  admin: <><path d="M12 4v16" /><path d="M5 8h14" /><path d="M7 14h10" /></>,
  tenant: <><path d="M5 20V6h8v14" /><path d="M13 10h6v10" /><path d="M8 10h2" /><path d="M8 14h2" /><path d="M16 14h1" /></>,
  dictionary: <><path d="M5 5h7a3 3 0 0 1 3 3v12a3 3 0 0 0-3-3H5z" /><path d="M19 5h-4v15" /></>,
  validation: <><circle cx="12" cy="12" r="8" /><path d="M8.5 12.5l2.5 2.5 4.5-5" /></>,
  history: <><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 2" /></>,
  security: <><rect x="6" y="10" width="12" height="9" rx="1.5" /><path d="M9 10V8a3 3 0 0 1 6 0v2" /></>,
  goLive: <><path d="M6 20V5" /><path d="M6 5h10l-2 3 2 3H6" /><path d="M9 16l2 2 4-5" /></>,
  production: <><path d="M12 4v10" /><path d="M8 10l4 4 4-4" /><path d="M5 20h14" /></>,
  closure: <><path d="M6 20V5h10l-2 3 2 3H6" /><path d="M9 16l2 2 4-5" /></>
};

function SidebarIcon({ name }: { name: NavIconKey }) {
  return (
    <svg className="aim-sidebar__icon-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {NAV_ICON_PATHS[name]}
    </svg>
  );
}

function navIconNameForHref(href: string): NavIconKey {
  switch (href) {
    case '/dashboard': return 'dashboard';
    case '/assets': return 'assets';
    case '/integrity-workspace': return 'integrityWorkspace';
    case '/inspections': return 'inspections';
    case '/findings': return 'findings';
    case '/evidence': return 'evidence';
    case '/evidence-traceability': return 'traceability';
    case '/ai-extraction': return 'photoExtraction';
    case '/reviews': return 'photoReview';
    case '/ndt': return 'ndt';
    case '/calculations': return 'calculations';
    case '/formulas': return 'formulas';
    case '/integrity-decisions': return 'integrityDecision';
    case '/ffs': return 'ffs';
    case '/rbi': return 'rbi';
    case '/reports': return 'reports';
    case '/work-orders': return 'workOrders';
    case '/workflow-console': return 'workflow';
    case '/audit-logs': return 'audit';
    case '/admin-governance': return 'admin';
    case '/tenant-admin': return 'tenant';
    case '/data-dictionary': return 'dictionary';
    case '/validation': return 'validation';
    case '/validation/history': return 'history';
    case '/security-monitoring': return 'security';
    case '/golive-readiness': return 'goLive';
    case '/production-validation': return 'production';
    case '/release-closure': return 'closure';
    default: return 'dashboard';
  }
}

function isActive(pathname: string, item: NavItem): boolean {
  const candidates = item.match ?? [item.href];
  return candidates.some((candidate) => pathname === candidate || (!item.exact && candidate !== '/' && pathname.startsWith(`${candidate}/`)));
}

function browserLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function navGroupKey(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function navGroupAbbrev(label: string): string {
  const configured = NAV_GROUP_ABBREVIATIONS[label];
  if (configured) return configured;
  return label
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function activeGroupKey(pathname: string): string | null {
  const group = NAV_GROUPS.find((candidate) => candidate.items.some((item) => isActive(pathname, item)));
  return group ? navGroupKey(group.label) : null;
}

function defaultOpenGroups(pathname: string): Record<string, boolean> {
  const activeKey = activeGroupKey(pathname);
  return NAV_GROUPS.reduce<Record<string, boolean>>((state, group, index) => {
    const key = navGroupKey(group.label);
    state[key] = index < 2 || key === activeKey;
    return state;
  }, {});
}

function readSidebarCollapsed(): boolean {
  return browserLocalStorage()?.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true';
}

function readOpenGroups(pathname: string): Record<string, boolean> {
  const storage = browserLocalStorage();
  const activeKey = activeGroupKey(pathname);
  if (!storage) return defaultOpenGroups(pathname);

  try {
    const raw = storage.getItem(SIDEBAR_GROUPS_STORAGE_KEY);
    if (!raw) return defaultOpenGroups(pathname);
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const groups = NAV_GROUPS.reduce<Record<string, boolean>>((state, group) => {
      const key = navGroupKey(group.label);
      state[key] = typeof parsed[key] === 'boolean' ? parsed[key] : false;
      return state;
    }, {});
    if (activeKey) groups[activeKey] = true;
    return groups;
  } catch {
    return defaultOpenGroups(pathname);
  }
}

function writeSidebarCollapsed(collapsed: boolean): void {
  browserLocalStorage()?.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(collapsed));
}

function writeOpenGroups(groups: Record<string, boolean>): void {
  browserLocalStorage()?.setItem(SIDEBAR_GROUPS_STORAGE_KEY, JSON.stringify(groups));
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => defaultOpenGroups('/'));
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
    setSidebarCollapsed(readSidebarCollapsed());
    setOpenGroups(readOpenGroups(pathname));
  }, []);

  useEffect(() => {
    const key = activeGroupKey(pathname);
    if (!key) return;
    setOpenGroups((current) => {
      if (current[key]) return current;
      const next = { ...current, [key]: true };
      writeOpenGroups(next);
      return next;
    });
  }, [pathname]);

  useEffect(() => {
    function onTenantSelectionChanged() {
      void loadTenantContext();
    }
    window.addEventListener(AIM_TENANT_SELECTION_EVENT, onTenantSelectionChanged);
    return () => window.removeEventListener(AIM_TENANT_SELECTION_EVENT, onTenantSelectionChanged);
  }, []);

  if (isLogin) return <>{children}</>;

  async function logout() {
    await logoutFromAim();
    clearAimTenantSelection();
    router.replace('/login');
  }

  function chooseTenant(tenantId: string) {
    const selected = availableTenants.find((tenant) => tenant.tenant_id === tenantId);
    if (!selected) return;
    setAimTenantSelection({ tenantId: selected.tenant_id, tenantSlug: selected.tenant_slug, tenantName: selected.tenant_name });
    window.location.reload();
  }

  function toggleSidebarCollapsed() {
    setSidebarCollapsed((current) => {
      const next = !current;
      writeSidebarCollapsed(next);
      return next;
    });
  }

  function toggleGroup(groupKey: string) {
    setOpenGroups((current) => {
      const next = { ...current, [groupKey]: !current[groupKey] };
      writeOpenGroups(next);
      return next;
    });
  }

  const currentSelectionLabel = tenantContext?.tenantName ?? tenantSelectionLabel(getAimTenantSelection(), 'Tenant context');

  return (
    <div className={sidebarCollapsed ? 'aim-shell-preview is-sidebar-collapsed' : 'aim-shell-preview'}>
      <aside className="aim-sidebar" aria-label="AIM module navigation" data-collapsed={sidebarCollapsed ? 'true' : 'false'}>
        <div className="aim-sidebar__head">
          {sidebarCollapsed ? (
            <button
              type="button"
              className="aim-sidebar__logo aim-sidebar__logo--button"
              aria-label="Expand sidebar"
              title="Expand sidebar"
              onClick={toggleSidebarCollapsed}
            >
              <span className="aim-sidebar__logo-mark" aria-hidden="true">A</span>
            </button>
          ) : (
            <div className="aim-sidebar__logo" aria-hidden="true">
              <span className="aim-sidebar__logo-mark">A</span>
            </div>
          )}
          <div className="aim-sidebar__brand-block">
            <div className="aim-sidebar__brand">AIM</div>
            <div className="aim-sidebar__tagline">Asset Integrity Management</div>
          </div>
          {!sidebarCollapsed && (
            <button
              type="button"
              className="aim-sidebar__collapse"
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
              onClick={toggleSidebarCollapsed}
            >
              <span aria-hidden="true">&lt;</span>
            </button>
          )}
        </div>

        <nav className="aim-sidebar__scroll">
          {NAV_GROUPS.map((group) => {
            const groupKey = navGroupKey(group.label);
            const groupOpen = Boolean(openGroups[groupKey]);
            const hasActiveItem = group.items.some((item) => isActive(pathname, item));
            const groupId = `aim-sidebar-group-${groupKey}`;

            return (
            <section key={group.label} className={hasActiveItem ? 'aim-sidebar__group is-active-group' : 'aim-sidebar__group'}>
              <button
                type="button"
                className="aim-sidebar__group-toggle"
                aria-expanded={groupOpen}
                aria-controls={groupId}
                aria-label={`${group.label} navigation group`}
                title={`${group.label} navigation group`}
                onClick={() => toggleGroup(groupKey)}
              >
                <span className="aim-sidebar__group-abbrev" aria-hidden="true">{navGroupAbbrev(group.label)}</span>
                <span className="aim-sidebar__group-title-text">{group.label}</span>
                <span className="aim-sidebar__group-chevron" aria-hidden="true">{groupOpen ? 'v' : '>'}</span>
              </button>
              <div id={groupId} className={groupOpen ? 'aim-sidebar__group-links is-open' : 'aim-sidebar__group-links'} hidden={!groupOpen}>
                {group.items.map((item) => {
                  const active = isActive(pathname, item);
                  return (
                    <Link key={item.href} href={item.href} title={item.label} aria-label={item.label} className={active ? 'aim-sidebar__link is-active' : 'aim-sidebar__link'}>
                      <span className="aim-sidebar__icon aim-sidebar__icon--mono" aria-hidden="true"><SidebarIcon name={navIconNameForHref(item.href)} /></span>
                      <span className="aim-sidebar__link-label">{item.label}</span>
                      {active && <span className="aim-sidebar__arrow" aria-hidden="true">›</span>}
                    </Link>
                  );
                })}
              </div>
            </section>
            );
          })}
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
            <div className="aim-tenant-mini-card__meta">Automated/n8n/service actors cannot approve tenant context.</div>
            <Link href="/tenant-admin" className="aim-tenant-mini-card__link">Open tenant admin</Link>
          </div>
          <div className="aim-sidebar__user-row">
            <div className="aim-sidebar__avatar" aria-hidden="true">U</div>
            <div>
              <div className="aim-sidebar__user">AIM User</div>
              <div className="aim-sidebar__role">{hasToken ? 'Authenticated session' : 'Local / demo session'}</div>
            </div>
          </div>
          <button type="button" className="aim-sidebar__logout" aria-label="Logout" title="Logout" onClick={logout}>
            <span className="aim-sidebar__logout-icon" aria-hidden="true" />
            <span className="aim-sidebar__logout-label">Logout</span>
          </button>
          <div className="aim-sidebar__version">v0.1.0 MVP · AIM + n8n</div>
        </div>
      </aside>

      <div className="aim-main">
        <header className="aim-topbar">
          <div className="aim-topbar__context">
            <span className="sr-only">Current page: {meta.title}. {meta.subtitle}</span>
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

// AI/n8n/service actors cannot approve, promote, issue, certify, or enforce tenant-governance outcomes.
