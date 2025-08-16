import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import Money from '../components/Money';
import { exportCSV, exportPDF } from '../utils/export';

export default function Invoices(){
  const [items, setItems] = useState([]);
  const [clients, setClients] = useState([]);
  const [status, setStatus] = useState('all');
  const [clientId, setClientId] = useState('all');
  const [search, setSearch] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load(){
    setLoading(true);
    const qs = new URLSearchParams();
    if (status !== 'all') qs.set('status', status);
    if (clientId !== 'all') qs.set('client_id', clientId);
    if (overdueOnly) qs.set('overdue', 'true');
    if (search) qs.set('q', search);
    const [invRes, clRes] = await Promise.all([
      apiFetch('/api/invoices?' + qs.toString()),
      apiFetch('/api/clients')
    ]);
    const inv = invRes.ok ? await invRes.json() : [];
    const cls = clRes.ok ? await clRes.json() : [];
    setItems(Array.isArray(inv) ? inv : (inv.items || []));
    setClients(Array.isArray(cls) ? cls : (cls.items || []));
    setLoading(false);
  }
  useEffect(()=>{ load(); /* eslint-disable-next-line */ }, []);

  function onApply(){ load(); }
  function onReset(){
    setStatus('all'); setClientId('all'); setSearch(''); setOverdueOnly(false);
    setTimeout(load, 0);
  }

  function onExportCSV(){
    const headers = ['#','Client','Title','Total','Paid','Balance','Status','Due','Created','Recorded By'];
    const rows = items.map((it, i) => ({
      '#': it.id,
      'Client': it.client_name || it.client_id,
      'Title': it.title || '',
      'Total': it.total || 0,
      'Paid': Math.max(0, (it.total || 0) - (it.balance || 0)),
      'Balance': it.balance || 0,
      'Status': it.status || '',
      'Due': it.due_date || '',
      'Created': it.created_at || '',
      'Recorded By': it.recorded_by || ''
    }));
    exportCSV('invoices.csv', headers, rows);
  }
  function onExportPDF(){
    const headers = ['#','Client','Title','Total','Paid','Balance','Status','Due','Created','Recorded By'];
    const rows = items.map((it, i) => ({
      '#': it.id,
      'Client': it.client_name || it.client_id,
      'Title': it.title || '',
      'Total': it.total || 0,
      'Paid': Math.max(0, (it.total || 0) - (it.balance || 0)),
      'Balance': it.balance || 0,
      'Status': it.status || '',
      'Due': it.due_date || '',
      'Created': it.created_at || '',
      'Recorded By': it.recorded_by || ''
    }));
    exportPDF('invoices.pdf', headers, rows, { orientation:'landscape', money:['Total','Paid','Balance'] });
  }

  return (
    <div className="page">
      <h1>Invoices</h1>

      {/* Filters laid out to match screenshots */}
      <div className="filters card" style={{marginBottom:14}}>
        <div className="left">
          <select value={status} onChange={e=>setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="part-paid">Part paid</option>
            <option value="paid">Paid</option>
          </select>
          <select value={clientId} onChange={e=>setClientId(e.target.value)}>
            <option value="all">All clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)} />
          <label style={{display:'inline-flex', alignItems:'center', gap:8}}>
            <input type="checkbox" checked={overdueOnly} onChange={e=>setOverdueOnly(e.target.checked)} />
            Overdue
          </label>
          <button className="pill btn" onClick={onApply}>Apply</button>
          <button className="pill secondary" onClick={onReset}>Reset</button>
        </div>
        <div className="right">
          <button className="pill border" onClick={onExportCSV}>Export CSV</button>
          <button className="pill btn" onClick={onExportPDF}>Export PDF</button>
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Client</th>
              <th>Title</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Status</th>
              <th>Due</th>
              <th>Created</th>
              <th>Recorded By</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(it => {
              const paid = Math.max(0, (it.total || 0) - (it.balance || 0)); // UI-only computed
              return (
                <tr key={it.id}>
                  <td>{it.id}</td>
                  <td><Link to={`/clients/${it.client_id}`}>{it.client_name || it.client_id}</Link></td>
                  <td>{it.title || '—'}</td>
                  <td><Money value={it.total || 0} /></td>
                  <td><Money value={paid} /></td>
                  <td><Money value={it.balance || 0} /></td>
                  <td><span className="pill border">{it.status || '—'}</span></td>
                  <td>{it.due_date || '—'}</td>
                  <td>{it.created_at || '—'}</td>
                  <td>{it.recorded_by || '—'}</td>
                  <td>
                    <div className="actions-inline">
                      <Link to={`/invoices/${it.id}`}>View</Link>
                    </div>
                  </td>
                </tr>
              );
            })}
            {items.length===0 && <tr><td colSpan={11} className="muted">No invoices found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
