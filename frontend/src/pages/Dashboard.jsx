import React, { useEffect, useMemo, useState } from 'react';
import Money from '../components/Money';
import { fmtMoney, fmtNumber } from '../utils/format';
import { apiFetch } from '../utils/api';
import { Link, useSearchParams } from 'react-router-dom';

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
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState({
    status: params.get('status') || '',
    client_id: params.get('client_id') || '',
    overdue: params.get('overdue') === 'true',
    from: params.get('from') || '',
    to: params.get('to') || '',
    q: params.get('q') || ''
  });

  useEffect(()=>{
    (async ()=>{
      try{
        setLoading(true);
        const [invRes, payRes, cliRes] = await Promise.all([
          apiFetch('/api/invoices'),
          apiFetch('/api/payments'),
          apiFetch('/api/clients')
        ]);
        const [inv, pay, cli] = await Promise.all([invRes.json(), payRes.json(), cliRes.json()]);
        setInvoices(Array.isArray(inv) ? inv : []);
        setPayments(Array.isArray(pay) ? pay : []);
        setClients(Array.isArray(cli) ? cli : []);
        setError('');
      }catch(e){
        console.error(e);
        setError('Failed to load dashboard data');
      }finally{
        setLoading(false);
      }
    })();
  }, []);

  function applyFilters(newFilters = filters){
    const sp = new URLSearchParams();
    Object.entries(newFilters).forEach(([k,v])=>{
      if (k==='overdue') { if (v) sp.set('overdue','true'); }
      else if (v) sp.set(k, v);
    });
    setParams(sp, { replace:true });
  }

  const clientById = useMemo(()=>{
    const map = new Map();
    clients.forEach(c => map.set(c.id, c));
    return map;
  }, [clients]);

  const filteredInvoices = useMemo(()=>{
    const fromTs = filters.from ? new Date(filters.from).getTime() : null;
    const toTs = filters.to ? new Date(filters.to + 'T23:59:59').getTime() : null;
    const q = (filters.q || '').toLowerCase();
    return invoices.filter(inv => {
      if (filters.status) {
        if (filters.status === 'overdue') {
          if (!inv.overdue) return false;
        } else {
          if (inv.status !== filters.status) return false;
        }
      }
      if (filters.client_id && String(inv.client_id) !== String(filters.client_id)) return false;
      if (filters.overdue && !inv.overdue) return false;

      const created = inv.created_at ? new Date(inv.created_at).getTime() : null;
      if (fromTs && (!created || created < fromTs)) return false;
      if (toTs && (!created || created > toTs)) return false;

      if (q) {
        const clientName = clientById.get(inv.client_id)?.name?.toLowerCase() || '';
        const hay = [inv.title, inv.description, clientName].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [invoices, filters, clientById]);

  const invoiceById = useMemo(()=>{
    const map = new Map();
    invoices.forEach(i => map.set(i.id, i));
    return map;
  }, [invoices]);

  const filteredPayments = useMemo(()=>{
    const fromTs = filters.from ? new Date(filters.from).getTime() : null;
    const toTs = filters.to ? new Date(filters.to + 'T23:59:59').getTime() : null;
    return payments.filter(p => {
      if (filters.client_id) {
        const inv = invoiceById.get(p.invoice_id);
        if (!inv || String(inv.client_id) !== String(filters.client_id)) return false;
      }
      const ts = p.created_at ? new Date(p.created_at).getTime() : null;
      if (fromTs && (!ts || ts < fromTs)) return false;
      if (toTs && (!ts || ts > toTs)) return false;
      return true;
    });
  }, [payments, filters, invoiceById]);

  const totals = useMemo(()=>{
    const total = filteredInvoices.reduce((s,i)=> s + Number(i.total||0), 0);
    const paid = filteredInvoices.reduce((s,i)=> s + Number(i.amount_paid||0), 0);
    const balance = total - paid;
    return { total, paid, balance };
  }, [filteredInvoices]);

  const recentPayments = useMemo(()=>{
    const arr = [...filteredPayments].sort((a,b)=> new Date(b.created_at||0) - new Date(a.created_at||0));
    return arr.slice(0, 6);
  }, [filteredPayments]);

  const lineData = useMemo(()=>{
    // monthly totals for filtered invoices
    const months = Array.from({length: 12}, (_,i)=> i); // 0..11
    const now = new Date();
    const year = now.getFullYear();
    const isInRange = (d) => {
      const fromTs = filters.from ? new Date(filters.from).getTime() : null;
      const toTs = filters.to ? new Date(filters.to + 'T23:59:59').getTime() : null;
      const ts = d.getTime();
      if (fromTs && ts < fromTs) return false;
      if (toTs && ts > toTs) return false;
      return true;
    };
    const map = new Map(months.map(m=> [m, 0]));
    filteredInvoices.forEach(i => {
      const d = new Date(i.created_at || i.due_date || `${year}-01-01`);
      if (!isNaN(d) && isInRange(d)) {
        map.set(d.getMonth(), (map.get(d.getMonth())||0) + Number(i.total||0));
      }
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
  }, [filteredInvoices, filters]);

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

      {/* Filters card (restored) */}
      <div className="card" style={{marginBottom:12}}>
        <div style={{display:'grid', gridTemplateColumns:'repeat(6, minmax(0,1fr))', gap:8}}>
          <select value={filters.status} onChange={e=>setFilters({...filters, status:e.target.value})}>
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="part-paid">Part-paid</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
          <select value={filters.client_id} onChange={e=>setFilters({...filters, client_id:e.target.value})}>
            <option value="">All clients</option>
            {clients.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input type="date" value={filters.from} onChange={e=>setFilters({...filters, from:e.target.value})} />
          <input type="date" value={filters.to} onChange={e=>setFilters({...filters, to:e.target.value})} />
          <input placeholder="Search…" value={filters.q} onChange={e=>setFilters({...filters, q:e.target.value})} />
          <label style={{display:'flex', alignItems:'center', gap:6}}>
            <input type="checkbox" checked={filters.overdue} onChange={e=>setFilters({...filters, overdue:e.target.checked})} />
            Overdue
          </label>
        </div>
        <div style={{display:'flex', gap:8, marginTop:10, flexWrap:'wrap'}}>
          <button className="btn" onClick={()=>applyFilters()}>Apply</button>
          <button className="btn secondary" onClick={()=>{ setFilters({status:'',client_id:'',overdue:false,from:'',to:'',q:''}); applyFilters({}); }}>Reset</button>
        </div>
      </div>

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
            <Link to="/payments" className="muted" style={{fontSize:12,textDecoration:'none'}}>View all →</Link>
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
