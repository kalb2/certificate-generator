'use client';
import { useEffect, useState } from 'react';
import AdminNav from '@/app/components/AdminNav';

export default function Certificates(){
  const [items,setItems]=useState([]);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    fetch('/api/certificates')
      .then(async r=>{const d=await r.json(); if(!r.ok) throw new Error(d.error); setItems(d.certificates||[])})
      .catch(e=>setError(e.message))
      .finally(()=>setLoading(false));
  },[]);

  return <main>
    <AdminNav />
    <h1>Generated certificates</h1>
    <p className="muted">Certificate files are stored privately. Downloads are only available while signed in.</p>
    <div className="card">
      {loading && <p>Loading...</p>}
      {error && <div className="notice error">{error}</div>}
      {!loading && !error && items.length===0 && <p>No certificates yet. Submit the selected Connecteam form after the webhook is configured.</p>}
      {items.length>0 && <table><thead><tr><th>Recipient</th><th>Course</th><th>Completed</th><th>PDF</th></tr></thead><tbody>
        {items.map(i=><tr key={i.submissionId}><td>{i.firstName} {i.lastName}</td><td>{i.courseName}</td><td>{i.completionDate}</td><td><a href={i.downloadUrl}>Download</a></td></tr>)}
      </tbody></table>}
    </div>
  </main>;
}
