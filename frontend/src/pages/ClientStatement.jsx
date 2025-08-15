import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { downloadCSV, downloadPDF } from '../utils/export';
import { fmtMoney } from '../utils/format';
import { apiFetch } from '../utils/api';
import Money from '../components/Money';

export default function ClientStatement(){
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(()=>{
    let cancelled = false;
    async function load(){
      try{
        const res = await apiFetch(`/api/clients/${encodeURIComponent(id)}/statement`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load');
        if(!cancelled) setData(json);
      }catch(e){
        if(!cancelled) setError(e.message || 'Failed to load');
      }finally{
        if(!cancelled) setLoading(false);
      }
    }
    load();
    return ()=>{ cancelled = true; };
  }, [id]);

  if (loading) return <div className="card">Loading…</div>;
  if (error) return <div className="card" style={{color:'#b91c1c'}}>Error: {error}</div>;
  if (!data) return null;

  const rows = data.entries || [];

  function onExportCSV(){
    const headers = ['Date','Type','Ref','Description','Invoice','Amount','Running Balance'];
    const csvRows = rows.map(r => ({
      'Date': r.date ? new Date(r.date).toLocaleString() : '',
      'Type': r.type,
      'Ref': r.ref,
      'Description': r.description || '',
      'Invoice': r.invoice_id ? `#${r.invoice_id}` : '',
      'Amount': fmtMoney(r.amount, data.currency || 'GHS'),
      'Running Balance': fmtMoney(r.running, data.currency || 'GHS')
    }));
    downloadCSV(`statement_client_${data.client.id}.csv`, csvRows, headers);
  }

  function onExportPDF(){
    const headers = ['Date','Type','Ref','Description','Invoice','Amount','Running Balance'];
    const pdfRows = rows.map(r => ({
      'Date': r.date ? new Date(r.date).toLocaleString() : '',
      'Type': r.type,
      'Ref': r.ref,
      'Description': r.description || '',
      'Invoice': r.invoice_id ? `#${r.invoice_id}` : '',
      'Amount': r.amount,
      'Running Balance': r.running
    }));
    downloadPDF(`Client Statement — ${data.client.name}`, pdfRows, {
      orientation: 'landscape',
      money: ['Amount', 'Running Balance']
    });
  }

  return (
    <div>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12}}>
        <h1 style={{margin:0}}>Client Statement — {data.client.name}</h1>
        <div style={{display:'flex', gap:8}}>
          <button className="btn secondary" onClick={onExportCSV}>Export CSV</button>
          <button className="btn" onClick={onExportPDF}>Export PDF</button>
        </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:10, marginBottom:12}}>
        <div className="card">
          <div className="muted">Total Invoiced</div>
          <div style={{fontWeight:700}}><Money value={data.totals.invoiced} /></div>
        </div>
        <div className="card">
          <div className="muted">Total Paid</div>
          <div style={{fontWeight:700}}><Money value={data.totals.paid} /></div>
        </div>
        <div className="card">
          <div className="muted">Balance</div>
          <div style={{fontWeight:700}}><Money value={data.totals.balance} /></div>
        </div>
      </div>

      <div className="card table-wrap">
        <table>
          <thead><tr>
            <th style={{whiteSpace:'nowrap'}}>Date</th>
            <th>Type</th>
            <th>Ref</th>
            <th>Description</th>
            <th>Invoice</th>
            <th style={{textAlign:'right'}}>Amount</th>
            <th style={{textAlign:'right'}}>Running Balance</th>
          </tr></thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={idx}>
                <td style={{whiteSpace:'nowrap'}}>{r.date ? new Date(r.date).toLocaleString() : ''}</td>
                <td>{r.type}</td>
                <td>{r.ref}</td>
                <td>{r.description || ''}</td>
                <td>{r.invoice_id ? <Link to={`/invoices/${r.invoice_id}`}>#{r.invoice_id}</Link> : ''}</td>
                <td style={{textAlign:'right'}}><Money value={r.amount} /></td>
                <td style={{textAlign:'right'}}><Money value={r.running} /></td>
              </tr>
            ))}
            {rows.length===0 && <tr><td colSpan={7} className="muted">No transactions</td></tr>}
          </tbody>
        </table>
      </div>

      <div style={{marginTop:12}}>
        <Link to="/clients" className="btn secondary">Back to Clients</Link>
      </div>
    </div>
  );
}
