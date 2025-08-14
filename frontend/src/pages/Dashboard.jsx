import React, { useEffect, useMemo, useState } from 'react';
import Money from '../components/Money';
import { fmtMoney, fmtNumber } from '../utils/format';
import { Link } from 'react-router-dom';
import { apiFetch } from '../utils/api';

import {
  Chart as ChartJS,
  LineElement, PointElement, LinearScale, CategoryScale,
  Legend, Tooltip, Filler
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Legend, Tooltip, Filler);

const card = { background:'#fff', border:'1px solid #eef1f6', borderRadius:12, padding:16, boxShadow:'0 1px 2px rgba(0,0,0,0.03)' };

export default function Dashboard(){
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(()=>{
    (async ()=>{
      try{
        setLoading(true);
        const [inv, pay, cli] = await Promise.all([
          (await apiFetch('/api/invoices')).json(),
          (await apiFetch('/api/payments')).json(),
          (await apiFetch('/api/clients')).json(),
        ]);
        setInvoices(Array.isArray(inv)?inv:[]);
        setPayments(Array.isArray(pay)?pay:[]);
        setClients(Array.isArray(cli)?cli:[]);
      }catch(e){
        console.error(e);
        setError('Failed to load dashboard');
      }finally{
        setLoading(false);
      }
    })();
  }, []);

  const todayISO = new Date().toISOString().slice(0,10);
  const stats = useMemo(()=>{
    const overdueCount = invoices.filter(i => {
      const due = i.due_date ? new Date(i.due_date) : null;
      const paid = String(i.status).toLowerCase() === 'paid';
      return due && !paid && due.getTime() < Date.now();
    }).length;
    const totalReceived = payments.reduce((s,p)=> s + Number(p.amount||0), 0);
    const totalOutstanding = invoices.reduce((s,i)=> s + Math.max(0, Number(i.total||0) - Number(i.amount_paid||0)), 0);
    const thisMonth = new Date().toISOString().slice(0,7); // YYYY-MM
    const paymentsThisMonth = payments
      .filter(p => (p.created_at||'').startsWith(thisMonth))
      .reduce((s,p)=> s + Number(p.amount||0), 0);
    return { overdueCount, totalReceived, totalOutstanding, paymentsThisMonth };
  }, [invoices, payments]);

  const topClients = useMemo(()=> clients.slice(0,5), [clients]);

  const chartData = useMemo(()=>{
    const labels = [];
    const invSeries = [];
    const paySeries = [];
    const now = new Date();
    for (let i=5; i>=0; i--){
      const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
      const key = d.toISOString().slice(0,7); // YYYY-MM
      labels.push(d.toLocaleString(undefined, { month:'short', year:'numeric' }));
      const invTotal = invoices
        .filter(x => (x.created_at||'').slice(0,7) === key)
        .reduce((s,x)=> s + Number(x.total||0), 0);
      const payTotal = payments
        .filter(x => (x.created_at||'').slice(0,7) === key)
        .reduce((s,x)=> s + Number(x.amount||0), 0);
      invSeries.push(invTotal);
      paySeries.push(payTotal);
    }
    return {
      labels,
      datasets: [
        { 
          label:'Invoices', 
          data: invSeries, 
          fill:true, 
          tension:0.35,
          borderColor: 'rgba(59,130,246,1)',         // blue 500
          backgroundColor: 'rgba(59,130,246,0.15)',  // blue fill
          pointBackgroundColor: 'rgba(59,130,246,1)',
          pointBorderColor: 'rgba(255,255,255,1)',
          pointRadius: 3,
          borderWidth: 2
        },
        { 
          label:'Payments', 
          data: paySeries, 
          fill:true, 
          tension:0.35,
          borderColor: 'rgba(16,185,129,1)',         // emerald 500
          backgroundColor: 'rgba(16,185,129,0.15)',  // green fill
          pointBackgroundColor: 'rgba(16,185,129,1)',
          pointBorderColor: 'rgba(255,255,255,1)',
          pointRadius: 3,
          borderWidth: 2
        }
      ]
    };
  }, [invoices, payments]);

  const chartOpts = useMemo(()=> ({
    responsive:true,
    plugins:{
      legend:{ display:true, position:'top' },
      tooltip:{ callbacks:{ label: (ctx)=> `${ctx.dataset.label}: ${fmtMoney(ctx.parsed.y,'GHS')}` } }
    },
    scales:{
      y:{ ticks:{ callback:(v)=> fmtNumber(v) } }
    }
  }), []);

  if (loading) return <div className="card"><p>Loading…</p></div>;
  if (error) return <div className="card"><p style={{color:'crimson'}}>{error}</p></div>;

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>

      {/* Top Stat Cards */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(4, minmax(0,1fr))', gap:12, marginBottom:12}}>
        <div style={card}>
          <div className="muted">Total Outstanding</div>
          <div style={{fontSize:24, fontWeight:700}}><Money value={stats.totalOutstanding} /></div>
        </div>
        <div style={card}>
          <div className="muted">Total Received</div>
          <div style={{fontSize:24, fontWeight:700}}><Money value={stats.totalReceived} /></div>
        </div>
        <div style={card}>
          <div className="muted">Overdue Invoices</div>
          <div style={{fontSize:24, fontWeight:700}}>{stats.overdueCount}</div>
        </div>
        <div style={card}>
          <div className="muted">Payments This Month</div>
          <div style={{fontSize:24, fontWeight:700}}><Money value={stats.paymentsThisMonth} /></div>
        </div>
      </div>

      {/* Quick Filters Row */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(3, minmax(0,1fr))', gap:12, marginBottom:12}}>
        <a href="/invoices?status=overdue" style={{...card, borderLeft:'4px solid #ef4444', textDecoration:'none'}}>
          <div style={{fontWeight:700, color:'#ef4444'}}>Quick Filter</div>
          <div style={{fontWeight:700}}>Overdue Invoices</div>
          <div className="muted" style={{fontSize:12}}>Show all invoices past due</div>
        </a>
        <a href={`/invoices?from=${todayISO.slice(0,7)}-01`} style={{...card, borderLeft:'4px solid #2563eb', textDecoration:'none'}}>
          <div style={{fontWeight:700, color:'#2563eb'}}>Quick Filter</div>
          <div style={{fontWeight:700}}>This Month&apos;s Invoices</div>
          <div className="muted" style={{fontSize:12}}>Invoices created this month</div>
        </a>
        <a href={`/payments?from=${todayISO.slice(0,7)}-01`} style={{...card, borderLeft:'4px solid #10b981', textDecoration:'none'}}>
          <div style={{fontWeight:700, color:'#10b981'}}>Quick Filter</div>
          <div style={{fontWeight:700}}>This Month&apos;s Payments</div>
          <div className="muted" style={{fontSize:12}}>Payments received this month</div>
        </a>
      </div>

      {/* Clients + Recent Payments */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12}}>
        <div style={card}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
            <h3 style={{margin:0}}>Clients</h3>
            <Link to="/clients" className="muted" style={{fontSize:12, textDecoration:'none'}}>View all</Link>
          </div>
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead><tr><th style={{textAlign:'left', padding:'6px 8px'}}></th><th style={{textAlign:'left', padding:'6px 8px'}}></th></tr></thead>
            <tbody>
              {clients.slice(0,5).map(c => (
                <tr key={c.id} style={{borderTop:'1px solid #f0f3f8'}}>
                  <td style={{padding:'8px 8px'}}>{c.name}</td>
                  <td style={{padding:'8px 8px'}} className="muted">{c.email || ''}</td>
                </tr>
              ))}
              {clients.length===0 && <tr><td className="muted" style={{padding:'8px'}}>No clients yet</td></tr>}
            </tbody>
          </table>
        </div>

        <div style={card}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
            <h3 style={{margin:0}}>Recent Payments</h3>
            <Link to="/invoices" className="muted" style={{fontSize:12, textDecoration:'none'}}>Invoices</Link>
          </div>
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead><tr>
              <th style={{textAlign:'left', padding:'6px 8px'}}>Date</th>
              <th style={{textAlign:'right', padding:'6px 8px'}}>Amount</th>
              <th style={{textAlign:'right', padding:'6px 8px'}}>Percent</th>
              <th style={{textAlign:'left', padding:'6px 8px'}}>Note</th>
            </tr></thead>
            <tbody>
              {[...payments].sort((a,b)=> new Date(b.created_at||0)-new Date(a.created_at||0)).slice(0,5).map(p => (
                <tr key={p.id} style={{borderTop:'1px solid #f0f3f8'}}>
                  <td style={{padding:'8px 8px'}}>{new Date(p.created_at).toLocaleString()}</td>
                  <td style={{padding:'8px 8px', textAlign:'right'}}><Money value={p.amount} /></td>
                  <td style={{padding:'8px 8px', textAlign:'right'}}>{p.percent ?? ''}</td>
                  <td style={{padding:'8px 8px'}} className="muted">{p.note ?? ''}</td>
                </tr>
              ))}
              {payments.length===0 && <tr><td className="muted" style={{padding:'8px'}}>No payments yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Chart: Invoices vs Payments (last 6 months) */}
      <div style={card}>
        <h3 style={{marginTop:0}}>Invoices vs Payments (last 6 months)</h3>
        <Line data={chartData} options={chartOpts} />
      </div>
    </div>
  );
}
