import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import Money from '../components/Money';
import { exportCSV, exportPDF } from '../utils/export';

export default function Payments(){
  const [items, setItems] = useState([]);
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState('all');
  const [invoiceId, setInvoiceId] = useState('');
  const [method, setMethod] = useState('');
  const [loading, setLoading] = useState(true);

  async function load(){
    setLoading(true);
    const qs = new URLSearchParams();
    if (clientId !== 'all') qs.set('client_id', clientId);
    if (invoiceId) qs.set('invoice_id', invoiceId);
    if (method) qs.set('method', method);
    const [p, c] = await Promise.all([
      apiFetch('/api/payments?' + qs.toString()),
      apiFetch('/api/clients')
    ]);
    const prow = p.ok ? await p.json() : [];
    const crow = c.ok ? await c.json() : [];
    setItems(Array.isArray(prow) ? prow : (prow.items || []));
    setClients(Array.isArray(crow) ? crow : (crow.items || []));
    setLoading(false);
  }
  useEffect(()=>{ load(); /* eslint-disable-next-line */ }, []);

  function onExportCSV(){
    const headers = ['Date','Client','Amount','Percent','Invoice','Recorded By','Method','Note'];
    const rows = items.map(x => ({
      'Date': x.created_at || '',
      'Client': x.client_name || '',
      'Amount': x.amount || 0,
      'Percent': x.percent || '',
      'Invoice': x.invoice_id ? ('#' + x.invoice_id) : '',
      'Recorded By': x.recorded_by || '',
      'Method': x.method || '',
      'Note': x.note || ''
    }));
    exportCSV('payments.csv', headers, rows);
  }
  function onExportPDF(){
    const headers = ['Date','Client','Amount','Percent','Invoice','Recorded By','Method','Note'];
    const rows = items.map(x => ({
      'Date': x.created_at || '',
      'Client': x.client_name || '',
      'Amount': x.amount || 0,
      'Percent': x.percent || '',
      'Invoice': x.invoice_id ? ('#' + x.invoice_id) : '',
      'Recorded By': x.recorded_by || '',
      'Method': x.method || '',
      'Note': x.note || ''
    }));
    exportPDF('payments.pdf', headers, rows, { orientation:'landscape', money:['Amount'] });
  }

  return (
    <div className="page">
      <h1>Payments</h1>

      <div className="filters card">
        <div className="left" style={{gridTemplateColumns:'160px 160px 160px auto auto'}}>
          <select value={clientId} onChange={e=>setClientId(e.target.value)}>
            <option value="all">All clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input placeholder="Invoice ID" value={invoiceId} onChange={e=>setInvoiceId(e.target.value)} />
          <input placeholder="Method" value={method} onChange={e=>setMethod(e.target.value)} />
          <button className="pill btn" onClick={load}>Apply</button>
          <button className="pill secondary" onClick={()=>{ setClientId('all'); setInvoiceId(''); setMethod(''); setTimeout(load,0); }}>Reset</button>
        </div>
        <div className="right">
          <button className="pill export-csv" onClick={onExportCSV}>Export CSV</button>
          <button className="pill export-pdf" onClick={onExportPDF}>Export PDF</button>
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Client</th>
              <th>Amount</th>
              <th>Percent</th>
              <th>Invoice</th>
              <th>Recorded By</th>
              <th>Method</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {items.map(x => (
              <tr key={x.id}>
                <td>{x.created_at || '—'}</td>
                <td><Link to={`/clients/${x.client_id}`}>{x.client_name || '—'}</Link></td>
                <td><Money value={x.amount || 0} /></td>
                <td>{x.percent || '—'}</td>
                <td>{x.invoice_id ? <Link to={`/invoices/${x.invoice_id}`}>#{x.invoice_id}</Link> : '—'}</td>
                <td>{x.recorded_by || '—'}</td>
                <td>{x.method || '—'}</td>
                <td>{x.note || '—'}</td>
              </tr>
            ))}
            {items.length===0 && <tr><td colSpan={8} className="muted">No payments found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
