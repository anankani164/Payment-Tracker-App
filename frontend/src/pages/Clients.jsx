import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../utils/api';

export default function Clients(){
  const [items, setItems] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name:'', email:'', phone:'', company:'', notes:'' });
  const [saving, setSaving] = useState(false);

  async function load(){
    const res = await apiFetch('/api/clients');
    const data = res.ok ? await res.json() : [];
    setItems(Array.isArray(data) ? data : (data.items || []));
  }
  useEffect(()=>{ load(); }, []);

  async function addClient(e){
    e.preventDefault();
    if (!form.name) return;
    setSaving(true);
    const res = await apiFetch('/api/clients', { method:'POST', body: JSON.stringify(form) });
    setSaving(false);
    if(res.ok){ setShowAdd(false); setForm({ name:'', email:'', phone:'', company:'', notes:'' }); load(); }
    else alert('Failed to add client.');
  }

  async function del(id){
    if(!window.confirm('Delete this client?')) return;
    const res = await apiFetch('/api/clients/'+id, { method:'DELETE' });
    if(res.ok) load(); else alert('Delete failed.');
  }

  return (
    <div className="page">
      <h1>Clients</h1>

      <div className="filters card" style={{gridTemplateColumns:'auto'}}>
        <div className="left" style={{gridTemplateColumns:'auto'}}>
          <button className="pill danger" onClick={()=>setShowAdd(true)}>Add Client</button>
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Company</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(c => (
              <tr key={c.id}>
                <td><Link to={`/clients/${c.id}`}>{c.name}</Link></td>
                <td>{c.email || '—'}</td>
                <td>{c.phone || '—'}</td>
                <td>{c.company || '—'}</td>
                <td><button className="pill danger" onClick={()=>del(c.id)}>Delete</button></td>
              </tr>
            ))}
            {items.length===0 && <tr><td colSpan={5} className="muted">No clients yet</td></tr>}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="modal-backdrop" onClick={()=>setShowAdd(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="hd">Add client</div>
            <form onSubmit={addClient}>
              <div className="bd">
                <input placeholder="Name" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required />
                <div className="row">
                  <input placeholder="Email (optional)" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} />
                  <input placeholder="Phone (optional)" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} />
                </div>
                <input placeholder="Company (optional)" value={form.company} onChange={e=>setForm(f=>({...f,company:e.target.value}))} />
                <textarea placeholder="Notes (optional)" rows={3} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} />
              </div>
              <div className="ft">
                <button type="button" className="pill btn" onClick={()=>setShowAdd(false)}>Cancel</button>
                <button type="submit" className="pill danger" disabled={saving}>{saving?'Saving…':'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
