import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Money from '../components/Money';
import { apiFetch } from '../utils/api';
import { exportCSV, exportPDF, formatMoney } from '../utils/export';

const isCleanInt = (v) => /^\d+$/.test(String(v||'').trim());

export default function Payments(){
  const [payments, setPayments] = useState([]);
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState({
    client_id: params.get('client_id') || '',
    invoice_id: params.get('invoice_id') || '',
    from: params.get('from') || '',
    to: params.get('to') || '',
    q: params.get('q') || ''
  });
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({invoice_id:'', amount:'', percent:'', method:'', note:'', created_at:''});

  function applyFilters(newFilters = filters){
    const sp = new URLSearchParams();
    Object.entries(newFilters).forEach(([k,v])=>{ if (v) sp.set(k, v); });
    setParams(sp, { replace:true });
  }

  async function load(){
    const qs = params.toString();
    try{
      const pRes = await apiFetch('/api/payments' + (qs ? `?${qs}` : ''));
      if (pRes.status === 401) return (window.location.href = '/login');
      const p = await pRes.json();

      const iRes = await apiFetch('/api/invoices');
      const inv = await iRes.json();

      const cRes = await apiFetch('/api/clients');
      const cli = await cRes.json();

      setPayments(p);
      setInvoices(inv);
      setClients(cli);
    }catch(err){
      console.error('Failed to load payments', err);
      setPayments([]);
    }
  }
  useEffect(()=>{ load(); },[params]);

  async function add(){
    const body = { ...form, invoice_id: Number(form.invoice_id), amount: Number(form.amount)||0, percent: Number(form.percent)||undefined };
    if(!body.invoice_id || (!body.amount && !body.percent)) return alert('Select invoice and amount or percent');
    if (body.created_at) {
      const d = new Date(body.created_at);
      if (!isNaN(d)) body.created_at = d.toISOString();
    } else { delete body.created_at; }
    const r = await apiFetch('/api/payments', {method:'POST', body: JSON.stringify(body)});
    if(!r.ok) return alert('Failed to add payment');
    setShow(false);
    setForm({invoice_id:'', amount:'', percent:'', method:'', note:'', created_at:''});
    load();
  }

  async function del(id){
    if(!confirm('Delete this payment?')) return;
    const r = await apiFetch(`/api/payments/${id}`, {method:'DELETE'});
    const d = await r.json().catch(()=>({}));
    if(!r.ok) return alert(d.error||'Failed to delete');
    load();
  }

  function exportPaymentsCSV(){
    const headers = ['ID','Invoice','Client','Amount','Method','Note','Created','Recorded By'];
    const rows = payments.map(p => ({
      'ID': p.id,
      'Invoice': p.invoice_id,
      'Client': p.client?.name || '',
      'Amount': formatMoney(p.amount),
      'Method': p.method || '',
      'Note': p.note || '',
      'Created': p.created_at || '',
      'Recorded By': p.recorded_by_user?.name || p.recorded_by_user?.email || ''
    }));
    exportCSV('payments.csv', headers, rows);
  }

  function exportPaymentsPDF(){
    const headers = ['ID','Invoice','Client','Amount','Method','Note','Created','Recorded By'];
    const rows = payments.map(p => ({
      'ID': p.id,
      'Invoice': p.invoice_id,
      'Client': p.client?.name || '',
      'Amount': p.amount,
      'Method': p.method || '',
      'Note': p.note || '',
      'Created': p.created_at || '',
      'Recorded By': p.recorded_by_user?.name || p.recorded_by_user?.email || ''
    }));
    exportPDF('payments.pdf', headers, rows, { title:'Payments', money:['Amount'], orientation:'landscape' });
  }

  return (
    <div className="page">
      <h1>Payments</h1>

      {/* Filters */}
      <div className="filters">
        <select value={filters.client_id} onChange={e=>setFilters({...filters, client_id:e.target.value})}>
          <option value="">All clients</option>
          {clients.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filters.invoice_id} onChange={e=>setFilters({...filters, invoice_id:e.target.value})}>
          <option value="">All invoices</option>
          {invoices.map(i=> <option key={i.id} value={i.id}>#{i.id} — {i.title||''}</option>)}
        </select>
        <input type="date" value={filters.from} onChange={e=>setFilters({...filters, from:e.target.value})} />
        <input type="date" value={filters.to} onChange={e=>setFilters({...filters, to:e.target.value})} />
        <input placeholder="Search note/method" value={filters.q} onChange={e=>setFilters({...filters, q:e.target.value})} />
        <button className="border" onClick={()=>applyFilters()}>Apply</button>
        <button className="border" onClick={()=>{ setFilters({client_id:'',invoice_id:'',from:'',to:'',q:''}); applyFilters({}); }}>Reset</button>

        {/* Exports */}
        <button className="border" onClick={exportPaymentsCSV}>Export CSV</button>
        <button className="btn" onClick={exportPaymentsPDF}>Export PDF</button>

        <button className="btn" style={{marginLeft:'auto'}} onClick={()=>setShow(true)}>Record Payment</button>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Invoice</th>
            <th>Client</th>
            <th>Amount</th>
            <th>Method</th>
            <th>Note</th>
            <th>Created</th>
            <th>Recorded By</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {payments.map(p => {
            const invId = p.invoice_id;
            const clientName = p.client?.name || '';
            return (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td><Link to={`/invoices/${invId}`}>#{invId}</Link></td>
                <td>{clientName}</td>
                <td><Money value={p.amount} /></td>
                <td>{p.method||''}</td>
                <td>{p.note||''}</td>
                <td>{p.created_at||''}</td>
                <td>{p.recorded_by_user?.name || p.recorded_by_user?.email || '—'}</td>
                <td>
                  <button className="danger" onClick={()=>del(p.id)}>Delete</button>
                </td>
              </tr>
            );
          })}
          {payments.length===0 && (
            <tr><td colSpan={9} className="muted">No payments found</td></tr>
          )}
        </tbody>
      </table>

      {show && (
        <div className="modal">
          <div className="card" style={{maxWidth:540}}>
            <h3 style={{marginTop:0}}>Record payment</h3>
            <div className="form-grid">
              <select value={form.invoice_id} onChange={e=>setForm({...form, invoice_id:e.target.value})}>
                <option value="">Select invoice</option>
                {invoices.map(i=> <option key={i.id} value={i.id}>#{i.id} — {i.title||''}</option>)}
              </select>
              <input type="number" step="0.01" placeholder="Amount (or use %)" value={form.amount} onChange={e=>setForm({...form, amount:e.target.value})} />
              <input type="number" step="0.01" placeholder="% of invoice" value={form.percent} onChange={e=>setForm({...form, percent:e.target.value})} />
              <input placeholder="Method" value={form.method} onChange={e=>setForm({...form, method:e.target.value})} />
              <input placeholder="Note" value={form.note} onChange={e=>setForm({...form, note:e.target.value})} />
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
  );
}
