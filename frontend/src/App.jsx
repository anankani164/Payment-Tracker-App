import React, { useEffect, useState } from 'react';
import { NavLink, Route, Routes, useNavigate, Navigate, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Clients from './pages/Clients.jsx';
import Invoices from './pages/Invoices.jsx';
import InvoiceDetails from './pages/InvoiceDetails.jsx';
import Payments from './pages/Payments.jsx';
import ClientStatement from './pages/ClientStatement.jsx';
import Admin from './pages/Admin.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import { apiFetch } from './utils/api';

import './brand.css';
import logoUrl from './assets/logo.png';

/* Token helpers: avoid tight coupling to utils/api token helpers */
const TOKEN_KEYS = ['token','auth_token','jwt','access_token'];
function getAnyToken(){
  for (const k of TOKEN_KEYS){
    const v = localStorage.getItem(k);
    if (v) return v;
  }
  return null;
}
function clearAnyToken(){
  for (const k of TOKEN_KEYS) localStorage.removeItem(k);
}

function RequireAuth({ children }){
  const loc = useLocation();
  const token = getAnyToken();
  if (!token) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return children;
}

export default function App(){
  const [user, setUser] = useState(null);
  const [hasToken, setHasToken] = useState(!!getAnyToken());
  const navigate = useNavigate();

  // reflect token changes from other tabs
  useEffect(()=>{
    const i = setInterval(()=> setHasToken(!!getAnyToken()), 800);
    return ()=> clearInterval(i);
  },[]);

  // fetch /me when we have a token
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
              <NavLink to="/register" className="btn">Register</NavLink>
            </>
          ) : (
            <>
              {user && <span className="muted">Hi, {user.name || user.email}</span>}
              <button className="btn small" onClick={logout}>Logout</button>
            </>
          )}
        </div>
      </nav>

      <main className="container">
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login/>} />
          <Route path="/register" element={<Register/>} />

          {/* Protected */}
          <Route path="/" element={<RequireAuth><Dashboard/></RequireAuth>} />
          <Route path="/clients" element={<RequireAuth><Clients/></RequireAuth>} />
          <Route path="/clients/:id/statement" element={<RequireAuth><ClientStatement/></RequireAuth>} />
          <Route path="/invoices" element={<RequireAuth><Invoices/></RequireAuth>} />
          <Route path="/invoices/:id" element={<RequireAuth><InvoiceDetails/></RequireAuth>} />
          <Route path="/payments" element={<RequireAuth><Payments/></RequireAuth>} />
          <Route path="/admin" element={<RequireAuth><Admin/></RequireAuth>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to={hasToken ? '/' : '/login'} replace />} />
        </Routes>
      </main>
    </div>
  );
}
