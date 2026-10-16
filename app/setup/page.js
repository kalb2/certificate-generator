'use client';
import { useEffect, useMemo, useState } from 'react';
import AdminNav from '@/app/components/AdminNav';

const fieldLabels = {
  firstName:'First name', lastName:'Last name', courseName:'Course name', completionDate:'Completion date', signature:'Signature'
};

const defaultPdfOptions = {
  layout:'department',
  title:'CERTIFICATE OF COMPLETION',
  introText:'This certifies that',
  completionText:'has successfully completed',
  datePrefix:'Completed on',
  signatureLabel:'Signature',
  primaryColor:'#143057',
  accentColor:'#B8862B',
  logoSize:'medium',
  showOuterBorder:true
};

export default function Setup() {
  const [forms,setForms] = useState([]);
  const [formId,setFormId] = useState('');
  const [questions,setQuestions] = useState([]);
  const [mapping,setMapping] = useState({});
  const [message,setMessage] = useState('');
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  const [storageReady,setStorageReady] = useState(null);
  const [result,setResult] = useState(null);
  const [savedSetup,setSavedSetup] = useState(null);
  const [logoPath,setLogoPath] = useState('');
  const [logoPreviewUrl,setLogoPreviewUrl] = useState('');
  const [logoBusy,setLogoBusy] = useState(false);
  const [webhookHealth,setWebhookHealth] = useState(null);
  const [pdfOptions,setPdfOptions] = useState(defaultPdfOptions);
  const selectedForm = useMemo(() => forms.find(f => String(f.id) === String(formId)), [forms,formId]);

  async function refreshWebhookHealth() {
    try {
      const r = await fetch('/api/connecteam/webhook-status', { cache:'no-store' });
      const d = await r.json();
      setWebhookHealth(d);
    } catch {
      setWebhookHealth({ state:'check_failed', registered:false, deliveryConfirmed:false, message:'Webhook status could not be checked.' });
    }
  }

  useEffect(() => {
    fetch('/api/status').then(r=>r.json()).then(d=>setStorageReady(d.storageReady)).catch(()=>setStorageReady(false));
    fetch('/api/setup').then(r=>r.json()).then(d=>{
      if (d.setup) {
        setSavedSetup(d.setup);
        setFormId(String(d.setup.formId || ''));
        setMapping(d.setup.mapping || {});
        setPdfOptions({...defaultPdfOptions, ...(d.setup.pdfOptions || {})});
        if (d.setup.logoPath) {
          setLogoPath(d.setup.logoPath);
          setLogoPreviewUrl(`/api/logo?path=${encodeURIComponent(d.setup.logoPath)}`);
        } else if (d.setup.logoUrl) {
          setLogoPreviewUrl(d.setup.logoUrl);
        }
        setResult({ created:d.setup.webhookCreatedAutomatically, verified:d.setup.webhookVerified, webhookUrl:d.setup.webhookUrl, setup:d.setup });
      }
    }).catch(()=>{}).finally(refreshWebhookHealth);
  }, []);

  async function discoverForms(){
    setBusy(true); setError(''); setMessage('Connecting to Connecteam with the API key from this deployment...');
    try {
      const r=await fetch('/api/connecteam/forms',{method:'POST'});
      const d=await r.json(); if(!r.ok) throw new Error(d.error || 'Unable to list forms.');
      setForms(d.forms); setMessage(`Found ${d.forms.length} form${d.forms.length===1?'':'s'}. Choose the certificate form.`);
      if (savedSetup?.formId) await loadForm(String(savedSetup.formId), d.forms);
    } catch(e){ setError(e.message); setMessage(''); } finally { setBusy(false); }
  }

  async function loadForm(id, availableForms=forms){
    setFormId(id); setQuestions([]); if(!id) return;
    setBusy(true); setError(''); setMessage('Reading form questions...');
    try {
      const r=await fetch('/api/connecteam/form',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({formId:id})});
      const d=await r.json(); if(!r.ok) throw new Error(d.error || 'Unable to read form.');
      setQuestions(d.questions);
      setMapping(savedSetup && String(savedSetup.formId)===String(id) ? savedSetup.mapping : d.mapping);
      setMessage('Fields detected. Review the selections, customize the certificate, then save the automation.');
    } catch(e){ setError(e.message); setMessage(''); } finally { setBusy(false); }
  }

  async function uploadLogo(file){
    if (!file) return;
    setLogoBusy(true); setError('');
    try {
      const body = new FormData(); body.append('logo', file);
      const r = await fetch('/api/logo', { method:'POST', body });
      const d = await r.json(); if(!r.ok) throw new Error(d.error || 'Unable to upload logo.');
      setLogoPath(d.logoPath);
      setLogoPreviewUrl(d.logoUrl);
      setMessage('Logo uploaded privately. Save the automation to use it on new certificates.');
    } catch(e){ setError(e.message); } finally { setLogoBusy(false); }
  }

  async function createAutomation(){
    setBusy(true); setError(''); setMessage('Saving automation and creating the Connecteam webhook...');
    try {
      const formName = selectedForm?.name || savedSetup?.formName || 'Selected form';
      const legacyLogoUrl = !logoPath && savedSetup?.logoUrl ? savedSetup.logoUrl : '';
      const r=await fetch('/api/connecteam/create-automation',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({formId,formName,mapping,logoPath,logoUrl:legacyLogoUrl,pdfOptions})});
      const d=await r.json(); if(!r.ok) throw new Error(d.error || 'Unable to create automation.');
      setResult(d); setSavedSetup(d.setup);
      setMessage(`Automation saved. Connecteam webhook ${d.webhookAction === 'updated' ? 'updated' : 'created'} and verified successfully.`);
      await refreshWebhookHealth();
    } catch(e){ setError(e.message); setMessage(''); } finally { setBusy(false); }
  }

  function removeLogo() {
    setLogoPath('');
    setLogoPreviewUrl('');
    setSavedSetup(current => current ? {...current, logoPath:'', logoUrl:''} : current);
  }

  function updatePdfOption(key,value) {
    setPdfOptions(current => ({...current,[key]:value}));
  }

  return <main>
    <AdminNav />
    <h1>Set up certificate automation</h1>
    <p className="muted">Use this page to create or update the single active automation for this Connecteam account.</p>

    {savedSetup && <div className="card active-card">
      <div className="status-row"><h2>Saved certificate configuration</h2><span className="status-pill">Active</span></div>
      <table><tbody>
        <tr><th>Form</th><td>{savedSetup.formName}</td></tr>
        <tr><th>Created</th><td>{new Date(savedSetup.createdAt).toLocaleString()}</td></tr>
        <tr><th>Logo</th><td>{savedSetup.logoPath || savedSetup.logoUrl ? 'Included' : 'Not included'}</td></tr>
        <tr><th>PDF layout</th><td>{pdfOptions.layout === 'department' ? 'Department-style header' : 'Centered classic'}</td></tr>
        <tr><th>Webhook</th><td>{savedSetup.webhookId ? `Connecteam webhook #${savedSetup.webhookId}` : 'Will be created automatically when you save'}</td></tr>
      </tbody></table>
    </div>}

    {savedSetup && <div className="card">
      <div className="status-row"><h2>Webhook health</h2><button className="secondary" onClick={refreshWebhookHealth}>Recheck</button></div>
      {!webhookHealth && <p>Checking Connecteam webhook...</p>}
      {webhookHealth && webhookHealth.state === 'needs_provisioning' && <>
        <div className="notice"><strong>Webhook not created yet.</strong> {webhookHealth.message}</div>
        <p className="muted">This is expected for a setup saved before automatic webhook creation was added.</p>
      </>}
      {webhookHealth && webhookHealth.state === 'not_configured' && <div className="notice">{webhookHealth.message}</div>}
      {webhookHealth && ['invalid_setup','verification_failed','check_failed'].includes(webhookHealth.state) && <div className="notice error"><strong>Webhook check needs attention.</strong> {webhookHealth.message || webhookHealth.error}</div>}
      {webhookHealth && webhookHealth.registered && <>
        <div className="notice success"><strong>Registered and verified in Connecteam.</strong> {webhookHealth.message}</div>
        {!webhookHealth.deliveryConfirmed && <div className="notice"><strong>Live delivery not confirmed yet.</strong> Submit the selected form once, then click Recheck.</div>}
        {webhookHealth.deliveryConfirmed && <div className="notice success"><strong>End-to-end delivery confirmed.</strong> Last form event received {new Date(webhookHealth.lastDelivery.receivedAt).toLocaleString()}.</div>}
      </>}
    </div>}

    <div className="card">
      <h2>1. Storage check</h2>
      {storageReady === null && <p>Checking Vercel storage...</p>}
      {storageReady === true && <div className="notice success">Vercel Blob storage is connected. This app expects a private Blob store.</div>}
      {storageReady === false && <div className="notice error"><strong>Storage is not connected.</strong> Connect a private Vercel Blob store to this project, then redeploy.</div>}
    </div>

    <div className="card">
      <h2>2. Connect Connecteam</h2>
      <div className="notice success"><strong>Connecteam credentials come from the deployment.</strong> You do not need to paste the API key again here.</div>
      <div className="actions"><button disabled={busy} onClick={discoverForms}>Find my forms</button></div>
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
      <p className="muted">In the default layout, this logo occupies the top-left branding area of the certificate.</p>
      <label>Upload a PNG, JPEG, or WebP logo</label>
      <input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>uploadLogo(e.target.files?.[0])} disabled={logoBusy} />
      {logoPreviewUrl && <div className="logo-preview"><img src={logoPreviewUrl} alt="Company logo preview" /><button className="secondary" onClick={removeLogo}>Remove logo</button></div>}

      <h2 className="section-heading">6. Certificate layout</h2>
      <div className="row">
        <div>
          <label>Layout</label>
          <select value={pdfOptions.layout} onChange={e=>updatePdfOption('layout',e.target.value)}>
            <option value="department">Department-style header</option>
            <option value="centered">Centered classic</option>
          </select>
        </div>
        <div>
          <label>Logo size</label>
          <select value={pdfOptions.logoSize} onChange={e=>updatePdfOption('logoSize',e.target.value)}>
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </div>
        <div>
          <label>Certificate title</label>
          <input value={pdfOptions.title} onChange={e=>updatePdfOption('title',e.target.value)} />
        </div>
        <div>
          <label>Intro text</label>
          <input value={pdfOptions.introText} onChange={e=>updatePdfOption('introText',e.target.value)} />
        </div>
        <div>
          <label>Completion text</label>
          <input value={pdfOptions.completionText} onChange={e=>updatePdfOption('completionText',e.target.value)} />
        </div>
        <div>
          <label>Date prefix</label>
          <input value={pdfOptions.datePrefix} onChange={e=>updatePdfOption('datePrefix',e.target.value)} />
        </div>
        <div>
          <label>Signature label</label>
          <input value={pdfOptions.signatureLabel} onChange={e=>updatePdfOption('signatureLabel',e.target.value)} />
        </div>
        <div>
          <label>Primary color</label>
          <input type="color" value={pdfOptions.primaryColor} onChange={e=>updatePdfOption('primaryColor',e.target.value)} />
        </div>
        <div>
          <label>Accent color</label>
          <input type="color" value={pdfOptions.accentColor} onChange={e=>updatePdfOption('accentColor',e.target.value)} />
        </div>
        <div>
          <label>Border</label>
          <select value={pdfOptions.showOuterBorder ? 'yes' : 'no'} onChange={e=>updatePdfOption('showOuterBorder',e.target.value === 'yes')}>
            <option value="yes">Show border</option>
            <option value="no">No border</option>
          </select>
        </div>
      </div>

      <div className="actions"><button disabled={!storageReady || busy || logoBusy || !mapping.firstName || !mapping.lastName || !mapping.signature} onClick={createAutomation}>Save automation</button></div>
    </div>}

    {message && <div className="notice success">{message}</div>}
    {error && <div className="notice error">{error}</div>}

    {result && <div className="card">
      <h2>Automation status</h2>
      {result.created && result.verified
        ? <div className="notice success"><strong>Webhook created and verified automatically.</strong> No manual Connecteam webhook setup is required.</div>
        : <div className="notice">Save the automation to create and verify the Connecteam webhook automatically.</div>}
      <p className="muted">After the first real form submission, the Webhook health section above will confirm end-to-end delivery.</p>
      <div className="actions"><a className="button secondary" href="/certificates">Open certificate history</a></div>
    </div>}
  </main>;
}
