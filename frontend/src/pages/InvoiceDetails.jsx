import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiFetch } from '../utils/api';

export default function InvoiceDetails(){
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ amount:'', percent:'', method:'', note:'', created_at:'' });
  const [busy, setBusy] = useState(false);

  async function load(){
    try{
      setLoading(true);
      const r = await fetch(`/api/invoices/${id}`);
      const data = await r.json();
      setInvoice(data);
      setError('');
    }catch(e){
      setError('Failed to load invoice');
    }finally{
      setLoading(false);
    }
  }
  useEffect(()=>{ load(); }, [id]);

  async function addPayment(e){
    e.preventDefault();
    const amount = form.amount ? Number(form.amount) : null;
    const percent = form.percent ? Number(form.percent) : null;
    if ((!amount || amount<=0) && (!percent || percent<=0)) {
      return alert('Enter an amount or percent > 0');
    }
    setBusy(true);
    try{
      const body = { invoice_id: Number(id) };
      if (amount) body.amount = amount;
      if (percent) body.percent = percent;
      if (form.method) body.method = form.method;
      if (form.note) body.note = form.note;
      if (form.created_at) {
        const d = new Date(form.created_at);
        if (!isNaN(d)) body.created_at = d.toISOString();
      }
      const res = await apiFetch('/api/payments', { method:'POST', body: JSON.stringify(body) });
      if(!res.ok){
        const d = await res.json().catch(()=>({}));
        throw new Error(d?.error || 'Failed to add payment');
      }
      setForm({ amount:'', percent:'', method:'', note:'', created_at:'' });
      await load();
    }catch(err){
      alert(err.message || 'Unauthorized (please login)');
    }finally{
      setBusy(false);
    }
  }

  async function deletePayment(pid){
    if(!confirm('Delete this payment? This will update the invoice balance.')) return;
    try{
      setBusy(true);
      const res = await apiFetch(`/api/payments/${pid}`, { method:'DELETE' });
      if(!res.ok){
        const d = await res.json().catch(()=>({}));
        throw new Error(d?.error || 'Failed to delete');
      }
      await load();
    }catch(err){
      alert(err.message || 'Unauthorized (please login)');
    }finally{
      setBusy(false);
    }
  }

  if (loading) return <div className="card"><p>Loading…</p></div>;
  if (error) return <div className="card"><p style={{color:'crimson'}}>{error}</p></div>;
  if (!invoice) return <div className="card"><p>Not found</p></div>;

  const balance = Number(invoice.total) - Number(invoice.amount_paid||0);

  return (
    <div>
      <h1 className="page-title">Invoice #{invoice.id}</h1>

      <div className="card" style={{marginBottom:12}}>
        <div style={{display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:8}}>
          <div>
            <div className="muted">Client</div>
            <div>{invoice.client?.name || invoice.client_id}</div>
          </div>
          <div>
            <div className="muted">Status</div>
            <div><span className={'status ' + (invoice.status==='part-paid'?'partial':invoice.status)}>{invoice.status}</span></div>
          </div>
          <div>
            <div className="muted">Total</div>
            <div>GHS {Number(invoice.total).toFixed(2)}</div>
          </div>
          <div>
            <div className="muted">Paid</div>
            <div>GHS {Number(invoice.amount_paid||0).toFixed(2)}</div>
          </div>
          <div>
            <div className="muted">Balance</div>
            <div>GHS {balance.toFixed(2)}</div>
          </div>
          <div>
            <div className="muted">Due date</div>
            <div>{invoice.due_date || '—'}</div>
          </div>
        </div>
      </div>

      <div className="card table-wrap" style={{marginBottom:12}}>
        <h3 style={{marginTop:0}}>Payments</h3>
        <table>
          <thead><tr><th>Date</th><th>Amount</th><th>Percent</th><th>Method</th><th>Note</th><th></th></tr></thead>
          <tbody>
            {(invoice.payments||[]).map(p => (
              <tr key={p.id}>
                <td>{new Date(p.created_at).toLocaleString()}</td>
                <td>{Number(p.amount).toFixed(2)}</td>
                <td>{p.percent ?? ''}</td>
                <td>{p.method ?? ''}</td>
                <td>{p.note ?? ''}</td>
                <td><button type="button" className="btn danger" onClick={()=>deletePayment(p.id)} disabled={busy}>Delete</button></td>
              </tr>
            ))}
            {(!invoice.payments || invoice.payments.length===0) && <tr><td colSpan={6} className="muted">No payments yet</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 style={{marginTop:0}}>Add payment</h3>
        <form onSubmit={addPayment} style={{display:'grid', gridTemplateColumns:'repeat(5,minmax(0,1fr))', gap:8}}>
          <input type="number" step="0.01" placeholder="Amount (GHS)" value={form.amount} onChange={e=>setForm({...form, amount:e.target.value})} />
          <input type="number" step="0.01" placeholder="Percent (%)" value={form.percent} onChange={e=>setForm({...form, percent:e.target.value})} />
          <input placeholder="Method (optional)" value={form.method} onChange={e=>setForm({...form, method:e.target.value})} />
          <input placeholder="Note (optional)" value={form.note} onChange={e=>setForm({...form, note:e.target.value})} />
          <input type="datetime-local" value={form.created_at} onChange={e=>setForm({...form, created_at:e.target.value})} />
          <div style={{gridColumn:'1 / -1', display:'flex', gap:8, justifyContent:'flex-end'}}>
            <Link to="/invoices" className="border" style={{padding:'8px 12px', borderRadius:8, textDecoration:'none'}}>Back</Link>
            <button type="submit" className="btn" disabled={busy}>{busy ? 'Saving…' : 'Add payment'}</button>
          </div>
        </form>
        <p className="muted" style={{marginTop:8}}>Tip: Fill either Amount <b>or</b> Percent. If both are filled, Amount wins.</p>
      </div>
    </div>
  );
}
