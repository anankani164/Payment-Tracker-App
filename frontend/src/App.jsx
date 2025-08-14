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

export default function App(){
  const [token, setTokenState] = useState(getToken());
  const navigate = useNavigate();

  useEffect(()=>{
    const i = setInterval(()=> setTokenState(getToken()), 1000);
    return ()=> clearInterval(i);
  },[]);

  function logout(){
    clearToken();
    setTokenState(null);
    navigate('/login');
  }

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
          <button className="btn secondary" onClick={logout}>Logout</button>
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
