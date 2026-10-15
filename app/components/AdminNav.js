'use client';

export default function AdminNav() {
  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.assign('/login');
  }

  return <div className="admin-nav">
    <div className="actions">
      <a className="button secondary" href="/">Home</a>
      <a className="button secondary" href="/setup">Setup</a>
      <a className="button secondary" href="/certificates">Certificates</a>
      <button className="secondary" onClick={logout}>Log out</button>
    </div>
  </div>;
}
