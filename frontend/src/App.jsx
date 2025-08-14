import React, { useEffect, useState } from 'react';
import { NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Clients from './pages/Clients.jsx';
import Invoices from './pages/Invoices.jsx';
import InvoiceDetails from './pages/InvoiceDetails.jsx';
import Payments from './pages/Payments.jsx';
import Admin from './pages/Admin.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import { getToken, clearToken } from './utils/api';
import { apiFetch } from './utils/api';

export default function App(){
  const [token, setTokenState] = useState(getToken());
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // Poll token presence so UI reflects login/logout from other tabs
  useEffect(()=>{
    const i = setInterval(()=> setTokenState(getToken()), 1000);
    return ()=> clearInterval(i);
  },[]);

  // Whenever token exists, fetch /me to get role for badge
  useEffect(()=>{
    let cancelled = false;
    async function fetchMe(){
      if (!getToken()) { setUser(null); return; }
      try{
        const r = await apiFetch('/api/auth/me');
        const d = await r.json();
        if (!cancelled) setUser(d?.user || null);
      }catch{
        if (!cancelled) setUser(null);
      }
    }
    fetchMe();
    return ()=>{ cancelled = true; };
  }, [token]);

  function logout(){
    clearToken();
    setUser(null);
    setTokenState(null);
    navigate('/login');
  }

  const badgeStyle = {
    padding: '2px 8px',
    borderRadius: 999,
    fontSize: 12,
    background: '#eef2ff',
    color: '#2d47ff',
    border: '1px solid #dfe3f6',
    marginLeft: 8
  };

  return (
    <div className="container">
      <nav className="nav" style={{display:'flex', gap:12, padding:'12px 0', alignItems:'center', flexWrap:'wrap'}}>
        <NavLink to="/" end>Dashboard</NavLink>
        <NavLink to="/clients">Clients</NavLink>
        <NavLink to="/invoices">Invoices</NavLink>
        <NavLink to="/payments">Payments</NavLink>
        <NavLink to="/admin">Admin</NavLink>
        <span style={{marginLeft:'auto'}} />
        {!token ? (
          <>
            <NavLink to="/login">Login</NavLink>
            <NavLink to="/register">Register</NavLink>
          </>
        ) : (
          <>
            {user && <span title={user.email} style={badgeStyle}>{user.role}</span>}
            <button className="btn secondary" onClick={logout}>Logout</button>
          </>
        )}
      </nav>

      <Routes>
        <Route path="/" element={<Dashboard/>} />
        <Route path="/clients" element={<Clients/>} />
        <Route path="/invoices" element={<Invoices/>} />
        <Route path="/invoices/:id" element={<InvoiceDetails/>} />
        <Route path="/payments" element={<Payments/>} />
        <Route path="/admin" element={<Admin/>} />
        <Route path="/login" element={<Login/>} />
        <Route path="/register" element={<Register/>} />
      </Routes>
    </div>
  );
}
