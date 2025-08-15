import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { downloadCSV, downloadPDF } from '../utils/export';
import { fmtMoney } from '../utils/format';
import Money from '../components/Money';

const isCleanInt = (v) => /^\d+$/.test(String(v||'').trim());

export default function Payments(){
  const [payments, setPayments] = useState([]);
  const [clients, setClients] = useState([]);
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState({
    client_id: params.get('client_id') || '',
    invoice_id: params.get('invoice_id') || '',
    from: params.get('from') || '',
    to: params.get('to') || ''
  });

  function applyFilters(newFilters = filters){
    const sp = new URLSearchParams();
    Object.entries(newFilters).forEach(([k,v])=>{ if(v) sp.set(k, v); });
    setParams(sp, { replace:true });
  }

  async function load(){
    const qs = params.toString();
    const url = '/api/payments' + (qs ? `?${qs}` : '');
    setPayments(await (await fetch(url)).json());
    setClients(await (await fetch('/api/clients')).json());
  }
  useEffect(()=>{ load(); },[params]);

  function exportPaymentsPDF(){
    const rows = payments.map(p => ({
      Date: new Date(p.created_at).toLocaleString(),
      Client: p.client?.name || p.client_id,
      Amount: fmtMoney(p.amount, 'GHS'),
      Percent: p.percent ?? '',
      Invoice: p.invoice_id ? `#${p.invoice_id}` : '',
      Method: p.method ?? '',
      Note: p.note ?? ''
    }));
    downloadPDF('Payments', rows);
  }

  return (
    <div>
      <h1>Payments</h1>

      <div className="card" style={{marginBottom:12}}>
        <div style={{display:'grid', gridTemplateColumns:'repeat(5,minmax(0,1fr))', gap:8}}>
          <select value={filters.client_id} onChange={e=>setFilters({...filters, client_id:e.target.value})}>
            <option value="">All clients</option>
            {clients.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input placeholder="Invoice ID" value={filters.invoice_id} onChange={e=>setFilters({...filters, invoice_id:e.target.value})} />
          <input type="date" value={filters.from} onChange={e=>setFilters({...filters, from:e.target.value})} />
          <input type="date" value={filters.to} onChange={e=>setFilters({...filters, to:e.target.value})} />
          <div style={{display:'flex', gap:8}}>
            <button className="btn" onClick={()=>applyFilters()}>Apply</button>
            <button className="btn secondary" onClick={()=>{ setFilters({client_id:'',invoice_id:'',from:'',to:''}); applyFilters({}); }}>Reset</button>
          </div>
        </div>

        {/* Export buttons */}
        <div style={{display:'flex', gap:8, marginTop:10, justifyContent:'flex-end'}}>
          <button className="btn" onClick={()=>downloadCSV('payments.csv', payments)}>Export CSV</button>
          <button className="btn" onClick={exportPaymentsPDF}>Export PDF</button>
        </div>
      </div>

      <div className="card table-wrap">
        <table>
          <thead><tr>
            <th>Date</th><th>Client</th><th>Amount</th><th>Percent</th><th>Invoice</th><th>Method</th><th>Note</th>
          </tr></thead>
          <tbody>
            {payments.map(p=> {
              const cidRaw = p.client_id ?? p.client?.id ?? null;
              const cidStr = cidRaw != null ? String(cidRaw).trim() : null;
              const canLink = cidStr && isCleanInt(cidStr);
              const label = p.client?.name || (canLink ? `#${cidStr}` : '');
              return (
              <tr key={p.id}>
                <td>{new Date(p.created_at).toLocaleString()}</td>
                <td>{canLink ? <Link to={`/clients/${encodeURIComponent(cidStr)}/statement`}>{label}</Link> : label}</td>
                <td><Money value={p.amount} /></td>
                <td>{p.percent ?? ''}</td>
                <td>{p.invoice_id ? <Link to={`/invoices/${p.invoice_id}`}>#{p.invoice_id}</Link> : ''}</td>
                <td>{p.method ?? ''}</td>
                <td>{p.note ?? ''}</td>
              </tr>
            )})}
            {payments.length===0 && <tr><td colSpan={7} className="muted">No payments found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
