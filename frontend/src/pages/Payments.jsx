import React, { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';
import { formatAmount } from '../utils/format';
import { downloadCSV, downloadPDF } from '../utils/export';
import { Link } from 'react-router-dom';

export default function Payments(){
  const [rows, setRows] = useState([]);
  const [clients, setClients] = useState([]);
  const [filters, setFilters] = useState({ client:'all', invoice:'', q:'' });

  async function load(){
    const [pr, cr] = await Promise.all([apiFetch('/api/payments'), apiFetch('/api/clients')]);
    setRows(await pr.json());
    setClients(await cr.json());
  }
  useEffect(()=>{ load(); },[]);

  const filtered = rows.filter(r => {
    if (filters.client!=='all' && String(r.client_id)!==String(filters.client)) return false;
    if (filters.invoice && String(r.invoice_id)!==String(filters.invoice)) return false;
    if (filters.q && !(`${r.note||''}`.toLowerCase().includes(filters.q.toLowerCase()))) return false;
    return true;
  });

  function exportCsv(){
    downloadCSV(filtered.map(r => ({
      id:r.id, client:r.client_name, invoice:`#${r.invoice_id}`, amount:r.amount, recorded_by:r.recorded_by_name, method:r.method||'', note:r.note||'', created:r.created_at
    })), 'payments.csv');
  }
  function exportPdf(){
    downloadPDF({
      title:'Payments',
      columns:['Date','Client','Amount','Invoice','Recorded By','Method','Note'],
      rows: filtered.map(r => [r.created_at, r.client_name, formatAmount(r.amount, r.currency), `#${r.invoice_id}`, r.recorded_by_name || '—', r.method||'—', r.note||'—'])
    }, 'payments.pdf', { landscape:true });
  }

  return (
    <div>
      <h1>Payments</h1>
      <div className="toolbar">
        <div className="row left">
          <select className="pill" value={filters.client} onChange={e=>setFilters(f=>({...f,client:e.target.value}))}>
            <option value="all">All clients</option>
            {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input className="pill" placeholder="Invoice ID" value={filters.invoice} onChange={e=>setFilters(f=>({...f,invoice:e.target.value}))} />
          <input className="pill" placeholder="Search…" value={filters.q} onChange={e=>setFilters(f=>({...f,q:e.target.value}))} />
        </div>
        <div className="row right">
          <button className="btn gray" onClick={()=>setFilters({ client:'all', invoice:'', q:'' })}>Reset</button>
          <button className="btn secondary" onClick={exportCsv}>Export CSV</button>
          <button className="btn" onClick={exportPdf}>Export PDF</button>
        </div>
      </div>

      <div className="card">
        <table className="grid">
          <thead><tr>
            <th>Date</th><th>Client</th><th>Amount</th><th>Percent</th><th>Invoice</th><th>Recorded By</th><th>Method</th><th>Note</th>
          </tr></thead>
          <tbody>
            {filtered.length===0 && (<tr><td colSpan="8" className="muted">No payments found</td></tr>)}
            {filtered.map(r => (
              <tr key={r.id}>
                <td>{r.created_at}</td>
                <td><Link to={`/clients/${r.client_id}/statement`}>{r.client_name}</Link></td>
                <td>{formatAmount(r.amount, r.currency)}</td>
                <td>{r.percent ? r.percent+'%' : '—'}</td>
                <td><Link to={`/invoices/${r.invoice_id}`}>#{r.invoice_id}</Link></td>
                <td>{r.recorded_by_name || '—'}</td>
                <td>{r.method || '—'}</td>
                <td>{r.note || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
