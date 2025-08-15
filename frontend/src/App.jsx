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
import { getToken, getUser, clearToken } from './utils/api';
import './ui.css';

export default function App(){
  const [token, setTokenState] = useState(getToken());
  const [user, setUser] = useState(getUser());
  const navigate = useNavigate();

  useEffect(()=>{
    const onStorage = ()=>{ setTokenState(getToken()); setUser(getUser()); };
    window.addEventListener('storage', onStorage);
    return ()=> window.removeEventListener('storage', onStorage);
  },[]);

  function logout(){
    clearToken();
    setTokenState('');
    setUser(null);
    navigate('/login');
  }

  const isAuthed = !!token;

  return (
    <div className="shell">
      <nav className="topnav">
        <div className="tabs">
          <NavLink to="/" end className={({isActive})=>`tab ${isActive?'active':''}`}>Dashboard</NavLink>
          <NavLink to="/clients" className={({isActive})=>`tab ${isActive?'active':''}`}>Clients</NavLink>
          <NavLink to="/invoices" className={({isActive})=>`tab ${isActive?'active':''}`}>Invoices</NavLink>
          <NavLink to="/payments" className={({isActive})=>`tab ${isActive?'active':''}`}>Payments</NavLink>
          <NavLink to="/admin" className={({isActive})=>`tab ${isActive?'active':''}`}>Admin</NavLink>
        </div>
        <div className="auth">
          {isAuthed ? (
            <>
              <span className="hello">Hi {user?.name || user?.email || 'User'}</span>
              <button className="btn small" onClick={logout}>Logout</button>
            </>
          ) : (
            <div className="auth-links">
              <NavLink to="/login" className="btn small outline">Login</NavLink>
              <NavLink to="/register" className="btn small secondary">Register</NavLink>
            </div>
          )}
        </div>
      </nav>

      <main className="container">
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
      </main>
    </div>
  );
}
