// frontend/src/pages/InvoiceDetails.jsx
// Minimal change: robust fetch + response-shape compatibility.
// UI classes left generic (page/card/table/btn) to avoid style changes.

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiFetch } from '../utils/api';

function fmt2(n){
  const v = Number(n || 0);
  if (!isFinite(v)) return '0.00';
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function InvoiceDetails(){
  const { id, invoiceId } = useParams();
  const theId = id || invoiceId;

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [invoice, setInvoice] = useState(null);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    let alive = true;
    async function load(){
      try{
        setLoading(true);
        setErr('');
        const res = await apiFetch(`/api/invoices/${theId}`);
        if (!res.ok){
          const txt = await res.text().catch(()=>'Failed');
          throw new Error(txt || `HTTP ${res.status}`);
        }
        const data = await res.json();
        if (!alive) return;
        const inv = data.invoice ?? data; // accept {invoice:{...}} or flat
        const pays = data.payments ?? data.invoice?.payments ?? [];
        setInvoice(inv);
        setPayments(Array.isArray(pays) ? pays : []);
      }catch(e){
        if (!alive) return;
        setErr(e.message || 'Failed to load invoice');
      }finally{
        if (alive) setLoading(false);
      }
    }
    if (theId) load();
    return () => { alive = false; };
  }, [theId]);

  const totals = useMemo(() => {
    if (!invoice) return { total:0, paid:0, balance:0 };
    const total = Number(invoice.total||0);
    const paid  = Number(invoice.amount_paid ?? invoice.paid ?? 0);
    const balance = Number(invoice.balance ?? (total - paid));
    return { total, paid, balance };
  }, [invoice]);

  if (!theId) return <div className="page"><div className="muted">No invoice selected.</div></div>;
  if (loading) return <div className="page"><div className="muted">Loading invoice…</div></div>;
  if (err) return <div className="page"><div className="error">{err}</div></div>;
  if (!invoice) return <div className="page"><div className="muted">Invoice not found.</div></div>;

  const client = invoice.client || (invoice.client_id ? { id: invoice.client_id, name: invoice.clientName || invoice.client_name, email: invoice.client_email } : null);

  return (
    <div className="page">
      <div className="toolbar" style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
        <div>
          <h2 style={{margin:'0 0 4px'}}>Invoice #{invoice.id}</h2>
          <div className="muted" style={{fontSize:13}}>
            {client ? (<><Link to={`/clients`} state={{ highlight: client.id }}>{client.name}</Link>{client.email ? ` • ${client.email}` : ''}</>) : '—'}
          </div>
          <div className="muted" style={{fontSize:12, marginTop:4}}>
            Status: {invoice.status || 'pending'}{invoice.due_date ? ` • Due ${new Date(invoice.due_date).toLocaleDateString()}` : ''}
          </div>
        </div>
        <div style={{display:'flex', gap:8}}>
          <Link className="btn" to="/invoices">Back</Link>
        </div>
      </div>

      <div className="card" style={{padding:16, marginBottom:16}}>
        <div style={{display:'flex', gap:24, flexWrap:'wrap'}}>
          <div><div className="muted" style={{fontSize:12}}>Total</div><div style={{fontWeight:600}}>{fmt2(totals.total)} {invoice.currency_code || ''}</div></div>
          <div><div className="muted" style={{fontSize:12}}>Paid</div><div style={{fontWeight:600}}>{fmt2(totals.paid)} {invoice.currency_code || ''}</div></div>
          <div><div className="muted" style={{fontSize:12}}>Balance</div><div style={{fontWeight:600}}>{fmt2(totals.balance)} {invoice.currency_code || ''}</div></div>
          {invoice.recorded_by && (<div><div className="muted" style={{fontSize:12}}>Recorded by</div><div style={{fontWeight:600}}>{invoice.recorded_by}</div></div>)}
        </div>
        {invoice.description ? <div style={{marginTop:12}} className="muted">{invoice.description}</div> : null}
      </div>

      <div className="card" style={{padding:0, overflow:'hidden'}}>
        <table className="table" style={{width:'100%', borderCollapse:'collapse'}}>
          <thead>
            <tr>
              <th style={{textAlign:'left', padding:'10px 12px'}}>Date</th>
              <th style={{textAlign:'left', padding:'10px 12px'}}>Method</th>
              <th style={{textAlign:'left', padding:'10px 12px'}}>Note</th>
              <th style={{textAlign:'right', padding:'10px 12px'}}>Amount</th>
              <th style={{textAlign:'left', padding:'10px 12px'}}>Recorded by</th>
            </tr>
          </thead>
          <tbody>
            {payments.map(p => (
              <tr key={p.id}>
                <td style={{padding:'8px 12px'}}>{p.created_at ? new Date(p.created_at).toLocaleDateString() : ''}</td>
                <td style={{padding:'8px 12px'}}>{p.method || ''}</td>
                <td style={{padding:'8px 12px'}}>{p.note || ''}</td>
                <td style={{padding:'8px 12px', textAlign:'right'}}>{fmt2(p.amount)} {p.currency_code || invoice.currency_code || ''}</td>
                <td style={{padding:'8px 12px'}}>{p.recorded_by || p?.recorded_by_user?.name || ''}</td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr><td colSpan={5} className="muted" style={{padding:'12px'}}>No payments yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
