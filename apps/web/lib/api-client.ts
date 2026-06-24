export const API_BASE = process.env.NEXT_PUBLIC_AIM_API_BASE_URL ?? 'http://localhost:4000';

const DEMO_HEADERS_ENABLED = process.env.NEXT_PUBLIC_AIM_DEMO_HEADERS_ENABLED === 'true';

export const DEV_DEMO_HEADERS: Record<string, string> = {
  'x-aim-demo-roles': 'admin',
  'x-aim-demo-email': 'admin@aim.local'
};

const TOKEN_STORAGE_KEY = 'aim.accessToken';

export function apiUrl(path: string): string {
  return new URL(path, API_BASE).toString();
}

export function getAimAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setAimAccessToken(token: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearAimAccessToken(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export async function loginToAim(email: string, password: string): Promise<Record<string, unknown>> {
  const response = await fetch(apiUrl('/api/v1/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const payload = await response.json();
  if (!response.ok) throw payload;
  const token = payload?.data?.accessToken;
  if (typeof token !== 'string' || token.length === 0) {
    throw { error: { code: 'AUTH_TOKEN_MISSING', message: 'Login response did not include data.accessToken.' } };
  }
  setAimAccessToken(token);
  return payload;
}

export function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers ?? {});
  if (!headers.has('Content-Type') && init.body) headers.set('Content-Type', 'application/json');

  const token = getAimAccessToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (DEMO_HEADERS_ENABLED) {
    for (const [key, value] of Object.entries(DEV_DEMO_HEADERS)) {
      if (!headers.has(key)) headers.set(key, value);
    }
  }

  return fetch(apiUrl(path), {
    ...init,
    headers
  });
}
