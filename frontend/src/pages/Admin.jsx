import React, { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../utils/api';

export default function Admin(){
  // --- User management state ---
  const [users, setUsers] = useState([]);
  const [me, setMe] = useState(null);
  const [uForm, setUForm] = useState({ name:'', email:'', password:'', role:'staff' });
  const [uBusy, setUBusy] = useState(false);
  const [uError, setUError] = useState('');

  // --- Backup/Restore state (kept from your previous Admin) ---
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  // Load current user + user list
  async function loadUsers(){
    try{
      const meRes = await apiFetch('/api/auth/me');
      const meData = await meRes.json().catch(()=>({}));
      setMe(meData?.user || null);

      const r = await apiFetch('/api/users');
      if (!r.ok){
        const d = await r.json().catch(()=>({}));
        setUError(d?.error || 'Failed to load users (ensure backend /api/users exists)');
        setUsers([]);
        return;
      }
      const data = await r.json();
      setUsers(Array.isArray(data) ? data : []);
      setUError('');
    }catch(e){
      setUError('Failed to load users');
      setUsers([]);
    }
  }

  useEffect(()=>{ loadUsers(); },[]);

  async function addUser(){
    if (!uForm.email || !uForm.password) return alert('Email and password required');
    setUBusy(true);
    const r = await apiFetch('/api/users', { method:'POST', body: JSON.stringify(uForm) });
    setUBusy(false);
    if (!r.ok){
      const d = await r.json().catch(()=>({}));
      return alert(d?.error || 'Failed to create user');
    }
    setUForm({ name:'', email:'', password:'', role:'staff' });
    loadUsers();
  }

  async function changeRole(u, role){
    if (!confirm(`Change ${u.email} to ${role}?`)) return;
    const r = await apiFetch(`/api/users/${u.id}`, { method:'PUT', body: JSON.stringify({ role }) });
    if (!r.ok){
      const d = await r.json().catch(()=>({}));
      return alert(d?.error || 'Failed to update role');
    }
    loadUsers();
  }

  async function changePassword(u){
    const pwd = prompt('New password for ' + u.email + ':');
    if (!pwd) return;
    const r = await apiFetch(`/api/users/${u.id}/password`, { method:'PATCH', body: JSON.stringify({ password: pwd }) });
    if (!r.ok){
      const d = await r.json().catch(()=>({}));
      return alert(d?.error || 'Failed to change password');
    }
    alert('Password updated');
  }

  async function removeUser(u){
    if (!confirm(`Delete user ${u.email}?`)) return;
    const r = await apiFetch(`/api/users/${u.id}`, { method:'DELETE' });
    const d = await r.json().catch(()=>({}));
    if (!r.ok) return alert(d?.error || 'Failed to delete');
    loadUsers();
  }

  // --- Backup/Restore (original functionality preserved) ---
  async function restore(){
    const f = fileRef.current?.files?.[0];
    if(!f) return alert('Choose a JSON backup file first');
    try{
      setBusy(true); setMsg('');
      const txt = await f.text();
      const data = JSON.parse(txt);
      const r = await fetch('/api/restore', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify(data)
      });
      const d = await r.json().catch(()=>({}));
      if(!r.ok) throw new Error(d?.error || 'Restore failed');
      setMsg('Restore complete');
    }catch(e){
      setMsg(e.message || 'Restore failed');
    }finally{
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">Admin</h1>

      {/* --- User Management --- */}
      <div className="card" style={{marginBottom:12}}>
        <h3 style={{marginTop:0}}>User management</h3>
        {uError && <div className="error" style={{marginBottom:8}}>{uError}</div>}
        <table className="table">
          <thead>
            <tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.name || '—'}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td style={{display:'flex', gap:8, flexWrap:'wrap'}}>
                  {me?.role === 'superadmin' && u.role !== 'superadmin' && (
                    <>
                      <button className="border" onClick={()=>changeRole(u,'admin')}>Make admin</button>
                      <button className="border" onClick={()=>changeRole(u,'staff')}>Make staff</button>
                    </>
                  )}
                  {me?.role === 'admin' && u.role === 'staff' && (
                    <button className="border" onClick={()=>changeRole(u,'admin')}>Promote to admin</button>
                  )}
                  <button className="border" onClick={()=>changePassword(u)}>Change password</button>
                  {(me?.role === 'superadmin' || (me?.role === 'admin' && u.role !== 'superadmin')) && (
                    <button className="danger" onClick={()=>removeUser(u)}>Delete</button>
                  )}
                </td>
              </tr>
            ))}
            {users.length===0 && <tr><td colSpan={5} className="muted">No users</td></tr>}
          </tbody>
        </table>

        <div className="card" style={{marginTop:12}}>
          <h4 style={{marginTop:0}}>Add user</h4>
          <div className="form-grid">
            <input placeholder="Name" value={uForm.name} onChange={e=>setUForm({...uForm, name:e.target.value})} />
            <input placeholder="Email" value={uForm.email} onChange={e=>setUForm({...uForm, email:e.target.value})} />
            <input placeholder="Password" type="password" value={uForm.password} onChange={e=>setUForm({...uForm, password:e.target.value})} />
            <select value={uForm.role} onChange={e=>setUForm({...uForm, role:e.target.value})}>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
              <option value="superadmin">Super Admin</option>
            </select>
          </div>
          <div style={{display:'flex', gap:8, justifyContent:'flex-end', marginTop:10}}>
            <button className="btn" onClick={addUser} disabled={uBusy}>{uBusy?'Saving…':'Save user'}</button>
          </div>
        </div>
      </div>

      {/* --- Backup --- */}
      <div className="card" style={{marginBottom:12}}>
        <h3 style={{marginTop:0}}>Backup</h3>
        <p className="muted" style={{marginBottom:8}}>Download all data as JSON.</p>
        <a href="/api/backup" className="btn" style={{display:'inline-block'}}>Download backup</a>
      </div>

      {/* --- Restore --- */}
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
