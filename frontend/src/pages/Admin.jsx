import React, { useRef, useState } from 'react';

export default function Admin(){
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function restore(){
    const f = fileRef.current?.files?.[0];
    if(!f) return alert('Choose a JSON backup file first');
    try{
      setBusy(true); setMsg('');
      const txt = await f.text();
      const data = JSON.parse(txt);
      const r = await fetch('/api/restore', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(data)
      });
      const res = await r.json();
      if(!r.ok) throw new Error(res?.error||'Failed');
      setMsg(`Restore complete: ${res.restored.clients} clients, ${res.restored.invoices} invoices, ${res.restored.payments} payments`);
    }catch(e){ setMsg(e.message||'Restore failed'); }
    finally{ setBusy(false); }
  }

  return (
    <div>
      <h1 className="page-title">Admin</h1>

      <div className="card" style={{marginBottom:12}}>
        <h3 style={{marginTop:0}}>Backup</h3>
        <p className="muted" style={{marginBottom:8}}>Download all data as JSON.</p>
        <a href="/api/backup" className="btn" style={{display:'inline-block'}}>Download backup</a>
      </div>

      <div className="card">
        <h3 style={{marginTop:0}}>Restore</h3>
        <p className="muted" style={{marginBottom:8}}>Restore from a JSON backup file. This will overwrite existing data.</p>
        <input type="file" accept="application/json" ref={fileRef} />
        <div style={{display:'flex', gap:8, marginTop:10}}>
          <button className="btn" onClick={restore} disabled={busy}>{busy?'Restoring…':'Restore'}</button>
        </div>
        {msg && <p style={{marginTop:10}}>{msg}</p>}
      </div>
    </div>
  )
}
