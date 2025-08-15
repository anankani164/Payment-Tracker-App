import React, { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';

export default function Clients(){
  const [clients, setClients] = useState([]);
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name:'', email:'', phone:'', company:'', notes:'' });

  async function load(){
    try{
      const res = await fetch('/api/clients');
      const data = await res.json();
      setClients(Array.isArray(data) ? data : []);
    }catch(e){
      console.error('Failed to load clients', e);
    }
  }
  useEffect(()=>{ load(); },[]);

  async function add(e){
    e?.preventDefault();
    if(!form.name?.trim()) { alert('Name is required'); return; }
    setSaving(true);
    try{
      const res = await apiFetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if(!res.ok){
        let msg = 'Failed to add client';
        try { const j = await res.json(); if (j?.error) msg = j.error; } catch {}
        throw new Error(msg);
      }
      setShow(false);
      setForm({ name:'', email:'', phone:'', company:'', notes:'' });
      await load();
    }catch(err){
      alert(err.message || 'Failed to add client (login may be required)');
      console.error(err);
    }finally{
      setSaving(false);
    }
  }

  async function del(id){
    if(!confirm('Delete this client and ALL their invoices & payments?')) return;
    try{
      const res = await apiFetch(`/api/clients/${id}?force=true`, { method:'DELETE' });
      if(!res.ok){
        let msg = 'Failed to delete client';
        try { const j = await res.json(); if (j?.error) msg = j.error; } catch {}
        throw new Error(msg);
      }
      await load();
    }catch(err){
      alert(err.message || 'Failed to delete client');
    }
  }

  return (
    <div>
      <h1 className="page-title">Clients</h1>

      <div style={{display:'flex',gap:8, marginBottom:12}}>
        <button className="btn" onClick={()=>setShow(true)}>Add Client</button>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Phone</th><th>Company</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {clients.map(c=> (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.email||''}</td>
                <td>{c.phone||''}</td>
                <td>{c.company||''}</td>
                <td>
                  <button className="btn danger" onClick={()=>del(c.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {clients.length===0 && (
              <tr><td colSpan={5} className="muted">No clients yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {show && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center'}}>
          <div className="card" style={{width:'100%', maxWidth:520}}>
            <h3 style={{marginTop:0}}>Add client</h3>
            <form onSubmit={add}>
              <div style={{display:'grid', gap:12}}>
                <input placeholder="Name" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} />
                <input placeholder="Email (optional)" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} />
                <input placeholder="Phone (optional)" value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})} />
                <input placeholder="Company (optional)" value={form.company} onChange={e=>setForm({...form, company:e.target.value})} />
                <textarea placeholder="Notes (optional)" value={form.notes} onChange={e=>setForm({...form, notes:e.target.value})} />
              </div>
              <div style={{display:'flex', gap:8, justifyContent:'flex-end', marginTop:12}}>
                <button type="button" onClick={()=>setShow(false)} className="border">Cancel</button>
                <button type="submit" className="btn" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
