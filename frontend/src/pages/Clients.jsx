import React, { useEffect, useState } from 'react';
import { downloadCSV, downloadPDF } from '../utils/export';
export default function Clients(){
  const [clients, setClients] = useState([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({name:'',email:'',phone:''});
  async function load(){ setClients(await (await fetch('/api/clients')).json()); }
  useEffect(()=>{ load(); },[]);
  async function add(){
    if(!form.name) return alert('Name required');
    const r = await fetch('/api/clients', {method:'POST',headers:{'Content-Type':'application/json'}, body: JSON.stringify(form)});
    if(!r.ok) return alert('Failed to add');
    setShow(false); setForm({name:'',email:'',phone:''}); load();
  }
  return (
    <div>
      <h1 className="page-title">Clients</h1>
      <div style={{display:'flex',gap:8, marginBottom:12}}>
        <button className="btn" onClick={()=>setShow(true)}>Add Client</button>
        <button className="btn secondary" onClick={()=>downloadCSV('clients.csv', clients)}>Export CSV</button>
        <button className="btn secondary" onClick={()=>downloadPDF('Clients', clients)}>Export PDF</button>
      </div>
      <div className="card">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Phone</th></tr></thead>
          <tbody>
            {clients.map(c=> <tr key={c.id}><td>{c.name}</td><td>{c.email||''}</td><td>{c.phone||''}</td></tr>)}
            {clients.length===0 && <tr><td colSpan={3} className="muted">No clients yet</td></tr>}
          </tbody>
        </table>
      </div>
      {show && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center'}}>
          <div className="card" style={{width:'100%', maxWidth:420}}>
            <h3 style={{marginTop:0}}>Add client</h3>
            <div style={{display:'grid', gap:12}}>
              <input placeholder="Name" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} />
              <input placeholder="Email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} />
              <input placeholder="Phone" value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})} />
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
