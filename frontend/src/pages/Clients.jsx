import React, { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';

export default function Clients(){
  const [clients, setClients] = useState([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name:'', email:'', phone:'', company:'', notes:'' });

  async function load(){
    setClients(await (await fetch('/api/clients')).json());
  }
  useEffect(()=>{ load(); },[]);

  async function add(){
    if(!form.name) return alert('Name is required');
    const r = await apiFetch('/api/clients', {method:'POST', body: JSON.stringify(form)});
    if(!r.ok) return alert('Failed to add client (login may be required)');
    setShow(false); setForm({ name:'', email:'', phone:'', company:'', notes:'' }); load();
  }

  async function del(id){
    if(!confirm('Delete this client and ALL their invoices & payments?')) return;
    const r = await apiFetch(`/api/clients/${id}?force=true`, {method:'DELETE'});
    const data = await r.json();
    if(!r.ok) return alert(data?.error||'Failed to delete client');
    load();
  }

  return (
    <div>
      <h1 className="page-title">Clients</h1>

      <div style={{display:'flex', gap:8, marginBottom:12, flexWrap:'wrap'}}>
        <button className="btn" onClick={()=>setShow(true)}>Add Client</button>
      </div>

      <div className="card table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Company</th><th>Actions</th></tr></thead>
          <tbody>
            {clients.map(c=> (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.email||''}</td>
                <td>{c.phone||''}</td>
                <td>{c.company||''}</td>
                <td><button className="btn danger" onClick={()=>del(c.id)}>Delete</button></td>
              </tr>
            ))}
            {clients.length===0 && <tr><td colSpan={5} className="muted">No clients yet</td></tr>}
          </tbody>
        </table>
      </div>

      {show && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center'}}>
          <div className="card" style={{width:'100%', maxWidth:520}}>
            <h3 style={{marginTop:0}}>Add client</h3>
            <div style={{display:'grid', gap:12}}>
              <input placeholder="Name" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} />
              <input placeholder="Email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} />
              <input placeholder="Phone" value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})} />
              <input placeholder="Company" value={form.company} onChange={e=>setForm({...form, company:e.target.value})} />
              <textarea placeholder="Notes" value={form.notes} onChange={e=>setForm({...form, notes:e.target.value})} />
            </div>
            <div style={{display:'flex', gap:8, justifyContent:'flex-end', marginTop:12}}>
              <button onClick={()=>setShow(false)} className="border">Cancel</button>
              <button onClick={add} className="btn">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
