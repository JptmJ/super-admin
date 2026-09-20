'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Brand } from '@/components/Brand';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setError(payload?.error?.message ?? 'Sign-in failed.');
        setBusy(false);
        return;
      }
      router.push('/');
      router.refresh();
    } catch {
      setError('Cannot reach the server. Check that the backend is running.');
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <Brand />
        <h1>Platform Admin</h1>
        <p>Super admin access only.</p>

        {error && <div className="alert error">{error}</div>}

        <div className="field" style={{ marginBottom: 14 }}>
          <label htmlFor="email">Email</label>
          <input
            id="email" type="email" value={email} autoComplete="username" required
            onChange={(e) => setEmail(e.target.value)} placeholder="you@ratnagrid.com"
          />
        </div>

        <div className="field" style={{ marginBottom: 20 }}>
          <label htmlFor="password">Password</label>
          <input
            id="password" type="password" value={password} autoComplete="current-password" required
            onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••"
          />
        </div>

        <button className="btn gold" type="submit" disabled={busy} style={{ width: '100%', justifyContent: 'center' }}>
          {busy ? <><span className="spinner" /> Signing in…</> : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
