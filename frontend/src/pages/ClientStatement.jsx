import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import { exportCSV, exportPDF } from '../utils/export';
import Money from '../components/Money';

export default function ClientStatement(){
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(()=>{
    let alive = true;
    (async () => {
      try{
        const r = await apiFetch(`/api/clients/${id}/statement`);
        if (!r.ok) {
          const d = await r.json().catch(()=>({}));
          throw new Error(d.error || 'Failed to load');
        }
        const json = await r.json();
        if (alive) setData(json);
      }catch(e){
        if (alive) setError(e.message || 'Error');
      }finally{
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  if (loading) return <div className="page"><div className="muted">Loading…</div></div>;
  if (error) return <div className="page"><div className="error">{error}</div></div>;
  if (!data) return <div className="page"><div className="muted">No data</div></div>;

  const { client, entries } = data;

  function doExportCSV(){
    const headers = ['Date','Type','Ref','Description','Invoice','Amount','Running'];
    const rows = entries.map(e => ({
      'Date': e.date || '',
      'Type': e.type,
      'Ref': e.ref,
      'Description': e.description || '',
      'Invoice': e.invoice_id || '',
      'Amount': e.amount,
      'Running': e.running
    }));
    exportCSV(`client-${client?.id || 'statement'}.csv`, headers, rows);
  }
  function doExportPDF(){
    const headers = ['Date','Type','Ref','Description','Invoice','Amount','Running'];
    const rows = entries.map(e => ({
      'Date': e.date || '',
      'Type': e.type,
      'Ref': e.ref,
      'Description': e.description || '',
      'Invoice': e.invoice_id || '',
      'Amount': e.amount,
      'Running': e.running
    }));
    exportPDF(`client-${client?.id || 'statement'}.pdf`, headers, rows, { title: `Client ${client?.name || client?.id} Statement`, money:['Amount','Running'], orientation:'landscape' });
  }

  return (
    <div className="page">
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
        <h1 style={{margin:0}}>Client • {client?.name || `#${client?.id}`}</h1>
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <Link to="/clients" className="border">Back to clients</Link>
          <button className="border" onClick={doExportCSV}>Export CSV</button>
          <button className="btn" onClick={doExportPDF}>Export PDF</button>
        </div>
      </div>

      <div className="card" style={{marginTop:12}}>
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12}}>
          <div><div className="muted">Email</div><div>{client?.email || '—'}</div></div>
          <div><div className="muted">Phone</div><div>{client?.phone || '—'}</div></div>
        </div>
      </div>

      <table className="table" style={{marginTop:16}}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Ref</th>
            <th>Description</th>
            <th>Invoice</th>
            <th>Amount</th>
            <th>Running</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, idx)=> (
            <tr key={idx}>
              <td>{e.date || ''}</td>
              <td>{e.type}</td>
              <td>{e.ref}</td>
              <td>{e.description || ''}</td>
              <td>{e.invoice_id ? <Link to={`/invoices/${e.invoice_id}`}>#{e.invoice_id}</Link> : '—'}</td>
              <td><Money value={e.amount} /></td>
              <td><Money value={e.running} /></td>
            </tr>
          ))}
          {entries.length===0 && <tr><td colSpan={7} className="muted">No entries</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
