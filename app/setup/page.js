'use client';
import { useEffect, useMemo, useState } from 'react';

const fieldLabels = {
  firstName:'First name', lastName:'Last name', courseName:'Course name', completionDate:'Completion date', signature:'Signature'
};

export default function Setup() {
  const [apiKey,setApiKey] = useState('');
  const [forms,setForms] = useState([]);
  const [formId,setFormId] = useState('');
  const [questions,setQuestions] = useState([]);
  const [mapping,setMapping] = useState({});
  const [message,setMessage] = useState('');
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  const [storageReady,setStorageReady] = useState(null);
  const [storageStatus,setStorageStatus] = useState(null);
  const [result,setResult] = useState(null);
  const [savedSetup,setSavedSetup] = useState(null);
  const [logoUrl,setLogoUrl] = useState('');
  const [logoBusy,setLogoBusy] = useState(false);
  const selectedForm = useMemo(() => forms.find(f => String(f.id) === String(formId)), [forms,formId]);

  useEffect(() => {
    fetch('/api/status').then(r=>r.json()).then(d=>{ setStorageReady(d.storageReady); setStorageStatus(d); }).catch(()=>{ setStorageReady(false); setStorageStatus(null); });
    fetch('/api/setup').then(r=>r.json()).then(d=>{
      if (d.setup) {
        setSavedSetup(d.setup);
        setFormId(String(d.setup.formId || ''));
        setMapping(d.setup.mapping || {});
        setLogoUrl(d.setup.logoUrl || '');
        setResult({ created:d.setup.webhookCreatedAutomatically, webhookUrl:d.setup.webhookUrl, setup:d.setup });
      }
    }).catch(()=>{});
  }, []);

  async function discoverForms(){
    setBusy(true); setError(''); setMessage('Connecting to Connecteam...');
    try {
      const r=await fetch('/api/connecteam/forms',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({apiKey})});
      const d=await r.json(); if(!r.ok) throw new Error(d.error || 'Unable to list forms.');
      setForms(d.forms); setMessage(`Found ${d.forms.length} form${d.forms.length===1?'':'s'}. Choose the certificate form.`);
      if (savedSetup?.formId) await loadForm(String(savedSetup.formId), d.forms);
    } catch(e){ setError(e.message); setMessage(''); } finally { setBusy(false); }
  }

  async function loadForm(id, availableForms=forms){
    setFormId(id); setQuestions([]); if(!id) return;
    setBusy(true); setError(''); setMessage('Reading form questions...');
    try {
      const r=await fetch('/api/connecteam/form',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({apiKey,formId:id})});
      const d=await r.json(); if(!r.ok) throw new Error(d.error || 'Unable to read form.');
      setQuestions(d.questions);
      setMapping(savedSetup && String(savedSetup.formId)===String(id) ? savedSetup.mapping : d.mapping);
      setMessage('Fields detected. Review the selections, then save the automation.');
    } catch(e){ setError(e.message); setMessage(''); } finally { setBusy(false); }
  }

  async function uploadLogo(file){
    if (!file) return;
    setLogoBusy(true); setError('');
    try {
      const body = new FormData(); body.append('logo', file);
      const r = await fetch('/api/logo', { method:'POST', body });
      const d = await r.json(); if(!r.ok) throw new Error(d.error || 'Unable to upload logo.');
      setLogoUrl(d.logoUrl); setMessage('Logo uploaded. Save the automation to use it on new certificates.');
    } catch(e){ setError(e.message); } finally { setLogoBusy(false); }
  }

  async function createAutomation(){
    setBusy(true); setError(''); setMessage('Saving certificate automation...');
    try {
      const formName = selectedForm?.name || savedSetup?.formName || 'Selected form';
      const r=await fetch('/api/connecteam/create-automation',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({apiKey,formId,formName,mapping,logoUrl})});
      const d=await r.json(); if(!r.ok) throw new Error(d.error || 'Unable to create automation.');
      setResult(d); setSavedSetup(d.setup); setMessage(d.created ? 'Automation saved and webhook created successfully.' : 'Automation saved. Add the webhook manually using the instructions below.');
    } catch(e){ setError(e.message); setMessage(''); } finally { setBusy(false); }
  }

  return <main>
    <h1>Set up certificate automation</h1>
    <p className="muted">Use this page to create or update the single active automation for this Connecteam account.</p>

    {savedSetup && <div className="card active-card">
      <div className="status-row"><h2>Active automation</h2><span className="status-pill">Active</span></div>
      <table><tbody>
        <tr><th>Form</th><td>{savedSetup.formName}</td></tr>
        <tr><th>Created</th><td>{new Date(savedSetup.createdAt).toLocaleString()}</td></tr>
        <tr><th>Logo</th><td>{savedSetup.logoUrl ? 'Included' : 'Not included'}</td></tr>
        <tr><th>Webhook</th><td><code>{savedSetup.webhookUrl}</code></td></tr>
      </tbody></table>
      <p className="muted">The automation remains active even after leaving this page. Submit the selected form and check Certificate History to verify it.</p>
    </div>}

    <div className="card">
      <h2>1. Storage check</h2>
      {storageReady === null && <p>Checking Vercel storage...</p>}
      {storageReady === true && <div className="notice success">Vercel Blob storage is connected using BLOB_READ_WRITE_TOKEN.</div>}
      {storageReady === false && <div className="notice error"><strong>Storage is not connected.</strong> Add the existing Blob store's read/write token as an environment variable named BLOB_READ_WRITE_TOKEN, then redeploy.</div>}
    </div>

    <div className="card">
      <h2>2. Connect Connecteam</h2>
      <label>Connecteam API key</label>
      <input type="password" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="Paste the API key" autoComplete="off" />
      <div className="actions"><button disabled={!apiKey || busy} onClick={discoverForms}>Find my forms</button></div>
    </div>

    {forms.length > 0 && <div className="card">
      <h2>3. Choose the form</h2>
      <label>Connecteam form</label>
      <select value={formId} onChange={e=>loadForm(e.target.value)}>
        <option value="">Select a form...</option>
        {forms.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
      </select>
    </div>}

    {questions.length > 0 && <div className="card">
      <h2>4. Confirm detected fields</h2>
      <p className="muted">Confirm that Signature points to the actual Connecteam signature question.</p>
      <div className="row">
        {Object.entries(fieldLabels).map(([key,label]) => <div key={key}>
          <label>{label}</label>
          <select value={mapping[key] || ''} onChange={e=>setMapping({...mapping,[key]:e.target.value})}>
            <option value="">Not included</option>
            {questions.map(q=><option key={q.id} value={q.id}>{q.label} — {q.type}</option>)}
          </select>
        </div>)}
      </div>

      <h2 className="section-heading">5. Company logo</h2>
      <label>Upload a PNG, JPEG, or WebP logo</label>
      <input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>uploadLogo(e.target.files?.[0])} disabled={logoBusy} />
      {logoUrl && <div className="logo-preview"><img src={logoUrl} alt="Company logo preview" /><button className="secondary" onClick={()=>setLogoUrl('')}>Remove logo</button></div>}

      <div className="actions"><button disabled={!storageReady || busy || logoBusy || !mapping.firstName || !mapping.lastName || !mapping.signature} onClick={createAutomation}>Save automation</button></div>
    </div>}

    {message && <div className="notice success">{message}</div>}
    {error && <div className="notice error">{error}</div>}

    {result && <div className="card">
      <h2>Webhook setup</h2>
      {result.created ? <p>The Connecteam webhook was created automatically.</p> : <>
        <p>In Connecteam, go to <strong>Settings → API &amp; Integrations → Add webhook</strong> and use:</p>
        <table><tbody>
          <tr><th>Feature</th><td>Forms</td></tr>
          <tr><th>Object</th><td>{savedSetup?.formName || selectedForm?.name}</td></tr>
          <tr><th>Event</th><td>Form submission</td></tr>
          <tr><th>URL</th><td><code>{result.webhookUrl}</code></td></tr>
        </tbody></table>
      </>}
      {result.warning && <div className="notice">{result.warning}</div>}
      <div className="actions"><a className="button secondary" href="/certificates">Open certificate history</a></div>
    </div>}
  </main>;
}
