import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../api'

export default function InvoiceDetails(){
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [form, setForm] = useState({ amount:'', paid_at:'', method:'', notes:'' })

  const load = () => api.get(`/api/invoices/${id}`).then(r => setData(r.data))
  useEffect(() => { load() }, [id])

  const submit = async (e) => {
    e.preventDefault()
    if(!form.amount) return
    await api.post(`/api/invoices/${id}/payments`, { ...form, amount: Number(form.amount) })
    setForm({ amount:'', paid_at:'', method:'', notes:'' })
    load()
  }

  if(!data) return <p>Loading...</p>
  const { invoice, client, payments } = data
  const pct = Math.min(100, Math.round((invoice.total_paid / invoice.invoice_amount) * 100))

  return (
    <div className="grid">
      <div className="card">
        <div className="page-title">Invoice #{invoice.invoice_id}</div>
        <p><b>Title:</b> {invoice.title}</p>
        <p><b>Client:</b> {client?.name} {client?.company ? `(${client.company})` : ''}</p>
        <p><b>Amount:</b> GHS {invoice.invoice_amount.toFixed(2)}</p>
        <p><b>Paid:</b> GHS {invoice.total_paid.toFixed(2)} | <b>Balance:</b> GHS {invoice.balance.toFixed(2)}</p>
        <p><b>Status:</b> <span className={`status ${invoice.status}`}>{invoice.status}</span></p>
        <div style={{background:'#0f1530', border:'1px solid #1f2758', borderRadius:12, overflow:'hidden', height:12, marginTop:8}}>
          <div style={{width: pct+'%', height:'100%', background:'#2d47ff'}}></div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="page-title">Add Payment</div>
          <form onSubmit={submit} className="grid" style={{gap:12}}>
            <input placeholder="Amount *" type="number" step="0.01" value={form.amount} onChange={e=>setForm({...form, amount:e.target.value})} required/>
            <input placeholder="Paid at (YYYY-MM-DD)" value={form.paid_at} onChange={e=>setForm({...form, paid_at:e.target.value})} />
            <input placeholder="Method (e.g. bank, cash)" value={form.method} onChange={e=>setForm({...form, method:e.target.value})} />
            <textarea placeholder="Notes" rows={3} value={form.notes} onChange={e=>setForm({...form, notes:e.target.value})}></textarea>
            <button className="btn" type="submit">Record Payment</button>
          </form>
        </div>
        <div className="card">
          <div className="page-title">Payments</div>
          <table>
            <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Notes</th></tr></thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id}>
                  <td>{p.paid_at}</td>
                  <td>GHS {Number(p.amount).toFixed(2)}</td>
                  <td>{p.method || '—'}</td>
                  <td>{p.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
