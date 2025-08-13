import React, { useEffect, useState } from 'react'
import api from '../api'

export default function Dashboard(){
  const [stats, setStats] = useState(null)

  useEffect(() => {
    api.get('/api/stats').then(res => setStats(res.data))
  }, [])

  if (!stats) return <p>Loading...</p>

  return (
    <div className="grid grid-3">
      <div className="card">
        <div className="page-title">Overview</div>
        <p><b>{stats.clients}</b> clients</p>
        <p><b>{stats.invoices}</b> invoices</p>
        <p>Total Amount: <b>GHS {stats.total_amount.toFixed(2)}</b></p>
        <p>Collected: <b className="muted">GHS {stats.total_paid.toFixed(2)}</b></p>
        <p>Outstanding: <b style={{color:'#ffd36a'}}>GHS {stats.outstanding.toFixed(2)}</b></p>
      </div>
      <div className="card">
        <div className="page-title">Pending Invoices</div>
        <table>
          <thead>
            <tr><th>Title</th><th>Due</th><th>Status</th><th>Balance</th></tr>
          </thead>
          <tbody>
            {stats.pendingInvoices.map(inv => (
              <tr key={inv.invoice_id}>
                <td><a href={`/invoices/${inv.invoice_id}`}>{inv.title}</a></td>
                <td>{inv.due_date || '—'}</td>
                <td><span className={`status ${inv.status}`}>{inv.status}</span></td>
                <td>GHS {inv.balance.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card">
        <div className="page-title">Recent Payments</div>
        <table>
          <thead>
            <tr><th>Date</th><th>Invoice</th><th>Amount</th><th>Method</th></tr>
          </thead>
          <tbody>
            {stats.recentPayments.map(p => (
              <tr key={p.id}>
                <td>{p.paid_at}</td>
                <td><a href={`/invoices/${p.invoice_id}`}>#{p.invoice_id}</a></td>
                <td>GHS {Number(p.amount).toFixed(2)}</td>
                <td>{p.method || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
