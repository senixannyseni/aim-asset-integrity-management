import { readFileSync } from 'node:fs';

function source(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

function expectIncludes(sourceText, token, label) {
  if (!sourceText.includes(token)) {
    throw new Error(`auth-routing smoke test failed: missing ${label}`);
  }
}

const middleware = source('middleware.ts');
const authGate = source('app/components/AuthGate.tsx');
const loginPage = source('app/login/page.tsx');
const shell = source('app/components/AimShell.tsx');
const progressiveDisclosure = source('app/components/ProgressiveDisclosure.tsx');
const moduleBranchNav = source('app/components/ModuleBranchNav.tsx');
const topBranchNav = source('app/components/TopBranchNav.tsx');
const routing = source('lib/auth-routing.ts');
const apiClient = source('lib/api-client.ts');
const dashboard = source('app/dashboard/GovernanceDashboardClient.tsx');
const photoExtraction = source('app/ai-photo-extraction/page.tsx');
const assets = source('app/assets/page.tsx');
const inspections = source('app/inspections/InspectionsClient.tsx');
const ndt = source('app/ndt/NdtDataRoomClient.tsx');
const reports = source('app/reports/ReportsClient.tsx');

expectIncludes(middleware, 'request.cookies.get(AIM_AUTH_COOKIE)', 'middleware auth cookie check');
expectIncludes(middleware, 'buildLoginRedirectPath(pathname, search)', 'protected-route login redirect');
expectIncludes(middleware, "pathname === '/login' && hasAuthCookie", 'authenticated login redirect');

expectIncludes(authGate, "'/api/v1/auth/me'", 'client session verification endpoint');
expectIncludes(authGate, 'router.replace(buildLoginRedirectPath(pathname, currentSearch()))', 'unauthenticated client redirect');
expectIncludes(authGate, 'router.replace(DEFAULT_AUTHENTICATED_PATH)', 'authenticated login client redirect');
expectIncludes(authGate, '<LoadingSession />', 'guard loading state before protected render');

expectIncludes(loginPage, "safeNextPath(new URLSearchParams(window.location.search).get('next'))", 'safe next redirect');
expectIncludes(loginPage, 'router.replace(nextPath)', 'login success next redirect');
expectIncludes(loginPage, 'Sign in failed. Check your AIM email and password.', 'friendly login error');

expectIncludes(shell, 'logoutFromAim', 'shared logout helper');
expectIncludes(shell, "router.replace('/login')", 'logout login redirect');
expectIncludes(shell, 'SIDEBAR_COLLAPSED_STORAGE_KEY', 'persisted whole-sidebar collapse');
expectIncludes(shell, 'toggleSidebarCollapsed', 'whole-sidebar collapse toggle');
expectIncludes(shell, 'NAV_ICON_PATHS', 'simplified monochrome sidebar icon system');
expectIncludes(shell, 'SidebarIcon name={navIconNameForHref(item.href)}', 'sidebar icons rendered through monochrome SVG component');
expectIncludes(shell, 'aim-sidebar__icon aim-sidebar__icon--mono', 'sidebar monochrome icon class');
expectIncludes(shell, 'aim-sidebar__group-toggle', 'collapsible sidebar drawer headers');
expectIncludes(shell, 'aria-expanded={groupOpen}', 'drawer header expanded state');
expectIncludes(shell, 'title={item.label}', 'collapsed sidebar navigation tooltips');
expectIncludes(shell, 'aria-label={item.label}', 'collapsed sidebar accessible navigation labels');
expectIncludes(shell, 'className={active ? \'aim-sidebar__link is-active\'', 'active route indication');
expectIncludes(shell, 'activeGroupKey(pathname)', 'active route opens parent drawer');
expectIncludes(shell, 'Photo Extraction', 'Photo Extraction sidebar label');
expectIncludes(shell, 'Photo Field Review', 'Photo Field Review sidebar label');
expectIncludes(shell, 'className="aim-sidebar__brand">AIM</div>', 'AIM sidebar brand');
expectIncludes(shell, 'className="aim-sidebar__logo aim-sidebar__logo--button"', 'collapsed AIM logo expand control');
expectIncludes(shell, 'aria-label="Expand sidebar"', 'collapsed logo expand accessible label');
expectIncludes(shell, 'title="Expand sidebar"', 'collapsed logo expand title');
expectIncludes(shell, 'aim-topbar__context', 'screen-reader-only shell page context');
expectIncludes(progressiveDisclosure, '<h1 className="sr-only">{title}</h1>', 'shared page header keeps accessible h1');
expectIncludes(progressiveDisclosure, 'pd-page-header--minimal', 'shared page headers use compact visual chrome');
expectIncludes(moduleBranchNav, 'TopBranchNav as ModuleBranchNav', 'module branch compatibility wrapper');
expectIncludes(topBranchNav, 'top-branch-nav__rail', 'compact top branch rail component');
expectIncludes(topBranchNav, 'new URLSearchParams(searchParams.toString())', 'branch rail preserves query state');
expectIncludes(topBranchNav, 'aria-current={isActive ? \'page\' : undefined}', 'branch rail active accessibility');
expectIncludes(topBranchNav, 'aria-label={item.ariaLabel ?? item.label}', 'branch rail accessible label override');

expectIncludes(routing, "candidate.startsWith('//')", 'external next rejection');
expectIncludes(routing, "candidate.includes('\\\\')", 'backslash next rejection');
expectIncludes(routing, 'isPublicPath(url.pathname)', 'public-route next rejection');

expectIncludes(apiClient, "'/api/v1/auth/refresh'", 'session refresh endpoint');
expectIncludes(apiClient, 'refreshAimSession', 'silent session refresh helper');
expectIncludes(apiClient, 'response.status !== 401', '401 refresh retry gate');
expectIncludes(apiClient, 'return fetch(apiUrl(path), buildApiInit(init));', 'retry original request after refresh');
expectIncludes(apiClient, 'REFRESH_TOKEN_STORAGE_KEY', 'refresh token browser-session storage');

expectIncludes(dashboard, 'Photo Extraction Review Queue', 'dashboard photo extraction queue label');
expectIncludes(dashboard, "label: 'Reviews'", 'dashboard short workflow branch label');
expectIncludes(photoExtraction, 'Photo Extraction Review', 'photo extraction page title');
expectIncludes(photoExtraction, 'Photo Field Review', 'photo field review link label');
expectIncludes(photoExtraction, 'AI output is staging data only. Engineer review is required before promotion.', 'photo extraction staging warning');
expectIncludes(photoExtraction, "label: 'Promote'", 'photo extraction short promotion branch label');
expectIncludes(assets, "label: 'Condition'", 'asset condition branch label');
expectIncludes(assets, 'Asset Integrity Package Readiness', 'asset readiness body anchor');
expectIncludes(assets, '/assets/${asset.asset_id}', 'asset detail route anchor');
expectIncludes(inspections, "label: 'Gates'", 'inspection gates branch label');
expectIncludes(inspections, 'Inspection Package Readiness', 'inspection readiness body anchor');
expectIncludes(ndt, "label: 'Trace'", 'NDT short traceability branch label');
expectIncludes(ndt, 'RC4-P adds measurement detail inspection traceability', 'NDT RC4-P traceability helper');
expectIncludes(ndt, 'Inspection Traceability Readiness', 'NDT traceability body anchor');
expectIncludes(reports, "label: 'Gates'", 'report gates branch label');

const removedExtractionLabel = ['AI', 'Extraction'].join(' ');
const removedReviewLabel = ['AI', 'Field', 'Review'].join(' ');
const removedBrandLabel = ['AIM', 'AI'].join(' ');

for (const [label, text] of [
  ['sidebar old extraction label', shell],
  ['dashboard old extraction label', dashboard],
  ['photo extraction old label', photoExtraction]
]) {
  if (text.includes(removedExtractionLabel) || text.includes(removedReviewLabel) || text.includes(removedBrandLabel)) {
    throw new Error(`auth-routing smoke test failed: removed user-facing AI label still appears in ${label}`);
  }
}

if (shell.includes("sidebarCollapsed ? '>'") || shell.includes("aria-label={sidebarCollapsed ? 'Expand sidebar'")) {
  throw new Error('auth-routing smoke test failed: collapsed sidebar still exposes a separate expand button');
}

if (shell.includes('aim-topbar__title') || shell.includes('aim-topbar__subtitle')) {
  throw new Error('auth-routing smoke test failed: redundant visible shell page title/subtitle returned');
}

console.log('web: auth-routing and sidebar smoke test passed');
