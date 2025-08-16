import React, { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';
import { formatAmount } from '../utils/format';
import { downloadCSV, downloadPDF } from '../utils/export';
import { Link } from 'react-router-dom';

export default function Invoices(){
  const [rows, setRows] = useState([]);
  const [clients, setClients] = useState([]);
  const [statuses] = useState(['all', 'pending', 'part-paid', 'paid', 'overdue']);
  const [filters, setFilters] = useState({ status:'all', client:'all', q:'', onlyOverdue:false, created:'' });
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ client_id:'', title:'', description:'', total:'', due_date:'', created_at:'' });

  async function load(){
    const rs = await Promise.all([ apiFetch('/api/invoices'), apiFetch('/api/clients') ]);
    const invs = await rs[0].json();
    const cls  = await rs[1].json();
    setRows(invs);
    setClients(cls);
  }
  useEffect(()=>{ load(); },[]);

  const filtered = rows.filter(r => {
    if (filters.status!=='all' && r.status!==filters.status) return false;
    if (filters.client!=='all' && String(r.client_id)!==String(filters.client)) return false;
    if (filters.onlyOverdue && r.status!=='overdue') return false;
    if (filters.q && !(`${r.title||''} ${r.description||''} ${r.client_name||''}`.toLowerCase().includes(filters.q.toLowerCase()))) return false;
    return true;
  });

  function paidOf(inv){
    const balance = inv.balance ?? 0;
    const total = inv.total ?? 0;
    const paid = total - balance;
    return paid < 0 ? 0 : paid;
  }

  function exportCsv(){
    const data = filtered.map(r => ({
      id: r.id,
      client: r.client_name,
      title: r.title || '',
      total: r.total,
      paid: paidOf(r),
      balance: r.balance,
      status: r.status,
      created: r.created_at
    }));
    downloadCSV(data, 'invoices.csv');
  }
  function exportPdf(){
    downloadPDF({
      title: 'Invoices',
      columns: ['#','Client','Title','Total','Paid','Balance','Status','Due','Created','Recorded By'],
      rows: filtered.map((r,i) => [
        i+1, r.client_name, r.title || '', formatAmount(r.total, r.currency),
        formatAmount(paidOf(r), r.currency), formatAmount(r.balance, r.currency),
        r.status, r.due_date || '—', r.created_at || '—', r.created_by_name || '—'
      ])
    }, 'invoices.pdf', { landscape:true });
  }

  async function createInvoice(e){
    e.preventDefault();
    const body = { ...form, total: Number(form.total), client_id: Number(form.client_id) };
    const res = await apiFetch('/api/invoices', { method:'POST', body: JSON.stringify(body) });
    if(res.ok){ setShowAdd(false); setForm({ client_id:'', title:'', description:'', total:'', due_date:'', created_at:'' }); load(); }
    else alert('Failed');
  }

  return (
    <div>
      <h1>Invoices</h1>

      {/* Filter bar */}
      <div className="toolbar">
        <div className="row left">
          <select className="pill" value={filters.status} onChange={e=>setFilters(f=>({...f,status:e.target.value}))}>
            <option value="all">All statuses</option>
            {statuses.slice(1).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="pill" value={filters.client} onChange={e=>setFilters(f=>({...f,client:e.target.value}))}>
            <option value="all">All clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input className="pill" placeholder="Search…" value={filters.q} onChange={e=>setFilters(f=>({...f,q:e.target.value}))} />
          <label className="checkbox pill">
            <input type="checkbox" checked={filters.onlyOverdue} onChange={e=>setFilters(f=>({...f,onlyOverdue:e.target.checked}))} />
            <span>Overdue</span>
          </label>
          <input className="pill" type="date" value={filters.created} onChange={e=>setFilters(f=>({...f,created:e.target.value}))} />
        </div>
        <div className="row right">
          <button className="btn gray" onClick={()=>setFilters({ status:'all', client:'all', q:'', onlyOverdue:false, created:'' })}>Reset</button>
          <button className="btn secondary" onClick={exportCsv}>Export CSV</button>
          <button className="btn" onClick={exportPdf}>Export PDF</button>
        </div>
      </div>

      {/* Secondary actions bar */}
      <div className="toolbar under">
        <button className="btn" onClick={()=>setShowAdd(true)}>Add Invoice</button>
      </div>

      {/* Table */}
      <div className="card">
        <table className="grid">
          <thead><tr>
            <th>#</th><th>Client</th><th>Title</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th>Due</th><th>Created</th><th>Recorded By</th><th>Actions</th>
          </tr></thead>
          <tbody>
            {filtered.length===0 && (<tr><td colSpan="11" className="muted">No invoices found</td></tr>)}
            {filtered.map((r,i)=>(
              <tr key={r.id}>
                <td>{i+1}</td>
                <td><Link to={`/clients/${r.client_id}/statement`}>{r.client_name}</Link></td>
                <td>{r.title || '—'}</td>
                <td>{formatAmount(r.total, r.currency)}</td>
                <td>{formatAmount(paidOf(r), r.currency)}</td>
                <td>{formatAmount(r.balance, r.currency)}</td>
                <td><span className={`badge ${r.status}`}>{r.status}</span></td>
                <td>{r.due_date || '—'}</td>
                <td>{r.created_at || '—'}</td>
                <td>{r.recorded_by_name || '—'}</td>
                <td><Link to={`/invoices/${r.id}`}>View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="modal">
          <form className="panel" onSubmit={createInvoice}>
            <h3>Add invoice</h3>
            <select className="pill" required value={form.client_id} onChange={e=>setForm(f=>({...f,client_id:e.target.value}))}>
              <option value="">Select client</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input className="pill" placeholder="Title (optional)" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/>
            <textarea className="pill" placeholder="Description (optional)" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/>
            <input className="pill" placeholder="Total amount" inputMode="decimal" value={form.total} onChange={e=>setForm(f=>({...f,total:e.target.value}))}/>
            <input className="pill" type="date" value={form.due_date} onChange={e=>setForm(f=>({...f,due_date:e.target.value}))} />
            <div className="row right" style={{gap:8}}>
              <button type="button" className="btn gray" onClick={()=>setShowAdd(false)}>Cancel</button>
              <button className="btn" type="submit">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
