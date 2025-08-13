import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import RecordPaymentModal from '../components/RecordPaymentModal';
export default function InvoiceDetails(){
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [payments, setPayments] = useState([]);
  const [showPay, setShowPay] = useState(false);
  async function load(){
    const r = await fetch(`/api/invoices/${id}`);
    const data = await r.json();
    setInvoice(data);
    const p = await (await fetch(`/api/payments?invoice_id=${id}`)).json();
    setPayments(Array.isArray(p)?p:[]);
  }
  useEffect(()=>{ load(); },[id]);
  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <h1 className="page-title">Invoice #{id}</h1>
        <button onClick={()=>setShowPay(true)} className="btn">Record Payment</button>
      </div>
      {invoice && (
        <div className="card">
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:12}}>
            <div><div className="muted">Client</div><div style={{fontWeight:600}}>{invoice.client?.name||invoice.client_id}</div></div>
            <div><div className="muted">Total</div><div style={{fontWeight:600}}>GHS {Number(invoice.total).toFixed(2)}</div></div>
            <div><div className="muted">Paid</div><div style={{fontWeight:600}}>GHS {Number(invoice.amount_paid||0).toFixed(2)}</div></div>
            <div><div className="muted">Status</div><span className={`status ${invoice.status==='part-paid'?'partial':invoice.status}`}>{invoice.status}</span></div>
          </div>
        </div>
      )}
      <h2 style={{marginTop:16}}>Payments</h2>
      <div className="card">
        <table>
          <thead><tr><th>Date</th><th>Amount</th><th>Percent</th><th>Method</th><th>Note</th></tr></thead>
          <tbody>
            {payments.map(p=> (<tr key={p.id}><td>{new Date(p.created_at).toLocaleString()}</td><td>{Number(p.amount).toFixed(2)}</td><td>{p.percent??''}</td><td>{p.method??''}</td><td>{p.note??''}</td></tr>))}
            {payments.length===0 && <tr><td colSpan={5} className="muted">No payments yet</td></tr>}
          </tbody>
        </table>
      </div>
      {showPay && <RecordPaymentModal invoiceId={id} onClose={()=>setShowPay(false)} onSuccess={()=>load()} />}
    </div>
  )
}
