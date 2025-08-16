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
import './brand.override.css';

function useAuth() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) { if (alive) { setUser(null); setChecking(false); } return; }
        const res = await apiFetch('/api/auth/me');
        if (res.ok) {
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
  }, []);

  return { user, setUser, checking };
}

function RequireAuth({ children }) {
  const location = useLocation();
  const hasToken = !!(localStorage.getItem('token') || sessionStorage.getItem('token'));
  if (!hasToken) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

export default function App(){
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser, checking } = useAuth();
  const hasToken = !!(localStorage.getItem('token') || sessionStorage.getItem('token'));

  function logout(){
    try { localStorage.removeItem('token'); sessionStorage.removeItem('token'); } catch {}
    setUser(null);
    navigate('/login', { replace:true, state:{ from: location }});
  }

  const pill = ({ isActive }) => `pill${isActive ? ' active' : ''}`;
  const pillBtn = ({ isActive }) => `pill btn${isActive ? ' active' : ''}`;

  if (checking) return <div className="page"><div className="muted">Loading…</div></div>;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <NavLink to="/" className="brand-link">Dashboard</NavLink>
        </div>

        <nav className="menu">
          {hasToken && (
            <>
              {/* Restore pill-styled buttons exactly via className */}
              <NavLink to="/" end className={pillBtn}>Home</NavLink>
              <NavLink to="/clients" className={pillBtn}>Clients</NavLink>
              <NavLink to="/invoices" className={pillBtn}>Invoices</NavLink>
              <NavLink to="/payments" className={pillBtn}>Payments</NavLink>
              {/* Admin & Superadmin see Users */}
              {user && (user.role === 'admin' || user.role === 'superadmin') && (
                <NavLink to="/admin" className={pillBtn}>Users</NavLink>
              )}
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
            <div className="auth-user" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="muted">{user?.name ? `Hi, ${user.name}` : (user?.email || '')}</span>
              <button className="border" onClick={logout}>Log out</button>
            </div>
          )}
        </div>
      </header>

      <main className="main">
        <Routes>
          {/* Public */}
          <Route path="/login" element={hasToken ? <Navigate to="/" replace /> : <Login onLoggedIn={() => navigate('/', { replace:true })} />} />
          <Route path="/register" element={hasToken ? <Navigate to="/" replace /> : <Register onRegistered={() => navigate('/login', { replace:true })} />} />

          {/* Private */}
          <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/clients" element={<RequireAuth><Clients /></RequireAuth>} />
          {/* Support BOTH forms to avoid broken links */}
          <Route path="/clients/:id" element={<RequireAuth><ClientStatement /></RequireAuth>} />
          <Route path="/clients/:id/statement" element={<RequireAuth><ClientStatement /></RequireAuth>} />
          <Route path="/invoices" element={<RequireAuth><Invoices /></RequireAuth>} />
          <Route path="/invoices/:id" element={<RequireAuth><InvoiceDetails /></RequireAuth>} />
          <Route path="/payments" element={<RequireAuth><Payments /></RequireAuth>} />

          {/* Admin (user management UI) */}
          <Route path="/admin" element={<RequireAuth><Admin /></RequireAuth>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to={hasToken ? '/' : '/login'} replace />} />
        </Routes>
      </main>
    </div>
  );
}
