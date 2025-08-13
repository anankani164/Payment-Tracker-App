import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
export default function Dashboard(){
  const [stats, setStats] = useState({ totalOutstanding:0, totalReceived:0, overdueInvoices:0, paymentsThisMonth:0 });
  const [clients, setClients] = useState([]);
  const [payments, setPayments] = useState([]);
  useEffect(()=>{ (async ()=>{
    const s = await (await fetch('/api/stats')).json(); setStats(s);
    const c = await (await fetch('/api/clients')).json(); setClients(c);
    const p = await (await fetch('/api/payments')).json(); setPayments(p.slice(0,8));
  })(); },[]);
  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <div className="grid grid-4">
        <div className="card"><div className="muted">Total Outstanding</div><div style={{fontSize:24,fontWeight:700}}>GHS {stats.totalOutstanding.toFixed(2)}</div></div>
        <div className="card"><div className="muted">Total Received</div><div style={{fontSize:24,fontWeight:700}}>GHS {stats.totalReceived.toFixed(2)}</div></div>
        <div className="card"><div className="muted">Overdue Invoices</div><div style={{fontSize:24,fontWeight:700}}>{stats.overdueInvoices}</div></div>
        <div className="card"><div className="muted">Payments This Month</div><div style={{fontSize:24,fontWeight:700}}>GHS {stats.paymentsThisMonth.toFixed(2)}</div></div>
      </div>
      <div className="grid" style={{marginTop:16}}>
        <div className="card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <h3 style={{margin:0}}>Clients</h3>
            <Link to="/clients" className="btn secondary" style={{padding:'6px 10px'}}>View all</Link>
          </div>
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Phone</th></tr></thead>
            <tbody>
              {clients.slice(0,8).map(c=> (<tr key={c.id}><td>{c.name}</td><td>{c.email||''}</td><td>{c.phone||''}</td></tr>))}
              {clients.length===0 && <tr><td colSpan={3} className="muted">No clients yet</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <h3 style={{margin:0}}>Recent Payments</h3>
            <Link to="/invoices" className="btn secondary" style={{padding:'6px 10px'}}>Invoices</Link>
          </div>
          <table>
            <thead><tr><th>Date</th><th>Amount</th><th>Percent</th><th>Note</th></tr></thead>
            <tbody>
              {payments.map(p=> (<tr key={p.id}><td>{new Date(p.created_at).toLocaleString()}</td><td>{Number(p.amount).toFixed(2)}</td><td>{p.percent??''}</td><td>{p.note??''}</td></tr>))}
              {payments.length===0 && <tr><td colSpan={4} className="muted">No payments yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
