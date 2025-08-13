import React, { useState } from 'react';
export default function RecordPaymentModal({ invoiceId, onClose, onSuccess }){
  const [amount, setAmount] = useState('');
  const [percent, setPercent] = useState('');
  const [method, setMethod] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function submit(){
    setErr('');
    if(!amount && !percent){ setErr('Enter either an amount or a percent.'); return; }
    const payload = {
      invoice_id: Number(invoiceId),
      amount: amount ? Number(amount) : undefined,
      percent: percent ? Number(percent) : undefined,
      method: method || undefined,
      note: note || undefined
    };
    setBusy(true);
    try{
      const r = await fetch('/api/payments', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)});
      const data = await r.json();
      if(!r.ok) throw new Error(data?.error || 'Failed');
      onSuccess?.(data); onClose?.();
    }catch(e){ setErr(e.message || 'Failed to record payment'); }
    finally{ setBusy(false); }
  }
  return (
    <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50}}>
      <div className="card" style={{width:'100%', maxWidth:420}}>
        <h3 style={{fontSize:18, fontWeight:600, marginBottom:12}}>Record Payment</h3>
        <div style={{display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:12, marginBottom:12}}>
          <label>Amount (GHS)<input type="number" min="0" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} /></label>
          <label>Percent (%)<input type="number" min="0" max="100" step="0.01" value={percent} onChange={e=>setPercent(e.target.value)} /></label>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:12, marginBottom:12}}>
          <label>Method<input value={method} onChange={e=>setMethod(e.target.value)} /></label>
          <label>Note<input value={note} onChange={e=>setNote(e.target.value)} /></label>
        </div>
        {err ? <p style={{color:'#b91c1c', fontSize:13, marginBottom:12}}>{err}</p> : null}
        <div style={{display:'flex', gap:8, justifyContent:'flex-end'}}>
          <button onClick={onClose}>Cancel</button>
          <button onClick={submit} disabled={busy} className="btn">{busy?'Saving…':'Save payment'}</button>
        </div>
      </div>
    </div>
  );
}
