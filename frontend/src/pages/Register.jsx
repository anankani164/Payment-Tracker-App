import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import logoUrl from '../assets/logo.png';

export default function Register(){
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function submit(e){
    e.preventDefault();
    setLoading(true); setError('');
    try{
      const r = await fetch('/api/auth/register', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ name, email, password, role:'admin' })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || 'Register failed');
      // Optional: auto login? For now, go to login.
      navigate('/login');
    }catch(err){
      setError(err.message || 'Register failed');
    }finally{
      setLoading(false);
    }
  }

  return (
    <div className="auth-card card">
      <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:12}}>
        <img src={logoUrl} alt="Logo" style={{height:28}} />
        <h1 className="auth-title" style={{margin:0}}>Create account</h1>
      </div>
      {error && <div className="muted" style={{color:'#b91c1c', marginBottom:10}}>Error: {error}</div>}
      <form onSubmit={submit} style={{display:'grid', gap:10}}>
        <input placeholder="Name" value={name} onChange={e=>setName(e.target.value)} required />
        <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required />
        <div className="auth-actions">
          <button className="btn" disabled={loading}>{loading?'Creating…':'Register'}</button>
          <Link className="btn secondary" to="/login">Back to Login</Link>
        </div>
      </form>
    </div>
  );
}
