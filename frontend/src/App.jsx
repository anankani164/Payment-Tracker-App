import React from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Clients from './pages/Clients.jsx';
import Invoices from './pages/Invoices.jsx';
import InvoiceDetails from './pages/InvoiceDetails.jsx';
import Payments from './pages/Payments.jsx';
import Admin from './pages/Admin.jsx';

export default function App(){
  return (
    <div className="container">
      <nav className="nav">
        <NavLink to="/" end className={({isActive})=> isActive?'active':''}>Dashboard</NavLink>
        <NavLink to="/clients" className={({isActive})=> isActive?'active':''}>Clients</NavLink>
        <NavLink to="/invoices" className={({isActive})=> isActive?'active':''}>Invoices</NavLink>
        <NavLink to="/payments" className={({isActive})=> isActive?'active':''}>Payments</NavLink>
        <NavLink to="/admin" className={({isActive})=> isActive?'active':''}>Admin</NavLink>
      </nav>
      <Routes>
        <Route path="/" element={<Dashboard/>} />
        <Route path="/clients" element={<Clients/>} />
        <Route path="/invoices" element={<Invoices/>} />
        <Route path="/invoices/:id" element={<InvoiceDetails/>} />
        <Route path="/payments" element={<Payments/>} />
        <Route path="/admin" element={<Admin/>} />
      </Routes>
    </div>
  );
}
