'use client';
import { useEffect, useState } from 'react';

export default function Certificates(){
  const [items,setItems]=useState([]); const [error,setError]=useState(''); const [loading,setLoading]=useState(true);
  useEffect(()=>{fetch('/api/certificates').then(async r=>{const d=await r.json(); if(!r.ok) throw new Error(d.error); setItems(d.certificates||[])}).catch(e=>setError(e.message)).finally(()=>setLoading(false))},[]);
  return <main>
    <h1>Generated certificates</h1>
    <div className="actions"><a className="button secondary" href="/setup">Setup</a></div>
    <div className="card">
      {loading && <p>Loading...</p>}
      {error && <div className="notice error">{error}</div>}
      {!loading && !error && items.length===0 && <p>No certificates yet. Submit the selected Connecteam form after the webhook is configured.</p>}
      {items.length>0 && <table><thead><tr><th>Recipient</th><th>Course</th><th>Completed</th><th>PDF</th></tr></thead><tbody>
        {items.map(i=><tr key={i.submissionId}><td>{i.firstName} {i.lastName}</td><td>{i.courseName}</td><td>{i.completionDate}</td><td><a href={i.certificateUrl} target="_blank" rel="noreferrer">Download</a></td></tr>)}
      </tbody></table>}
    </div>
  </main>
}
