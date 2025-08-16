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
        if (!r.ok){
          const d = await r.json().catch(()=>({}));
          throw new Error(d.error || 'Failed to load');
        }
        const j = await r.json();
        if (alive) setData(j);
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

  const { client, totals, entries } = data;

  function onExportCSV(){
    const headers = ['Date','Type','Ref','Description','Invoice','Amount','Running Balance'];
    const rows = entries.map(e => ({
      'Date': e.date || '',
      'Type': e.type,
      'Ref': e.ref,
      'Description': e.description || '',
      'Invoice': e.invoice_id || '',
      'Amount': e.amount,
      'Running Balance': e.running
    }));
    exportCSV(`client-${client?.name || client?.id}-statement.csv`, headers, rows);
  }

  function onExportPDF(){
    const headers = ['Date','Type','Ref','Description','Invoice','Amount','Running Balance'];
    const rows = entries.map(e => ({
      'Date': e.date || '',
      'Type': e.type,
      'Ref': e.ref,
      'Description': e.description || '',
      'Invoice': e.invoice_id || '',
      'Amount': e.amount,
      'Running Balance': e.running
    }));
    exportPDF(`client-${client?.name || client?.id}-statement.pdf`, headers, rows, {
      title: `Client Statement — ${client?.name || client?.id}`,
      orientation: 'landscape',
      money: ['Amount','Running Balance']
    });
  }

  return (
    <div className="page">
      <h1>Client Statement — {client?.name || `#${client?.id}`}</h1>

      {/* metrics row – matches your screenshot's pill cards */}
      <div className="cards3">
        <div className="card metric">
          <div className="muted">Total Invoiced</div>
          <div className="kpi"><Money value={totals?.total_invoiced || 0} /></div>
        </div>
        <div className="card metric">
          <div className="muted">Total Paid</div>
          <div className="kpi"><Money value={totals?.total_paid || 0} /></div>
        </div>
        <div className="card metric">
          <div className="muted">Balance</div>
          <div className="kpi"><Money value={totals?.balance_base || 0} /></div>
        </div>
        <div className="card metric right-actions">
          <div style={{display:'flex', gap:8, justifyContent:'flex-end'}}>
            <button className="border" onClick={onExportCSV}>Export CSV</button>
            <button className="btn" onClick={onExportPDF}>Export PDF</button>
          </div>
        </div>
      </div>

      <div className="card" style={{marginTop:12}}>
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Ref</th>
              <th>Description</th>
              <th>Invoice</th>
              <th>Amount</th>
              <th>Running Balance</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, idx) => (
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

      <div style={{marginTop:12}}>
        <Link to="/clients" className="pill border">Back to Clients</Link>
      </div>
    </div>
  );
}
