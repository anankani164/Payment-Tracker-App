// frontend/src/pages/Users.jsx
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { apiFetch } from '../utils/api';

function RowActions({
  u,
  me,
  onEdit,
  onPass,
  onDelete,
}) {
  const isSuper = u.role === 'superadmin';
  const canEdit = !isSuper; // never allow editing superadmin profile here
  const canDelete = !isSuper; // never allow deleting superadmin
  const canChangeOwnSuperPass = isSuper && me?.id === u.id; // only superadmin can change their own password

  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
      {canEdit && (
        <button className="pill btn" onClick={() => onEdit(u)}>Edit</button>
      )}
      {(canEdit || canChangeOwnSuperPass) && (
        <button className="pill secondary" onClick={() => onPass(u)}>Change Password</button>
      )}
      {canDelete && (
        <button className="pill danger" onClick={() => onDelete(u)}>Delete</button>
      )}
      {isSuper && !canChangeOwnSuperPass && (
        <span className="muted" style={{ fontSize: 12, alignSelf: 'center' }}>
          (superadmin protected)
        </span>
      )}
    </div>
  );
}

export default function Users() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [me, setMe] = useState(null);
  const [items, setItems] = useState([]);

  // Add modal
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', email: '', role: 'user', password: '' });
  const [addSaving, setAddSaving] = useState(false);

  // Edit modal
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ id: null, name: '', email: '', role: 'user' });
  const [editSaving, setEditSaving] = useState(false);

  // Password modal
  const [showPass, setShowPass] = useState(false);
  const [passForm, setPassForm] = useState({ id: null, password: '', confirm: '' });
  const [passSaving, setPassSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setErr('');
      const [meRes, listRes] = await Promise.all([
        apiFetch('/api/me'),
        apiFetch('/api/users'),
      ]);

      if (!meRes.ok) throw new Error(await meRes.text().catch(() => 'Failed to load me'));
      if (!listRes.ok) throw new Error(await listRes.text().catch(() => 'Failed to load users'));

      const meJson = await meRes.json();
      const listJson = await listRes.json();

      setMe(meJson || null);
      setItems(Array.isArray(listJson) ? listJson : (listJson.items || []));
    } catch (e) {
      setErr(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ----- Add user -----
  async function onAddSubmit(e) {
    e.preventDefault();
    if (!addForm.name || !addForm.password) {
      alert('Username and password are required.');
      return;
    }
    if (addForm.role === 'superadmin') {
      alert('Creating superadmin from UI is not allowed.');
      return;
    }
    setAddSaving(true);
    const payload = {
      name: String(addForm.name).trim(),
      email: String(addForm.email || '').trim() || null,
      role: addForm.role || 'user',
      password: addForm.password,
    };
    const res = await apiFetch('/api/users', { method: 'POST', body: JSON.stringify(payload) });
    setAddSaving(false);
    if (!res.ok) {
      const msg = await res.text().catch(() => 'Failed to create user');
      alert(msg);
      return;
    }
    setShowAdd(false);
    setAddForm({ name: '', email: '', role: 'user', password: '' });
    await load();
  }

  // ----- Edit user (name/email/role) -----
  function openEdit(u) {
    setEditForm({ id: u.id, name: u.name || '', email: u.email || '', role: u.role || 'user' });
    setShowEdit(true);
  }
  async function onEditSubmit(e) {
    e.preventDefault();
    if (!editForm.id) return;
    if (editForm.role === 'superadmin') {
      alert('Elevating to superadmin from UI is not allowed.');
      return;
    }
    setEditSaving(true);
    const payload = { name: editForm.name || '', email: editForm.email || null, role: editForm.role || 'user' };
    const res = await apiFetch(`/api/users/${editForm.id}`, { method: 'PUT', body: JSON.stringify(payload) });
    setEditSaving(false);
    if (!res.ok) {
      const msg = await res.text().catch(() => 'Failed to update user');
      alert(msg);
      return;
    }
    setShowEdit(false);
    await load();
  }

  // ----- Change password -----
  function openPass(u) {
    setPassForm({ id: u.id, password: '', confirm: '' });
    setShowPass(true);
  }
  async function onPassSubmit(e) {
    e.preventDefault();
    if (!passForm.id) return;
    if (!passForm.password) { alert('Password is required.'); return; }
    if (passForm.password !== passForm.confirm) { alert('Passwords do not match.'); return; }
    setPassSaving(true);
    const res = await apiFetch(`/api/users/${passForm.id}/password`, {
      method: 'PATCH',
      body: JSON.stringify({ password: passForm.password }),
    });
    setPassSaving(false);
    if (!res.ok) {
      const msg = await res.text().catch(() => 'Failed to change password');
      alert(msg);
      return;
    }
    setShowPass(false);
    await load();
  }

  // ----- Delete -----
  async function onDelete(u) {
    if (u.role === 'superadmin') {
      alert('The superadmin account is protected.');
      return;
    }
    if (!window.confirm(`Delete user "${u.name || u.email || u.id}"? This cannot be undone.`)) return;
    const res = await apiFetch(`/api/users/${u.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const msg = await res.text().catch(() => 'Failed to delete user');
      alert(msg);
      return;
    }
    await load();
  }

  const rows = useMemo(() => {
    return items.map(u => ({
      ...u,
      created_at_fmt: u.created_at ? new Date(u.created_at).toLocaleString() : '—',
      label: u.name || u.email || `#${u.id}`,
    }));
  }, [items]);

  if (loading) return <div className="page"><div className="muted">Loading users…</div></div>;
  if (err) return <div className="page"><div className="error">{err}</div></div>;

  return (
    <div className="page">
      <div className="toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Users</h2>
        <div>
          <button className="pill btn" onClick={() => setShowAdd(true)}>Add User</button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '10px 12px' }}>Username</th>
              <th style={{ textAlign: 'left', padding: '10px 12px' }}>Email</th>
              <th style={{ textAlign: 'left', padding: '10px 12px' }}>Role</th>
              <th style={{ textAlign: 'left', padding: '10px 12px' }}>Created</th>
              <th style={{ textAlign: 'right', padding: '10px 12px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(u => (
              <tr key={u.id}>
                <td style={{ padding: '8px 12px' }}>{u.name || '—'}</td>
                <td style={{ padding: '8px 12px' }}>{u.email || '—'}</td>
                <td style={{ padding: '8px 12px' }}>
                  <span className="pill border">{u.role || 'user'}</span>
                </td>
                <td style={{ padding: '8px 12px' }}>{u.created_at_fmt}</td>
                <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                  <RowActions
                    u={u}
                    me={me}
                    onEdit={openEdit}
                    onPass={openPass}
                    onDelete={onDelete}
                  />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="muted" colSpan={5} style={{ padding: 12 }}>No users yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {showAdd && (
        <div className="modal-backdrop" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="hd">Add User</div>
            <form onSubmit={onAddSubmit}>
              <div className="bd">
                <div className="row">
                  <input
                    placeholder="Username"
                    value={addForm.name}
                    onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                    required
                  />
                  <input
                    type="email"
                    placeholder="Email (optional)"
                    value={addForm.email}
                    onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div className="row">
                  <select
                    value={addForm.role}
                    onChange={e => setAddForm(f => ({ ...f, role: e.target.value }))}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    {/* No "superadmin" here by design */}
                  </select>
                  <input
                    type="password"
                    placeholder="Temporary password"
                    value={addForm.password}
                    onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="ft">
                <button type="button" className="pill btn" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="pill danger" disabled={addSaving}>
                  {addSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEdit && (
        <div className="modal-backdrop" onClick={() => setShowEdit(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="hd">Edit User</div>
            <form onSubmit={onEditSubmit}>
              <div className="bd">
                <div className="row">
                  <input
                    placeholder="Username"
                    value={editForm.name}
                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    required
                  />
                  <input
                    type="email"
                    placeholder="Email (optional)"
                    value={editForm.email}
                    onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div className="row">
                  <select
                    value={editForm.role}
                    onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
                    disabled={items.find(x => x.id === editForm.id)?.role === 'superadmin'}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    {/* No "superadmin" elevation via UI */}
                  </select>
                </div>
              </div>
              <div className="ft">
                <button type="button" className="pill btn" onClick={() => setShowEdit(false)}>Cancel</button>
                <button type="submit" className="pill danger" disabled={editSaving}>
                  {editSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPass && (
        <div className="modal-backdrop" onClick={() => setShowPass(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="hd">Change Password</div>
            <form onSubmit={onPassSubmit}>
              <div className="bd">
                <div className="row">
                  <input
                    type="password"
                    placeholder="New password"
                    value={passForm.password}
                    onChange={e => setPassForm(f => ({ ...f, password: e.target.value }))}
                    required
                  />
                  <input
                    type="password"
                    placeholder="Confirm password"
                    value={passForm.confirm}
                    onChange={e => setPassForm(f => ({ ...f, confirm: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="ft">
                <button type="button" className="pill btn" onClick={() => setShowPass(false)}>Cancel</button>
                <button type="submit" className="pill danger" disabled={passSaving}>
                  {passSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
