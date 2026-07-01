import { getAimTenantSelection } from './tenant-session';
import { AIM_AUTH_COOKIE } from './auth-routing';

export const API_BASE = process.env.NEXT_PUBLIC_AIM_API_BASE_URL ?? 'http://localhost:4000';

const DEV_HEADERS_ENABLED = process.env.NEXT_PUBLIC_AIM_DEV_HEADERS_ENABLED === 'true';

export const DEV_AUTH_HEADERS: Record<string, string> = {
  'x-aim-demo-roles': 'admin',
  'x-aim-demo-email': 'admin@aim.local'
};

const TOKEN_STORAGE_KEY = AIM_AUTH_COOKIE;
const REFRESH_TOKEN_STORAGE_KEY = 'aim.refreshToken';
const LEGACY_SESSION_STORAGE_ENABLED = process.env.NEXT_PUBLIC_AIM_LEGACY_TOKEN_STORAGE === 'true';

let inMemoryAccessToken: string | null = null;
let inMemoryRefreshToken: string | null = null;
let refreshPromise: Promise<boolean> | null = null;

export function apiUrl(path: string): string {
  return new URL(path, API_BASE).toString();
}

function legacySessionStorage(): Storage | null {
  if (typeof window === 'undefined' || !LEGACY_SESSION_STORAGE_ENABLED) return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function browserSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function readAuthCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const encodedName = `${encodeURIComponent(AIM_AUTH_COOKIE)}=`;
  const cookie = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(encodedName));

  if (!cookie) return null;

  try {
    return decodeURIComponent(cookie.slice(encodedName.length)) || null;
  } catch {
    return null;
  }
}

function writeAuthCookie(token: string): void {
  if (typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${encodeURIComponent(AIM_AUTH_COOKIE)}=${encodeURIComponent(token)}; Path=/; SameSite=Lax${secure}`;
}

function deleteAuthCookie(): void {
  if (typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${encodeURIComponent(AIM_AUTH_COOKIE)}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}

export function getAimAccessToken(): string | null {
  const cookieToken = readAuthCookie();
  const token = inMemoryAccessToken ?? legacySessionStorage()?.getItem(TOKEN_STORAGE_KEY) ?? cookieToken ?? null;

  if (token) {
    inMemoryAccessToken = token;
    if (!cookieToken) writeAuthCookie(token);
  }

  return token;
}

export function setAimAccessToken(token: string): void {
  inMemoryAccessToken = token;
  legacySessionStorage()?.setItem(TOKEN_STORAGE_KEY, token);
  writeAuthCookie(token);
}

export function clearAimAccessToken(): void {
  inMemoryAccessToken = null;
  legacySessionStorage()?.removeItem(TOKEN_STORAGE_KEY);
  deleteAuthCookie();
}

function getAimRefreshToken(): string | null {
  const token = inMemoryRefreshToken ?? browserSessionStorage()?.getItem(REFRESH_TOKEN_STORAGE_KEY) ?? null;
  if (token) inMemoryRefreshToken = token;
  return token;
}

function setAimRefreshToken(token: string): void {
  inMemoryRefreshToken = token;
  browserSessionStorage()?.setItem(REFRESH_TOKEN_STORAGE_KEY, token);
}

function clearAimRefreshToken(): void {
  inMemoryRefreshToken = null;
  browserSessionStorage()?.removeItem(REFRESH_TOKEN_STORAGE_KEY);
}

type AuthPayload = {
  data?: {
    accessToken?: unknown;
    refreshToken?: unknown;
  };
};

function storeAuthPayload(payload: AuthPayload): void {
  const token = payload?.data?.accessToken;
  const refreshToken = payload?.data?.refreshToken;

  if (typeof token !== 'string' || token.length === 0) {
    throw { error: { code: 'AUTH_TOKEN_MISSING', message: 'Login response did not include data.accessToken.' } };
  }

  setAimAccessToken(token);

  if (typeof refreshToken === 'string' && refreshToken.length > 0) {
    setAimRefreshToken(refreshToken);
  }
}

export async function loginToAim(email: string, password: string): Promise<AuthPayload> {
  const response = await fetch(apiUrl('/api/v1/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const payload = await response.json();
  if (!response.ok) throw payload;
  storeAuthPayload(payload);
  return payload;
}

export async function logoutFromAim(): Promise<void> {
  const token = getAimAccessToken();
  const refreshToken = getAimRefreshToken();
  try {
    if (token) {
      await apiFetch('/api/v1/auth/logout', {
        method: 'POST',
        body: refreshToken ? JSON.stringify({ refreshToken }) : undefined,
        skipAuthRefresh: true
      });
    }
  } catch {
    // Local session state must be cleared even if the API token is already expired.
  } finally {
    clearAimAccessToken();
    clearAimRefreshToken();
  }
}

export async function refreshAimSession(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = getAimRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await fetch(apiUrl('/api/v1/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        clearAimAccessToken();
        clearAimRefreshToken();
        return false;
      }
      storeAuthPayload(payload);
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

type AimRequestInit = RequestInit & { skipAuthRefresh?: boolean };

function shouldSkipRefresh(path: string, init: AimRequestInit): boolean {
  return Boolean(init.skipAuthRefresh || path.includes('/api/v1/auth/login') || path.includes('/api/v1/auth/refresh'));
}

function buildApiInit(init: AimRequestInit = {}): RequestInit {
  const headers = new Headers(init.headers ?? {});
  if (!headers.has('Content-Type') && init.body) headers.set('Content-Type', 'application/json');

  const token = getAimAccessToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const tenantSelection = getAimTenantSelection();
  if (tenantSelection.tenantId && !headers.has('x-aim-tenant-id')) {
    headers.set('x-aim-tenant-id', tenantSelection.tenantId);
  }
  if (tenantSelection.tenantSlug && !headers.has('x-aim-tenant-slug')) {
    headers.set('x-aim-tenant-slug', tenantSelection.tenantSlug);
  }

  if (DEV_HEADERS_ENABLED) {
    for (const [key, value] of Object.entries(DEV_AUTH_HEADERS)) {
      if (!headers.has(key)) headers.set(key, value);
    }
  }

  const { skipAuthRefresh: _skipAuthRefresh, ...requestInit } = init;
  return {
    ...requestInit,
    headers
  };
}

export async function apiFetch(path: string, init: AimRequestInit = {}): Promise<Response> {
  const response = await fetch(apiUrl(path), buildApiInit(init));

  if (response.status !== 401 || shouldSkipRefresh(path, init)) {
    return response;
  }

  const refreshed = await refreshAimSession();
  if (!refreshed) return response;

  return fetch(apiUrl(path), buildApiInit(init));
}
