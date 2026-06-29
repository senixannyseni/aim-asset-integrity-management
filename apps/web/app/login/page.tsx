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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    try {
      const payload = await loginToAim(email, password);
      const data = payload.data as { user?: { email?: string } } | undefined;
      setMessage(`Logged in as ${String(data?.user?.email ?? email)}. API calls now use Authorization: Bearer token.`);
    } catch (error) {
      setMessage(messageFromError(error));
    }
  }

  function logout() {
    clearAimAccessToken();
    setMessage('Browser-session access token cleared.');
  }

  return (
    <main>
      <p>RC2 Auth</p>
      <h1>AIM Login</h1>
      <p>Use real JWT authentication for UAT/prod-like validation. Demo headers are disabled unless NEXT_PUBLIC_AIM_DEMO_HEADERS_ENABLED=true.</p>
      <nav>
        <Link href="/reports">Reports</Link> | <Link href="/integrity-decisions">Integrity Decisions</Link> | <Link href="/work-orders">Work Orders</Link>
      </nav>
      <form onSubmit={submit}>
        <label>
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <button type="submit">Login</button>
        <button type="button" onClick={logout}>Clear Token</button>
      </form>
      {message && <p>{message}</p>}
    </main>
  );
}
