import React, { useEffect, useState } from 'react'
import api from '../api'

export default function Invoices(){
  const [invoices, setInvoices] = useState([])
  const [clients, setClients] = useState([])
  const [form, setForm] = useState({ client_id:'', title:'', description:'', amount:'', due_date:'' })

  const load = () => {
    api.get('/api/invoices').then(r => setInvoices(r.data))
    api.get('/api/clients').then(r => setClients(r.data))
  }
  useEffect(() => { load() }, [])

  const submit = async (e) => {
    e.preventDefault()
    if(!form.client_id || !form.title || !form.amount) return
    await api.post('/api/invoices', { ...form, amount: Number(form.amount) })
    setForm({ client_id:'', title:'', description:'', amount:'', due_date:'' })
    load()
  }

  const clientName = (id) => clients.find(c => String(c.id) === String(id))?.name || id

  return (
    <div className="grid grid-2">
      <div className="card">
        <div className="page-title">Create Invoice</div>
        <form onSubmit={submit} className="grid" style={{gap:12}}>
          <select value={form.client_id} onChange={e=>setForm({...form, client_id:e.target.value})} required>
            <option value="">Select client</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input placeholder="Title *" value={form.title} onChange={e=>setForm({...form, title:e.target.value})} required />
          <textarea placeholder="Description" rows={3} value={form.description} onChange={e=>setForm({...form, description:e.target.value})}></textarea>
          <input placeholder="Amount *" type="number" step="0.01" value={form.amount} onChange={e=>setForm({...form, amount:e.target.value})} required />
          <input placeholder="Due date (YYYY-MM-DD)" value={form.due_date} onChange={e=>setForm({...form, due_date:e.target.value})} />
          <button className="btn" type="submit">Save Invoice</button>
        </form>
      </div>
      <div className="card">
        <div className="page-title">All Invoices</div>
        <table>
          <thead>
            <tr><th>#</th><th>Title</th><th>Client</th><th>Status</th><th>Invoiced</th><th>Paid</th><th>Balance</th></tr>
          </thead>
          <tbody>
            {invoices.map(inv => (
              <tr key={inv.invoice_id}>
                <td><a href={`/invoices/${inv.invoice_id}`}>#{inv.invoice_id}</a></td>
                <td>{inv.title}</td>
                <td>{clientName(inv.client_id)}</td>
                <td><span className={`status ${inv.status}`}>{inv.status}</span></td>
                <td>GHS {inv.invoice_amount.toFixed(2)}</td>
                <td>GHS {inv.total_paid.toFixed(2)}</td>
                <td>GHS {inv.balance.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
