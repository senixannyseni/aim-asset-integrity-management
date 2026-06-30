'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { clearAimAccessToken, getAimAccessToken, loginToAim } from '../../lib/api-client';

function messageFromError(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'error' in error) {
    const payload = error as { error?: { message?: string; code?: string } };
    return payload.error?.message ?? payload.error?.code ?? 'Login failed.';
  }
  return error instanceof Error ? error.message : 'Login failed.';
}

export default function LoginPage() {
  const [email, setEmail] = useState('engineer@aim.local');
  const [password, setPassword] = useState('ChangeMe123!');
  const [message, setMessage] = useState<string | null>(typeof window !== 'undefined' && getAimAccessToken() ? 'In-memory token is present for this browser session.' : null);
  const [isSubmitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      const payload = await loginToAim(email, password);
      const data = payload.data as { user?: { email?: string } } | undefined;
      setMessage(`Logged in as ${String(data?.user?.email ?? email)}. Use the dashboard to continue the controlled AIM workflow.`);
    } catch (error) {
      setMessage(messageFromError(error));
    } finally {
      setSubmitting(false);
    }
  }

  function logout() {
    clearAimAccessToken();
    setMessage('Browser-session access token cleared.');
  }

  return (
    <main className="aim-login-page">
      <section className="aim-login-left" aria-label="AIM program overview">
        <div>
          <div className="aim-login-logo">
            <div className="aim-login-logo__icon" aria-hidden="true">🛡</div>
            <div>
              <div style={{ color: '#fff', fontSize: 14, fontWeight: 900 }}>AIM AI</div>
              <div style={{ color: '#99f6e4', fontSize: 10 }}>Asset Integrity Management</div>
            </div>
          </div>

          <h1>Controlled tank integrity workflow</h1>
          <p>
            Evidence-linked inspection, NDT review, deterministic calculation, human integrity decision,
            gated report issue, and internal work-order follow-up in one auditable workspace.
          </p>

          <div className="aim-login-stat"><strong>12</strong><span>Integrated modules</span></div>
          <div className="aim-login-stat"><strong>API 653</strong><span>MVP calculation workflow boundary</span></div>
          <div className="aim-login-stat"><strong>100%</strong><span>Review, gate, and audit-first design</span></div>
        </div>

        <div style={{ color: '#93a9c2', fontSize: 10 }}>© AIM Tank Integrity · MVP local/UAT frontend</div>
      </section>

      <section className="aim-login-right" aria-label="Login form">
        <div className="aim-login-card">
          <h2>AIM Login</h2>
          <p>Sign in with your AIM account. Local demo seed uses the same password configured in the API seed.</p>
          <p className="aim-login-security-note">Demo headers are disabled unless NEXT_PUBLIC_AIM_DEMO_HEADERS_ENABLED=true.</p>

          <form onSubmit={submit}>
            <label>
              Email
              <input value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" />
            </label>
            <label>
              Password
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
            </label>
            <button className="aim-login-card__submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in…' : 'Sign in →'}
            </button>
            <button className="aim-login-card__clear" type="button" onClick={logout}>Clear browser token</button>
          </form>

          {message && <div className="aim-login-message">{message}</div>}

          <div className="aim-login-demo" aria-label="Quick module links">
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/assets">Assets</Link>
            <Link href="/evidence">Evidence</Link>
            <Link href="/reports">Reports</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
