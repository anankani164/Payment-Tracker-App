import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../utils/api';

export default function Clients(){
  const [clients, setClients] = useState([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name:'', email:'', phone:'' });

  async function load(){
    try{
      const r = await apiFetch('/api/clients');
      if (!r.ok) { setClients([]); return; }
      const data = await r.json();
      setClients(Array.isArray(data) ? data : []);
    }catch{
      setClients([]);
    }
  }
  useEffect(()=>{ load(); },[]);

  async function add(){
    if (!form.name) return alert('Name required');
    const r = await apiFetch('/api/clients', { method:'POST', body: JSON.stringify(form) });
    if (!r.ok) {
      const d = await r.json().catch(()=>({}));
      return alert(d.error || 'Failed to add client');
    }
    setShow(false);
    setForm({ name:'', email:'', phone:'' });
    load();
  }

  async function remove(id){
    if (!confirm('Delete this client?')) return;
    const r = await apiFetch('/api/clients/' + id, { method:'DELETE' });
    if (!r.ok) {
      const d = await r.json().catch(()=>({}));
      return alert(d.error || 'Failed to delete');
    }
    load();
  }

  return (
    <div className="page">
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
        <h1 style={{margin:0}}>Clients</h1>
        <button className="btn" onClick={()=>setShow(true)}>Add Client</button>
      </div>

      <table className="table" style={{marginTop:12}}>
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {clients.map(c => (
            <tr key={c.id}>
              <td>{c.id}</td>
              <td><Link to={`/clients/${c.id}`}>{c.name || `#${c.id}`}</Link></td>
              <td>{c.email || '—'}</td>
              <td>{c.phone || '—'}</td>
              <td>
                <button className="danger" onClick={()=>remove(c.id)}>Delete</button>
              </td>
            </tr>
          ))}
          {clients.length===0 && <tr><td colSpan={5} className="muted">No clients</td></tr>}
        </tbody>
      </table>

      {show && (
        <div className="modal">
          <div className="card" style={{maxWidth:480}}>
            <h3 style={{marginTop:0}}>Add client</h3>
            <div className="form-grid">
              <input placeholder="Name" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} />
              <input placeholder="Email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} />
              <input placeholder="Phone" value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})} />
            </div>
            <div style={{display:'flex', justifyContent:'flex-end', gap:8, marginTop:12}}>
              <button className="border" onClick={()=>setShow(false)}>Cancel</button>
              <button className="btn" onClick={add}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
