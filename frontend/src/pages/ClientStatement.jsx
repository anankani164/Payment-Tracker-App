// frontend/src/pages/ClientStatement.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiFetch } from '../utils/api';

import { exportCSV, exportPDF } from '../utils/export';


function fmtNumber(n){
  const v = Number(n || 0);
  if (!isFinite(v)) return '0';
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ClientStatement(){
  const { id, clientId } = useParams();
  const theId = id || clientId;
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [client, setClient] = useState(null);
  const [entries, setEntries] = useState([]);
  const [totals, setTotals] = useState({ invoiced_base: 0, paid_base: 0, balance_base: 0 });
  const [baseCurrency, setBaseCurrency] = useState('GHS');

  useEffect(() => {
    let alive = true;
    async function load(){
      try{
        setLoading(true);
        setErr('');
        const res = await apiFetch(`/api/clients/${theId}/statement`);
        if (!res.ok){
          const txt = await res.text().catch(()=>'Failed');
          throw new Error(txt || `HTTP ${res.status}`);
        }
        const data = await res.json();
        if (!alive) return;
        setClient(data.client || null);
        setEntries(Array.isArray(data.entries) ? data.entries : []);
        setTotals(data.totals || { invoiced_base: 0, paid_base: 0, balance_base: 0 });
        setBaseCurrency(data.base_currency || 'GHS');
      }catch(e){
        if (!alive) return;
        setErr(e.message || 'Failed to load statement');
      }finally{
        if (alive) setLoading(false);
      }
    }
    if (theId) load();
    return () => { alive = false; };
  }, [theId]);

  const running = useMemo(() => {
    // derive a running balance in invoice currency terms if backend didn't include one
    let r = 0;
    return entries.map(e => {
      const amount = Number(e.amount || 0);
      r += amount;
      return { ...e, _running: r };
    });
  }, [entries]);

  function onExportClientPDF() {
  // Export exactly what the table shows: Date, Type, Description, Amount, Running, Invoice
  const headers = ['Date','Type','Description','Amount','Running','Invoice'];

  const rows = (running || []).map(e => ({
    'Date': e.date ? new Date(e.date).toLocaleDateString() : '',
    'Type': e.type || '',
    'Description': e.description || '',
    'Amount': Number(e.amount || 0),
    'Running': Number(e._running || 0),
    'Invoice': e.invoice_id ? `#${e.invoice_id}` : ''
  }));

  const filename = `client-${(client?.name || theId || 'statement')}.pdf`;

  // Uses your existing export helper and formats money columns
  exportPDF(filename, headers, rows, {
    orientation: 'landscape',
    money: ['Amount','Running']
  });
}


  if (!theId) return <div className="page"><div className="muted">No client selected.</div></div>;
  if (loading) return <div className="page"><div className="muted">Loading statement…</div></div>;
  if (err) return <div className="page"><div className="error">{err}</div></div>;
  if (!client) return <div className="page"><div className="muted">Client not found.</div></div>;

  return (
    <div className="page">
      <div className="toolbar" style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div>
          <h2 style={{margin:'0 0 4px'}}>{client.name}</h2>
          <div className="muted" style={{fontSize:13}}>{client.email}{client.phone ? ` • ${client.phone}` : ''}</div>
        </div>
        <div>
          <Link to={`/clients`} className="btn">Back to Clients</Link>
          <button className="pill export-pdf" onClick={onExportClientPDF}>Export PDF</button>

        </div>
      </div>

      <div className="card" style={{padding:16, marginBottom:16}}>
        <div style={{display:'flex', gap:24, flexWrap:'wrap'}}>
          <div><div className="muted" style={{fontSize:12}}>Invoiced ({baseCurrency})</div><div style={{fontWeight:600}}>{fmtNumber(totals.invoiced_base)}</div></div>
          <div><div className="muted" style={{fontSize:12}}>Paid ({baseCurrency})</div><div style={{fontWeight:600}}>{fmtNumber(totals.paid_base)}</div></div>
          <div><div className="muted" style={{fontSize:12}}>Balance ({baseCurrency})</div><div style={{fontWeight:600}}>{fmtNumber(totals.balance_base)}</div></div>
        </div>
      </div>

      <div className="card" style={{padding:0, overflow:'hidden'}}>
        <table className="table" style={{width:'100%', borderCollapse:'collapse'}}>
          <thead>
            <tr>
              <th style={{textAlign:'left', padding:'10px 12px'}}>Date</th>
              <th style={{textAlign:'left', padding:'10px 12px'}}>Type</th>
              <th style={{textAlign:'left', padding:'10px 12px'}}>Description</th>
              <th style={{textAlign:'right', padding:'10px 12px'}}>Amount</th>
              <th style={{textAlign:'right', padding:'10px 12px'}}>Running</th>
              <th style={{textAlign:'left', padding:'10px 12px'}}>Invoice</th>
            </tr>
          </thead>
          <tbody>
            {running.map((e, idx) => (
              <tr key={idx}>
                <td style={{padding:'8px 12px'}}>{e.date ? new Date(e.date).toLocaleDateString() : ''}</td>
                <td style={{padding:'8px 12px'}}>{e.type}</td>
                <td style={{padding:'8px 12px'}}>{e.description || ''}</td>
                <td style={{padding:'8px 12px', textAlign:'right'}}>{fmtNumber(e.amount)}</td>
                <td style={{padding:'8px 12px', textAlign:'right'}}>{fmtNumber(e._running)}</td>
                <td style={{padding:'8px 12px'}}>
                  {e.invoice_id ? <Link to={`/invoices/${e.invoice_id}`}>#{e.invoice_id}</Link> : '-'}
                </td>
              </tr>
            ))}
            {running.length === 0 && (
              <tr><td colSpan={6} className="muted" style={{padding:'12px'}}>No activity yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
