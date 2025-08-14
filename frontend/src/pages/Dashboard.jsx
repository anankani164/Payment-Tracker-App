import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  LineElement, PointElement, LinearScale, CategoryScale,
  Legend, Tooltip, Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Legend, Tooltip, Filler);

const COLORS = {
  primary: '#2d47ff',
  accentRed: '#ef4444',
  accentBlue: '#3b82f6',
  accentGreen: '#10b981',
  card: '#ffffff',
  border: '#e6e9f0',
  bg: '#f5f7fb',
  text: '#121826',
  muted: '#6b7280',
};

function monthKey(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

function lastNMonths(n = 6) {
  const arr = [];
  const d = new Date();
  d.setDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const tmp = new Date(d);
    tmp.setMonth(d.getMonth() - i);
    arr.push(`${tmp.getFullYear()}-${String(tmp.getMonth()+1).padStart(2,'0')}`);
  }
  return arr;
}

export default function Dashboard(){
  const [stats, setStats] = useState({ totalOutstanding:0, totalReceived:0, overdueInvoices:0, paymentsThisMonth:0 });
  const [clients, setClients] = useState([]);
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(()=>{
    (async ()=>{
      try{
        const [s, c, p, inv] = await Promise.all([
          fetch('/api/stats').then(r=>r.json()),
          fetch('/api/clients').then(r=>r.json()),
          fetch('/api/payments').then(r=>r.json()),
          fetch('/api/invoices').then(r=>r.json()),
        ]);
        setStats(s||{});
        setClients(Array.isArray(c)?c:[]);
        setPayments(Array.isArray(p)?p:[]);
        setInvoices(Array.isArray(inv)?inv:[]);
      } finally {
        setLoading(false);
      }
    })();
  },[]);

  const months = useMemo(()=> lastNMonths(6), []);

  const chartData = useMemo(()=>{
    const invByMonth = new Map(months.map(m=>[m,0]));
    invoices.forEach(inv=>{
      const key = monthKey(inv.created_at);
      if (key && invByMonth.has(key)) invByMonth.set(key, invByMonth.get(key) + Number(inv.total||0));
    });
    const payByMonth = new Map(months.map(m=>[m,0]));
    payments.forEach(p=>{
      const key = monthKey(p.created_at);
      if (key && payByMonth.has(key)) payByMonth.set(key, payByMonth.get(key) + Number(p.amount||0));
    });

    const labels = months.map(m=> {
      const [y, mm] = m.split('-');
      const d = new Date(Number(y), Number(mm)-1, 1);
      return d.toLocaleString(undefined, { month: 'short', year: 'numeric' });
    });

    return {
      labels,
      datasets: [
        {
          label: 'Invoices',
          data: months.map(m=> invByMonth.get(m)),
          borderColor: COLORS.accentBlue,
          backgroundColor: COLORS.accentBlue + '22',
          fill: true,
          tension: 0.35,
          pointRadius: 3,
        },
        {
          label: 'Payments',
          data: months.map(m=> payByMonth.get(m)),
          borderColor: COLORS.accentGreen,
          backgroundColor: COLORS.accentGreen + '22',
          fill: true,
          tension: 0.35,
          pointRadius: 3,
        }
      ]
    };
  }, [months, invoices, payments]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top' },
      tooltip: { mode: 'index', intersect: false }
    },
    interaction: { mode: 'index', intersect: false },
    scales: {
      y: {
        grid: { color: '#eef0f6' },
        ticks: { callback: v => `GHS ${Number(v).toLocaleString()}` }
      },
      x: { grid: { display: false } }
    }
  };

  const cardStyle = {
    background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 14,
    padding: 16,
    boxShadow: '0 6px 16px rgba(0,0,0,0.06)'
  };

  return (
    <div style={{color: COLORS.text}}>
      <h1 className="page-title" style={{fontSize: 28, fontWeight: 700, margin: '16px 0'}}>Dashboard</h1>

      {/* Summary Cards */}
      <div style={{display:'grid', gap:16, gridTemplateColumns:'repeat(4, minmax(0,1fr))'}}>
        <div style={cardStyle}>
          <div style={{color: COLORS.muted}}>Total Outstanding</div>
          <div style={{fontSize: 24, fontWeight: 700}}>GHS {Number(stats.totalOutstanding||0).toFixed(2)}</div>
        </div>
        <div style={cardStyle}>
          <div style={{color: COLORS.muted}}>Total Received</div>
          <div style={{fontSize: 24, fontWeight: 700}}>GHS {Number(stats.totalReceived||0).toFixed(2)}</div>
        </div>
        <div style={cardStyle}>
          <div style={{color: COLORS.muted}}>Overdue Invoices</div>
          <div style={{fontSize: 24, fontWeight: 700}}>{Number(stats.overdueInvoices||0)}</div>
        </div>
        <div style={cardStyle}>
          <div style={{color: COLORS.muted}}>Payments This Month</div>
          <div style={{fontSize: 24, fontWeight: 700}}>GHS {Number(stats.paymentsThisMonth||0).toFixed(2)}</div>
        </div>
      </div>

      {/* Quick Filters */}
      <div style={{marginTop:16, display:'grid', gap:16, gridTemplateColumns:'repeat(3, minmax(0,1fr))'}}>
        <button
          onClick={()=> navigate('/invoices?overdue=true')}
          style={{...cardStyle, display:'flex', flexDirection:'column', alignItems:'flex-start', borderColor: COLORS.accentRed}}
          onMouseOver={e=> e.currentTarget.style.boxShadow='0 12px 24px rgba(239,68,68,0.2)'}
          onMouseOut={e=> e.currentTarget.style.boxShadow='0 6px 16px rgba(0,0,0,0.06)'}
        >
          <span style={{color: COLORS.muted, fontSize: 13}}>Quick Filter</span>
          <span style={{fontWeight:700, fontSize:16, color: COLORS.accentRed}}>Overdue Invoices</span>
          <span style={{fontSize:12, color: COLORS.muted, marginTop:4}}>Show all invoices past due</span>
        </button>

        <button
          onClick={()=> {
            const now = new Date();
            const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10);
            const to = new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().slice(0,10);
            navigate(`/invoices?from=${from}&to=${to}`);
          }}
          style={{...cardStyle, display:'flex', flexDirection:'column', alignItems:'flex-start', borderColor: COLORS.accentBlue}}
          onMouseOver={e=> e.currentTarget.style.boxShadow='0 12px 24px rgba(59,130,246,0.2)'}
          onMouseOut={e=> e.currentTarget.style.boxShadow='0 6px 16px rgba(0,0,0,0.06)'}
        >
          <span style={{color: COLORS.muted, fontSize: 13}}>Quick Filter</span>
          <span style={{fontWeight:700, fontSize:16, color: COLORS.accentBlue}}>This Month’s Invoices</span>
          <span style={{fontSize:12, color: COLORS.muted, marginTop:4}}>Invoices created this month</span>
        </button>

        <button
          onClick={()=> {
            const now = new Date();
            const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10);
            const to = new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().slice(0,10);
            navigate(`/payments?from=${from}&to=${to}`);
          }}
          style={{...cardStyle, display:'flex', flexDirection:'column', alignItems:'flex-start', borderColor: COLORS.accentGreen}}
          onMouseOver={e=> e.currentTarget.style.boxShadow='0 12px 24px rgba(16,185,129,0.2)'}
          onMouseOut={e=> e.currentTarget.style.boxShadow='0 6px 16px rgba(0,0,0,0.06)'}
        >
          <span style={{color: COLORS.muted, fontSize: 13}}>Quick Filter</span>
          <span style={{fontWeight:700, fontSize:16, color: COLORS.accentGreen}}>This Month’s Payments</span>
          <span style={{fontSize:12, color: COLORS.muted, marginTop:4}}>Payments received this month</span>
        </button>
      </div>

      {/* Two tables */}
      <div style={{marginTop:16, display:'grid', gap:16, gridTemplateColumns:'repeat(2, minmax(0,1fr))'}}>
        <div style={cardStyle}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
            <h3 style={{margin:0}}>Clients</h3>
            <a href="/clients" style={{background:'#e7ecff', color: COLORS.primary, padding:'6px 10px', borderRadius:10, textDecoration:'none'}}>View all</a>
          </div>
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead>
              <tr>
                <th style={{textAlign:'left', color: COLORS.muted, padding:'10px 8px', borderBottom:`1px solid ${COLORS.border}`}}>Name</th>
                <th style={{textAlign:'left', color: COLORS.muted, padding:'10px 8px', borderBottom:`1px solid ${COLORS.border}`}}>Email</th>
                <th style={{textAlign:'left', color: COLORS.muted, padding:'10px 8px', borderBottom:`1px solid ${COLORS.border}`}}>Phone</th>
              </tr>
            </thead>
            <tbody>
              {clients.slice(0,8).map(c=> (
                <tr key={c.id}>
                  <td style={{padding:'10px 8px', borderBottom:`1px solid ${COLORS.border}`}}>{c.name}</td>
                  <td style={{padding:'10px 8px', borderBottom:`1px solid ${COLORS.border}`}}>{c.email||''}</td>
                  <td style={{padding:'10px 8px', borderBottom:`1px solid ${COLORS.border}`}}>{c.phone||''}</td>
                </tr>
              ))}
              {clients.length===0 && (
                <tr><td colSpan={3} style={{padding:'12px 8px', color: COLORS.muted}}>No clients yet</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={cardStyle}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
            <h3 style={{margin:0}}>Recent Payments</h3>
            <a href="/invoices" style={{background:'#e7ecff', color: COLORS.primary, padding:'6px 10px', borderRadius:10, textDecoration:'none'}}>Invoices</a>
          </div>
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead>
              <tr>
                <th style={{textAlign:'left', color: COLORS.muted, padding:'10px 8px', borderBottom:`1px solid ${COLORS.border}`}}>Date</th>
                <th style={{textAlign:'left', color: COLORS.muted, padding:'10px 8px', borderBottom:`1px solid ${COLORS.border}`}}>Amount</th>
                <th style={{textAlign:'left', color: COLORS.muted, padding:'10px 8px', borderBottom:`1px solid ${COLORS.border}`}}>Percent</th>
                <th style={{textAlign:'left', color: COLORS.muted, padding:'10px 8px', borderBottom:`1px solid ${COLORS.border}`}}>Note</th>
              </tr>
            </thead>
            <tbody>
              {payments.slice(0,8).map(p=> (
                <tr key={p.id}>
                  <td style={{padding:'10px 8px', borderBottom:`1px solid ${COLORS.border}`}}>{new Date(p.created_at).toLocaleString()}</td>
                  <td style={{padding:'10px 8px', borderBottom:`1px solid ${COLORS.border}`}}>{Number(p.amount).toFixed(2)}</td>
                  <td style={{padding:'10px 8px', borderBottom:`1px solid ${COLORS.border}`}}>{p.percent ?? ''}</td>
                  <td style={{padding:'10px 8px', borderBottom:`1px solid ${COLORS.border}`}}>{p.note ?? ''}</td>
                </tr>
              ))}
              {payments.length===0 && (
                <tr><td colSpan={4} style={{padding:'12px 8px', color: COLORS.muted}}>No payments yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Line Chart */}
      <div style={{marginTop:16, ...cardStyle, height: 320}}>
        <h3 style={{marginTop:0, marginBottom:12}}>Invoices vs Payments (last 6 months)</h3>
        <div style={{height: 260}}>
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      {loading && <p style={{marginTop:12, color: COLORS.muted}}>Loading…</p>}
    </div>
  );
}
