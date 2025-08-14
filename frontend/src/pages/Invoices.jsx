import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { downloadCSV, downloadPDF } from '../utils/export';
import { apiFetch } from '../utils/api';

export default function Invoices(){
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({client_id:'', total:'', title:'', description:'', due_date:'', created_at:''});

  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState({
    status: params.get('status') || '',
    client_id: params.get('client_id') || '',
    overdue: params.get('overdue') === 'true',
    from: params.get('from') || '',
    to: params.get('to') || '',
    q: params.get('q') || ''
  });

  function applyFilters(newFilters = filters){
    const sp = new URLSearchParams();
    Object.entries(newFilters).forEach(([k,v])=>{
      if (k==='overdue') { if (v) sp.set('overdue','true'); }
      else if (v) sp.set(k, v);
    });
    setParams(sp, { replace:true });
  }

  async function load(){
    const qs = params.toString();
    const url = '/api/invoices' + (qs ? `?${qs}` : '');
    setInvoices(await (await fetch(url)).json());
    setClients(await (await fetch('/api/clients')).json());
  }
  useEffect(()=>{ load(); },[params]);

  async function add(){
    const body = {
      ...form,
      client_id: Number(form.client_id),
      total: Number(form.total)
    };
    if(!body.client_id || !(body.total>0)) return alert('Select client and amount > 0');
    if (body.created_at) {
      const d = new Date(body.created_at);
      if (!isNaN(d)) body.created_at = d.toISOString();
    } else {
      delete body.created_at;
    }
    const r = await apiFetch('/api/invoices', {method:'POST', body: JSON.stringify(body)});
    if(!r.ok) return alert('Failed to add invoice');
    setShow(false); setForm({client_id:'', total:'', title:'', description:'', due_date:'', created_at:''}); load();
  }

  async function markPaid(id){
    const r = await apiFetch(`/api/invoices/${id}/mark-paid`, {method:'POST'});
    if(!r.ok) return alert('Failed to mark as paid');
    load();
  }

  async function del(id){
    if(!confirm('Delete this invoice and its payments?')) return;
    const r = await apiFetch(`/api/invoices/${id}?force=true`, {method:'DELETE'});
    const data = await r.json();
    if(!r.ok) return alert(data?.error||'Failed to delete');
    load();
  }

  function exportInvoicesPDF(){
    const rows = invoices.map(inv => ({
      ID: inv.id,
      Client: inv.client?.name || inv.client_id,
      Title: inv.title || '',
      Total: Number(inv.total||0).toFixed(2),
      Paid: Number(inv.amount_paid||0).toFixed(2),
      Balance: Number(inv.balance||0).toFixed(2),
      Status: inv.status + (inv.overdue ? ' (Overdue)' : ''),
      'Due Date': inv.due_date || '',
      'Created': inv.created_at || ''
    }));
    downloadPDF('Invoices', rows);
  }

  return (
    <div>
      <h1 className="page-title">Invoices</h1>

      {/* Filters */}
      <div className="card" style={{marginBottom:12}}>
        <div style={{display:'grid', gridTemplateColumns:'repeat(6,minmax(0,1fr))', gap:8}}>
          <select value={filters.status} onChange={e=>setFilters({...filters, status:e.target.value})}>
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="part-paid">Part-paid</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
          <select value={filters.client_id} onChange={e=>setFilters({...filters, client_id:e.target.value})}>
            <option value="">All clients</option>
            {clients.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input type="date" value={filters.from} onChange={e=>setFilters({...filters, from:e.target.value})} />
          <input type="date" value={filters.to} onChange={e=>setFilters({...filters, to:e.target.value})} />
          <input placeholder="Search…" value={filters.q} onChange={e=>setFilters({...filters, q:e.target.value})} />
          <label style={{display:'flex', alignItems:'center', gap:6}}>
            <input type="checkbox" checked={filters.overdue} onChange={e=>setFilters({...filters, overdue:e.target.checked})} />
            Overdue
          </label>
        </div>
        <div style={{display:'flex', gap:8, marginTop:10, flexWrap:'wrap'}}>
          <button className="btn" onClick={()=>applyFilters()}>Apply</button>
          <button className="btn secondary" onClick={()=>{ setFilters({status:'',client_id:'',overdue:false,from:'',to:'',q:''}); applyFilters({}); }}>Reset</button>
        </div>
      </div>

      <div style={{display:'flex',gap:8, marginBottom:12, flexWrap:'wrap'}}>
        <button className="btn" onClick={()=>setShow(true)}>Add Invoice</button>
        <button className="btn secondary" onClick={()=>downloadCSV('invoices.csv', invoices)}>Export CSV</button>
        <button className="btn secondary" onClick={exportInvoicesPDF}>Export PDF</button>
      </div>

      <div className="card table-wrap">
        <table>
          <thead><tr><th>#</th><th>Client</th><th>Title</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th>Due</th><th>Created</th><th>Actions</th></tr></thead>
          <tbody>
            {invoices.map(inv=> (
              <tr key={inv.id}>
                <td>{inv.id}</td>
                <td>{inv.client?.name||inv.client_id}</td>
                <td>{inv.title||''}</td>
                <td>{Number(inv.total).toFixed(2)}</td>
                <td>{Number(inv.amount_paid||0).toFixed(2)}</td>
                <td>{Number(inv.balance||0).toFixed(2)}</td>
                <td><span className={`status ${inv.status==='part-paid'?'partial':inv.status}`}>{inv.status}{inv.overdue?' • Overdue':''}</span></td>
                <td>{inv.due_date||''}</td>
                <td>{inv.created_at||''}</td>
                <td style={{display:'flex', gap:8, flexWrap:'wrap'}}>
                  <Link to={`/invoices/${inv.id}`}>View</Link>
                  {inv.status!=='paid' && <button className="btn secondary" onClick={()=>markPaid(inv.id)}>Mark paid</button>}
                  <button className="btn danger" onClick={()=>del(inv.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {invoices.length===0 && <tr><td colSpan={10} className="muted">No invoices found</td></tr>}
          </tbody>
        </table>
      </div>

      {show && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center'}}>
          <div className="card" style={{width:'100%', maxWidth:520}}>
            <h3 style={{marginTop:0}}>Add invoice</h3>
            <div style={{display:'grid', gap:12}}>
              <select value={form.client_id} onChange={e=>setForm({...form, client_id:e.target.value})}>
                <option value="">Select client</option>
                {clients.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input placeholder="Title (optional)" value={form.title} onChange={e=>setForm({...form, title:e.target.value})} />
              <textarea placeholder="Description (optional)" value={form.description} onChange={e=>setForm({...form, description:e.target.value})} />
              <input type="number" step="0.01" placeholder="Total amount" value={form.total} onChange={e=>setForm({...form, total:e.target.value})} />
              <input type="date" value={form.due_date} onChange={e=>setForm({...form, due_date:e.target.value})} />
              <input type="datetime-local" value={form.created_at} onChange={e=>setForm({...form, created_at:e.target.value})} />
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
