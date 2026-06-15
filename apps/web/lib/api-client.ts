export const API_BASE = process.env.NEXT_PUBLIC_AIM_API_BASE_URL ?? 'http://localhost:4000';

export const DEV_DEMO_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'x-aim-demo-roles': 'admin',
  'x-aim-demo-email': 'admin@aim.local'
};

export function apiUrl(path: string): string {
  return new URL(path, API_BASE).toString();
}

export function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers ?? {});
  for (const [key, value] of Object.entries(DEV_DEMO_HEADERS)) {
    if (!headers.has(key)) headers.set(key, value);
  }

  return fetch(apiUrl(path), {
    ...init,
    headers
  });
}
