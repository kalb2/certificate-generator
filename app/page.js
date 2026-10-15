import { list } from '@vercel/blob';
import { requirePageAuth } from '@/lib/auth';
import { blobAuth } from '@/lib/blob';
import { readPrivateJson } from '@/lib/private-blob';
import AdminNav from '@/app/components/AdminNav';

async function getSetupStatus() {
  const connecteamReady = Boolean(
    String(process.env.CONNECTEAM_API_KEY || '').trim() &&
    String(process.env.CONNECTEAM_SENDER_ID || '').trim()
  );

  let storageReady = false;
  let automationReady = false;

  try {
    await list({ limit: 1, ...blobAuth() });
    storageReady = true;
    const setup = await readPrivateJson('app-config/active-automation.json');
    automationReady = Boolean(setup?.active && setup?.formId && setup?.webhookUrl);
  } catch {
    storageReady = false;
    automationReady = false;
  }

  return { connecteamReady, storageReady, automationReady };
}

function ChecklistItem({ done, title, children, action }) {
  return (
    <div className={`checklist-item ${done ? 'done' : 'pending'}`}>
      <div className="checklist-icon" aria-hidden="true">{done ? '✓' : '○'}</div>
      <div className="checklist-content">
        <div className="checklist-heading">
          <strong>{title}</strong>
          <span className={`checklist-status ${done ? 'done' : 'pending'}`}>{done ? 'Complete' : 'Action needed'}</span>
        </div>
        <div className="muted">{children}</div>
        {!done && action}
      </div>
    </div>
  );
}

export default async function Home() {
  await requirePageAuth();
  const status = await getSetupStatus();
  const allReady = status.connecteamReady && status.storageReady && status.automationReady;

  return (
    <main>
      <AdminNav />
      <h1>Connecteam Certificate Automation</h1>
      <p className="muted">One Connecteam account. One selected form. Automatic private PDF certificates.</p>

      {!allReady && <div className="card setup-checklist-card">
        <div className="status-row">
          <div>
            <h2>Finish setup</h2>
            <p className="muted checklist-intro">Complete these steps once, then the app is ready to use.</p>
          </div>
          <span className="badge">First-run checklist</span>
        </div>

        <div className="setup-checklist">
          <ChecklistItem done={true} title="Admin login">
            Your admin login is configured and you are signed in.
          </ChecklistItem>

          <ChecklistItem
            done={status.connecteamReady}
            title="Connecteam credentials"
            action={<p className="checklist-help">If this is incomplete, redeploy using the Deploy with Vercel button and provide both <code>CONNECTEAM_API_KEY</code> and <code>CONNECTEAM_SENDER_ID</code>.</p>}
          >
            The deployment needs the client's Connecteam API key and sender/custom publisher ID for certificate delivery.
          </ChecklistItem>

          <ChecklistItem
            done={status.storageReady}
            title="Private Vercel Blob storage"
            action={<div className="actions"><a className="button" href="https://vercel.com/dashboard" target="_blank" rel="noreferrer">Open Vercel dashboard</a></div>}
          >
            {status.storageReady
              ? 'Private Blob storage is connected.'
              : 'Open the Vercel project, go to Storage, create a Blob store with Private access, connect it to this project, then redeploy. Vercel handles the storage credentials automatically.'}
          </ChecklistItem>

          <ChecklistItem
            done={status.automationReady}
            title="Certificate automation"
            action={status.storageReady ? <div className="actions"><a className="button" href="/setup">Configure automation</a></div> : null}
          >
            {status.automationReady
              ? 'A Connecteam form and webhook configuration are saved.'
              : status.storageReady
                ? 'Choose the Connecteam form, map the certificate fields, upload a logo if desired, and save the automation.'
                : 'Connect private Blob storage first. Then the setup screen can save the certificate configuration.'}
          </ChecklistItem>
        </div>
      </div>}

      {allReady && <div className="notice success"><strong>Setup complete.</strong> Private storage and the certificate automation are ready.</div>}

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
