import React, { useEffect, useState } from 'react';
import { NavLink, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';

// PAGES (keep your existing ones)
import Dashboard from './pages/Dashboard.jsx';
import Clients from './pages/Clients.jsx';
import Invoices from './pages/Invoices.jsx';
import InvoiceDetails from './pages/InvoiceDetails.jsx';
import Payments from './pages/Payments.jsx';
import Admin from './pages/Admin.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';

// NEW: client statement (detail) page
import ClientStatement from './pages/ClientStatement.jsx';

import { apiFetch } from './utils/api';

// keep your styles exactly
import './brand.css';
import './brand.override.css';

// helpers to match your previous auth behavior
function getAnyToken(){
  return localStorage.getItem('token') || sessionStorage.getItem('token') || '';
}
function clearAnyToken(){
  try { localStorage.removeItem('token'); } catch {}
  try { sessionStorage.removeItem('token'); } catch {}
}

function RequireAuth({ children }){
  const location = useLocation();
  const has = !!getAnyToken();
  if (!has) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

export default function App(){
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const hasToken = !!getAnyToken();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!hasToken){ if (alive) setChecking(false); return; }
        const res = await apiFetch('/api/auth/me');
        if (res.ok){
          const data = await res.json();
          if (alive) setUser(data.user || null);
        } else {
          if (alive) setUser(null);
        }
      } catch {
        if (alive) setUser(null);
      } finally {
        if (alive) setChecking(false);
      }
    })();
    return () => { alive = false; };
  }, [hasToken]);

  function logout(){
    clearAnyToken();
    setUser(null);
    navigate('/login', { replace:true, state:{ from: location } });
  }

  // Keep UI minimal while auth state loads
  if (checking){
    return <div className="page"><div className="muted">Loading…</div></div>;
  }

  // utility to keep your "pill" look active
  const pill = ({ isActive }) => `pill${isActive ? ' active' : ''}`;
  const pillBtn = ({ isActive }) => `pill btn${isActive ? ' active' : ''}`;

  return (
    <div className="app">
      {/* Top bar exactly like your previous UI */}
      <header className="topbar">
        <div className="brand">
          <span className="brand-logo" />
          <span className="brand-text">Payment Tracker</span>
        </div>

        <nav className="menu">
          {hasToken && (
            <>
              <NavLink end to="/" className={pillBtn}>Dashboard</NavLink>
              <NavLink to="/clients" className={pillBtn}>Clients</NavLink>
              <NavLink to="/invoices" className={pillBtn}>Invoices</NavLink>
              <NavLink to="/payments" className={pillBtn}>Payments</NavLink>
              <NavLink to="/admin" className={pillBtn}>Admin</NavLink>
            </>
          )}
        </nav>

        <div className="authbox">
          {!hasToken ? (
            <div className="auth-actions">
              <NavLink to="/login" className={pill}>Login</NavLink>
              <NavLink to="/register" className={pill}>Register</NavLink>
            </div>
          ) : (
            <button className="pill btn danger" onClick={logout}>Logout</button>
          )}
        </div>
      </header>

      <main className="main">
        <Routes>
          {/* Public routes only */}
          <Route path="/login" element={hasToken ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/register" element={hasToken ? <Navigate to="/" replace /> : <Register />} />

          {/* Private routes */}
          <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/clients" element={<RequireAuth><Clients /></RequireAuth>} />
          {/* IMPORTANT: these two lines make client summary work */}
          <Route path="/clients/:id" element={<RequireAuth><ClientStatement /></RequireAuth>} />
          <Route path="/clients/:id/statement" element={<RequireAuth><ClientStatement /></RequireAuth>} />
          <Route path="/invoices" element={<RequireAuth><Invoices /></RequireAuth>} />
          <Route path="/invoices/:id" element={<RequireAuth><InvoiceDetails /></RequireAuth>} />
          <Route path="/payments" element={<RequireAuth><Payments /></RequireAuth>} />
          <Route path="/admin" element={<RequireAuth><Admin /></RequireAuth>} />

          <Route path="*" element={<Navigate to={hasToken ? '/' : '/login'} replace />} />
        </Routes>
      </main>
    </div>
  );
}
