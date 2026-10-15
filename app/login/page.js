'use client';
import { useState } from 'react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to sign in.');
      window.location.assign('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return <main className="login-shell">
    <div className="card login-card">
      <h1>Certificate Admin</h1>
      <p className="muted">Sign in to manage the Connecteam certificate automation and view generated certificates.</p>
      <form onSubmit={submit}>
        <label>Admin email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" required />
        <label>Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required />
        {error && <div className="notice error">{error}</div>}
        <div className="actions"><button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button></div>
      </form>
    </div>
  </main>;
}
