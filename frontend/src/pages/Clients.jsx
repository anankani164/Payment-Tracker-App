import React, { useEffect, useState } from 'react'
import api from '../api'

export default function Clients(){
  const [clients, setClients] = useState([])
  const [form, setForm] = useState({ name:'', email:'', phone:'', company:'', notes:'' })

  const load = () => api.get('/api/clients').then(r => setClients(r.data))
  useEffect(() => { load() }, [])

  const submit = async (e) => {
    e.preventDefault()
    if(!form.name) return
    await api.post('/api/clients', form)
    setForm({ name:'', email:'', phone:'', company:'', notes:'' })
    load()
  }

  return (
    <div className="grid grid-2">
      <div className="card">
        <div className="page-title">Add Client</div>
        <form onSubmit={submit} className="grid" style={{gap:12}}>
          <input placeholder="Name *" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} required />
          <input placeholder="Email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} />
          <input placeholder="Phone" value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})} />
          <input placeholder="Company" value={form.company} onChange={e=>setForm({...form, company:e.target.value})} />
          <textarea placeholder="Notes" rows={4} value={form.notes} onChange={e=>setForm({...form, notes:e.target.value})}></textarea>
          <button className="btn" type="submit">Save Client</button>
        </form>
      </div>
      <div className="card">
        <div className="page-title">Clients</div>
        <table>
          <thead><tr><th>Name</th><th>Company</th><th>Email</th><th>Phone</th></tr></thead>
          <tbody>
            {clients.map(c => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.company || '—'}</td>
                <td>{c.email || '—'}</td>
                <td>{c.phone || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
