import { requirePageAuth } from '@/lib/auth';
import AdminNav from '@/app/components/AdminNav';

export default async function Home() {
  await requirePageAuth();
  return (
    <main>
      <AdminNav />
      <h1>Connecteam Certificate Automation</h1>
      <p className="muted">One Connecteam account. One selected form. Automatic private PDF certificates.</p>
      <div className="card">
        <h2>Manage automation</h2>
        <p>Choose the Connecteam form, map certificate fields, upload a logo, and configure the permanent webhook.</p>
        <div className="actions">
          <a className="button" href="/setup">Set up automation</a>
          <a className="button secondary" href="/certificates">View certificates</a>
        </div>
      </div>
      <div className="card">
        <h2>Private by default</h2>
        <p>Setup, certificate history, and PDF downloads require the admin login. Generated certificates are stored in a private Vercel Blob store.</p>
      </div>
    </main>
  );
}
