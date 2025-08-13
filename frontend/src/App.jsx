import React from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import Dashboard from './pages/Dashboard.jsx'
import Clients from './pages/Clients.jsx'
import Invoices from './pages/Invoices.jsx'
import InvoiceDetails from './pages/InvoiceDetails.jsx'

export default function App(){
  return (
    <div className="container">
      <div className="nav">
        <NavLink to="/" end className={({isActive}) => isActive ? 'active' : ''}>Dashboard</NavLink>
        <NavLink to="/clients" className={({isActive}) => isActive ? 'active' : ''}>Clients</NavLink>
        <NavLink to="/invoices" className={({isActive}) => isActive ? 'active' : ''}>Invoices</NavLink>
        <a href="/api/export/csv" className="btn" style={{marginLeft:'auto', padding:'8px 12px'}}>Export CSV</a>
      </div>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/invoices/:id" element={<InvoiceDetails />} />
      </Routes>
    </div>
  )
}
