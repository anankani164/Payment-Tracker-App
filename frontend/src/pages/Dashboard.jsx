import React, { useEffect, useMemo, useState } from 'react';
import Money from '../components/Money';
import { fmtMoney, fmtNumber } from '../utils/format';
import { apiFetch } from '../utils/api';

import {
  Chart as ChartJS,
  LineElement, PointElement, LinearScale, CategoryScale,
  Legend, Tooltip, Filler
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Legend, Tooltip, Filler);

const cardStyle = {
  background: '#fff',
  border: '1px solid #eef1f6',
  borderRadius: 12,
  padding: 16,
  boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
};

export default function Dashboard(){
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(()=>{
    (async ()=>{
      try{
        setLoading(true);
        const invRes = await apiFetch('/api/invoices');
        const payRes = await apiFetch('/api/payments');
        const inv = await invRes.json();
        const pay = await payRes.json();
        setInvoices(Array.isArray(inv) ? inv : []);
        setPayments(Array.isArray(pay) ? pay : []);
        setError('');
      }catch(e){
        setError('Failed to load dashboard data');
      }finally{
        setLoading(false);
      }
    })();
  }, []);

  const totals = useMemo(()=>{
    const total = invoices.reduce((s,i)=> s + Number(i.total||0), 0);
    const paid = invoices.reduce((s,i)=> s + Number(i.amount_paid||0), 0);
    const balance = total - paid;
    return { total, paid, balance };
  }, [invoices]);

  const recentPayments = useMemo(()=>{
    const arr = [...payments].sort((a,b)=> new Date(b.created_at||0) - new Date(a.created_at||0));
    return arr.slice(0, 6);
  }, [payments]);

  const lineData = useMemo(()=>{
    // Simple line: monthly totals by created_at
    const months = Array.from({length: 12}, (_,i)=> i); // 0..11
    const map = new Map(months.map(m=> [m, 0]));
    invoices.forEach(i => {
      const d = new Date(i.created_at || i.due_date || Date.now());
      const m = d.getMonth();
      map.set(m, (map.get(m)||0) + Number(i.total||0));
    });
    const labels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const data = months.map(m => map.get(m)||0);
    return {
      labels,
      datasets: [{
        label: 'Invoice totals',
        data,
        fill: true,
        tension: 0.35
      }]
    };
  }, [invoices]);

  const lineOpts = useMemo(()=> ({
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `Total: ${fmtMoney(ctx.parsed.y,'GHS')}`
        }
      }
    },
    scales: {
      y: {
        ticks: {
          callback: (v) => fmtNumber(v)
        }
      }
    }
  }), []);

  if (loading) return <div className="card"><p>Loading…</p></div>;
  if (error) return <div className="card"><p style={{color:'crimson'}}>{error}</p></div>;

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>

      {/* Top cards */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(3, minmax(0,1fr))', gap:12, marginBottom:12}}>
        <div style={cardStyle}>
          <div className="muted">Total Invoices</div>
          <div style={{fontSize:28, fontWeight:700}}><Money value={totals.total} /></div>
        </div>
        <div style={cardStyle}>
          <div className="muted">Amount Paid</div>
          <div style={{fontSize:28, fontWeight:700}}><Money value={totals.paid} /></div>
        </div>
        <div style={cardStyle}>
          <div className="muted">Outstanding</div>
          <div style={{fontSize:28, fontWeight:700}}><Money value={totals.balance} /></div>
        </div>
      </div>

      {/* Chart + Recent payments */}
      <div style={{display:'grid', gridTemplateColumns:'2fr 1fr', gap:12, alignItems:'stretch'}}>
        <div style={cardStyle}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
            <h3 style={{margin:0}}>Invoices (by month)</h3>
          </div>
          <Line data={lineData} options={lineOpts} />
        </div>

        <div style={cardStyle}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
            <h3 style={{margin:0}}>Recent Payments</h3>
          </div>
          <div style={{display:'grid', gap:8}}>
            {recentPayments.map(p => (
              <div key={p.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', border:'1px solid #f0f3f8', borderRadius:10, padding:'8px 10px'}}>
                <div style={{display:'flex', flexDirection:'column'}}>
                  <span style={{fontWeight:600}}>{p.method || 'Payment'}</span>
                  <span className="muted" style={{fontSize:12}}>{new Date(p.created_at).toLocaleString()}</span>
                </div>
                <div style={{fontWeight:700}}><Money value={p.amount} /></div>
              </div>
            ))}
            {recentPayments.length===0 && <div className="muted">No recent payments</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
