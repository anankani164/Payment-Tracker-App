import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import logoUrl from '../assets/logo.png';

export default function Login(){
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function submit(e){
    e.preventDefault();
    setLoading(true); setError('');
    try{
      const r = await fetch('/api/auth/login', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ email, password })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || 'Login failed');
      localStorage.setItem('token', d.token); // generic token key
      navigate('/');
    }catch(err){
      setError(err.message || 'Login failed');
    }finally{
      setLoading(false);
    }
  }

  return (
    <div className="auth-card card">
      <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:12}}>
        <img src={logoUrl} alt="Logo" style={{height:28}} />
        <h1 className="auth-title" style={{margin:0}}>Welcome back</h1>
      </div>
      {error && <div className="muted" style={{color:'#b91c1c', marginBottom:10}}>Error: {error}</div>}
      <form onSubmit={submit} style={{display:'grid', gap:10}}>
        <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required />
        <div className="auth-actions">
          <button className="btn" disabled={loading}>{loading?'Signing in…':'Login'}</button>
          <Link className="btn secondary" to="/register">Register</Link>
        </div>
      </form>
    </div>
  );
}
