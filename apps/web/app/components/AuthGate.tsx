'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { apiFetch, clearAimAccessToken, getAimAccessToken } from '../../lib/api-client';
import { DEFAULT_AUTHENTICATED_PATH, buildLoginRedirectPath, isPublicPath } from '../../lib/auth-routing';

type AuthGateStatus = 'checking' | 'public' | 'authenticated' | 'redirecting';

function currentSearch(): string {
  return typeof window === 'undefined' ? '' : window.location.search;
}

function LoadingSession() {
  return (
    <main className="aim-auth-gate" role="status" aria-live="polite">
      <section className="aim-auth-gate__panel">
        <div className="aim-auth-gate__eyebrow">AIM session</div>
        <h1>Checking AIM session</h1>
        <p>Confirming sign-in before opening the controlled engineering workspace.</p>
      </section>
    </main>
  );
}

export default function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '/';
  const router = useRouter();
  const [status, setStatus] = useState<AuthGateStatus>('checking');
  const [verifiedPath, setVerifiedPath] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const publicRoute = isPublicPath(pathname);
    const token = getAimAccessToken();

    async function verifySession() {
      if (!token) {
        if (publicRoute) {
          setStatus('public');
          setVerifiedPath(pathname);
          return;
        }

        setStatus('redirecting');
        router.replace(buildLoginRedirectPath(pathname, currentSearch()));
        return;
      }

      setStatus('checking');

      try {
        const response = await apiFetch('/api/v1/auth/me', { cache: 'no-store' });
        if (!response.ok) throw new Error('AIM session rejected');
        if (cancelled) return;

        if (pathname === '/login') {
          setStatus('redirecting');
          router.replace(DEFAULT_AUTHENTICATED_PATH);
          return;
        }

        setVerifiedPath(pathname);
        setStatus('authenticated');
      } catch {
        clearAimAccessToken();
        if (cancelled) return;

        if (publicRoute) {
          setStatus('public');
          setVerifiedPath(pathname);
          return;
        }

        setStatus('redirecting');
        router.replace(buildLoginRedirectPath(pathname, currentSearch()));
      }
    }

    void verifySession();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (status === 'public' && isPublicPath(pathname)) return <>{children}</>;
  if (status === 'authenticated' && verifiedPath === pathname) return <>{children}</>;

  return <LoadingSession />;
}
