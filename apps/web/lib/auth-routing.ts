export const AIM_AUTH_COOKIE = 'aim.accessToken';
export const DEFAULT_AUTHENTICATED_PATH = '/dashboard';

const STATIC_ASSET_PATTERN = /\.(?:avif|css|gif|ico|jpg|jpeg|js|json|map|png|svg|txt|webmanifest|woff|woff2)$/i;

export function isPublicPath(pathname: string): boolean {
  if (pathname === '/login') return true;
  if (pathname.startsWith('/_next/')) return true;
  if (STATIC_ASSET_PATTERN.test(pathname)) return true;
  return false;
}

export function safeNextPath(value: string | null | undefined): string {
  const candidate = value?.trim();
  if (!candidate || candidate.length > 2048) return DEFAULT_AUTHENTICATED_PATH;
  if (!candidate.startsWith('/') || candidate.startsWith('//') || candidate.includes('\\')) return DEFAULT_AUTHENTICATED_PATH;

  try {
    const url = new URL(candidate, 'https://aim.local');
    if (url.origin !== 'https://aim.local') return DEFAULT_AUTHENTICATED_PATH;
    if (isPublicPath(url.pathname)) return DEFAULT_AUTHENTICATED_PATH;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_AUTHENTICATED_PATH;
  }
}

export function buildLoginRedirectPath(pathname: string, search = ''): string {
  const normalizedSearch = search && !search.startsWith('?') ? `?${search}` : search;
  const next = safeNextPath(`${pathname}${normalizedSearch}`);
  return `/login?next=${encodeURIComponent(next)}`;
}
