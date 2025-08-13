import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { downloadCSV, downloadPDF } from '../utils/export';
export default function Invoices(){
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({client_id:'', total:'', title:'', description:'', due_date:''});
  async function load(){
    setInvoices(await (await fetch('/api/invoices')).json());
    setClients(await (await fetch('/api/clients')).json());
  }
  useEffect(()=>{ load(); },[]);
  async function add(){
    const body = {...form, client_id:Number(form.client_id), total:Number(form.total)};
    if(!body.client_id || !(body.total>0)) return alert('Select client and amount > 0');
    const r = await fetch('/api/invoices', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)});
    if(!r.ok) return alert('Failed to add invoice');
    setShow(false); setForm({client_id:'', total:'', title:'', description:'', due_date:''}); load();
  }
  return (
    <div>
      <h1 className="page-title">Invoices</h1>
      <div style={{display:'flex',gap:8, marginBottom:12}}>
        <button className="btn" onClick={()=>setShow(true)}>Add Invoice</button>
        <button className="btn secondary" onClick={()=>downloadCSV('invoices.csv', invoices)}>Export CSV</button>
        <button className="btn secondary" onClick={()=>downloadPDF('Invoices', invoices)}>Export PDF</button>
      </div>
      <div className="card">
        <table>
          <thead><tr><th>#</th><th>Client</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th>Due</th><th></th></tr></thead>
          <tbody>
            {invoices.map(inv=> (
              <tr key={inv.id}>
                <td>{inv.id}</td>
                <td>{inv.client?.name||inv.client_id}</td>
                <td>{Number(inv.total).toFixed(2)}</td>
                <td>{Number(inv.amount_paid||0).toFixed(2)}</td>
                <td>{Number(inv.balance||0).toFixed(2)}</td>
                <td><span className={`status ${inv.status==='part-paid'?'partial':inv.status}`}>{inv.status}</span></td>
                <td>{inv.due_date||''}</td>
                <td><Link to={`/invoices/${inv.id}`}>View</Link></td>
              </tr>
            ))}
            {invoices.length===0 && <tr><td colSpan={8} className="muted">No invoices yet</td></tr>}
          </tbody>
        </table>
      </div>
      {show && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center'}}>
          <div className="card" style={{width:'100%', maxWidth:520}}>
            <h3 style={{marginTop:0}}>Add invoice</h3>
            <div style={{display:'grid', gap:12}}>
              <select value={form.client_id} onChange={e=>setForm({...form, client_id:e.target.value})}>
                <option value="">Select client</option>
                {clients.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input placeholder="Title (optional)" value={form.title} onChange={e=>setForm({...form, title:e.target.value})} />
              <textarea placeholder="Description (optional)" value={form.description} onChange={e=>setForm({...form, description:e.target.value})} />
              <input type="number" step="0.01" placeholder="Total amount" value={form.total} onChange={e=>setForm({...form, total:e.target.value})} />
              <input type="date" value={form.due_date} onChange={e=>setForm({...form, due_date:e.target.value})} />
            </div>
            <div style={{display:'flex', gap:8, justifyContent:'flex-end', marginTop:12}}>
              <button onClick={()=>setShow(false)} className="border">Cancel</button>
              <button onClick={add} className="btn">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
