import React, { useEffect, useState } from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Invoices from './pages/Invoices';
import Payments from './pages/Payments';
import Admin from './pages/Admin';
import ClientStatement from './pages/ClientStatement';
import InvoiceDetails from './pages/InvoiceDetails';
import './styles/brand.css';
import logoUrl from './assets/logo.png';
import { apiFetch } from './utils/api';
import { getAnyToken, clearAnyToken } from './utils/auth';
import initBrandFromLogo from './theme/deriveBrandFromLogo';

function RequireAuth({ children }) {
  const navigate = useNavigate();
  useEffect(() => {
    if (!getAnyToken()) navigate('/login');
  }, [navigate]);
  return getAnyToken() ? children : null;
}

export default function App(){
  const [user, setUser] = useState(null);
  const [hasToken, setHasToken] = useState(!!getAnyToken());
  const navigate = useNavigate();

  useEffect(()=>{
    const i = setInterval(()=> setHasToken(!!getAnyToken()), 800);
    return ()=> clearInterval(i);
  },[]);

  useEffect(()=>{
    let cancelled = false;
    async function loadMe(){
      if (!getAnyToken()) { setUser(null); return; }
      try{
        const r = await apiFetch('/api/auth/me');
        const d = await r.json();
        if (!cancelled) setUser(d?.user || null);
      }catch{
        if (!cancelled) setUser(null);
      }
    }
    loadMe();
    return ()=>{ cancelled = true; };
  }, [hasToken]);

  useEffect(() => { initBrandFromLogo(logoUrl); }, []);

  function logout(){
    clearAnyToken();
    setUser(null);
    setHasToken(false);
    navigate('/login');
  }

  return (
    <div>
      <nav className="topnav">
        <div style={{display:'flex', alignItems:'center', gap:12}}>
          <a className="brand" href="/">
            <img src={logoUrl} alt="Logo" />
            <span>Payment Tracker</span>
          </a>
          {hasToken && (
            <div className="tabs">
              <NavLink to="/" end>Dashboard</NavLink>
              <NavLink to="/clients">Clients</NavLink>
              <NavLink to="/invoices">Invoices</NavLink>
              <NavLink to="/payments">Payments</NavLink>
              <NavLink to="/admin">Admin</NavLink>
            </div>
          )}
        </div>
        <div style={{display:'flex', alignItems:'center', gap:8}}>
          {!hasToken ? (
            <>
              <NavLink to="/login" className="btn secondary">Login</NavLink>
              <NavLink to="/register" className="btn ghost">Register</NavLink>
            </>
          ):(
            <>
              <div className="user-pill">{user?.name || user?.email}</div>
              <button className="btn small" onClick={logout}>Logout</button>
            </>
          )}
        </div>
      </nav>

      <main className="container">
        <Routes>
          <Route path="/login" element={<Login/>} />
          <Route path="/register" element={<Register/>} />
          <Route path="/" element={<RequireAuth><Dashboard/></RequireAuth>} />
          <Route path="/clients" element={<RequireAuth><Clients/></RequireAuth>} />
          <Route path="/clients/:id/statement" element={<RequireAuth><ClientStatement/></RequireAuth>} />
          <Route path="/invoices" element={<RequireAuth><Invoices/></RequireAuth>} />
          <Route path="/invoices/:id" element={<RequireAuth><InvoiceDetails/></RequireAuth>} />
          <Route path="/payments" element={<RequireAuth><Payments/></RequireAuth>} />
          <Route path="/admin" element={<RequireAuth><Admin/></RequireAuth>} />
        </Routes>
      </main>
    </div>
  );
}
