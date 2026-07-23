export default function Home() {
  return (
    <main>
      <h1>Connecteam Certificate Automation</h1>
      <p className="muted">One Connecteam account. One selected form. Automatic PDF certificates.</p>
      <div className="card">
        <h2>Start here</h2>
        <p>The setup screen connects to Connecteam, lists your forms, detects the certificate fields, and creates the form webhook.</p>
        <div className="actions">
          <a className="button" href="/setup">Set up automation</a>
          <a className="button secondary" href="/certificates">View certificates</a>
        </div>
      </div>
      <div className="card">
        <h2>Required Vercel storage</h2>
        <p>Generated PDFs must be stored somewhere after Connecteam calls the webhook. This app uses a Vercel Blob store connected to this project. The setup screen checks this automatically.</p>
      </div>
    </main>
  );
}
