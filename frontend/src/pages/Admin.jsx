import React, { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';

export default function Admin(){
  const [users, setUsers] = useState([]);
  const [me, setMe] = useState(null);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name:'', email:'', password:'', role:'staff' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load(){
    try{
      const meRes = await apiFetch('/api/auth/me');
      const meData = await meRes.json();
      setMe(meData.user);

      const r = await apiFetch('/api/users');
      if(!r.ok){
        const d = await r.json().catch(()=>({}));
        setError(d.error || 'Failed to load users (check backend /api/users routes & auth)');
        setUsers([]);
        return;
      }
      const data = await r.json();
      setUsers(Array.isArray(data) ? data : []);
      setError('');
    }catch(e){
      setError('Failed to load users');
      setUsers([]);
    }
  }
  useEffect(()=>{ load(); },[]);

  async function addUser(){
    if(!form.email || !form.password) return alert('Email and password required');
    setSaving(true);
    const r = await apiFetch('/api/users', { method:'POST', body: JSON.stringify(form) });
    setSaving(false);
    if(!r.ok){
      const d = await r.json().catch(()=>({}));
      return alert(d.error || 'Failed to create user');
    }
    setShow(false);
    setForm({ name:'', email:'', password:'', role:'staff' });
    load();
  }

  async function changeRole(u, role){
    if(!confirm(`Change ${u.email} to ${role}?`)) return;
    const r = await apiFetch(`/api/users/${u.id}`, { method:'PUT', body: JSON.stringify({ role }) });
    if(!r.ok){
      const d = await r.json().catch(()=>({}));
      return alert(d.error || 'Failed to update role');
    }
    load();
  }

  async function resetPwd(u){
    const pwd = prompt('New password for ' + u.email + ':');
    if(!pwd) return;
    const r = await apiFetch(`/api/users/${u.id}/password`, { method:'PATCH', body: JSON.stringify({ password: pwd }) });
    if(!r.ok){
      const d = await r.json().catch(()=>({}));
      return alert(d.error || 'Failed to change password');
    }
    alert('Password updated');
  }

  async function remove(u){
    if(!confirm(`Delete user ${u.email}?`)) return;
    const r = await apiFetch(`/api/users/${u.id}`, { method:'DELETE' });
    const d = await r.json().catch(()=>({}));
    if(!r.ok) return alert(d.error || 'Failed to delete');
    load();
  }

  return (
    <div className="page">
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
        <h1 style={{margin:0}}>Users</h1>
        <button className="btn" onClick={()=>setShow(true)}>Add User</button>
      </div>

      {error && <div className="error" style={{marginTop:8}}>{error}</div>}

      <table className="table" style={{marginTop:12}}>
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
                <button className="border" onClick={()=>resetPwd(u)}>Change password</button>
                {(me?.role === 'superadmin' || (me?.role === 'admin' && u.role !== 'superadmin')) && (
                  <button className="danger" onClick={()=>remove(u)}>Delete</button>
                )}
              </td>
            </tr>
          ))}
          {users.length===0 && <tr><td colSpan={5} className="muted">No users</td></tr>}
        </tbody>
      </table>

      {show && (
        <div className="modal">
          <div className="card" style={{maxWidth:480}}>
            <h3 style={{marginTop:0}}>Add user</h3>
            <div className="form-grid">
              <input placeholder="Name" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} />
              <input placeholder="Email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} />
              <input placeholder="Password" type="password" value={form.password} onChange={e=>setForm({...form, password:e.target.value})} />
              <select value={form.role} onChange={e=>setForm({...form, role:e.target.value})}>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Super Admin</option>
              </select>
            </div>
            <div style={{display:'flex', justifyContent:'flex-end', gap:8, marginTop:12}}>
              <button className="border" onClick={()=>setShow(false)}>Cancel</button>
              <button className="btn" onClick={addUser} disabled={saving}>{saving?'Saving…':'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
