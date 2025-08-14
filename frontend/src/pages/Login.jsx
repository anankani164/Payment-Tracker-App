import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, setToken, clearToken } from '../utils/api';

export default function Login(){
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function onSubmit(e){
    e.preventDefault();
    setError('');
    try{
      const r = await apiFetch('/api/auth/login', { method:'POST', body: JSON.stringify({email,password}) });
      const data = await r.json();
      if(!r.ok) throw new Error(data?.error || 'Login failed');
      setToken(data.token);
      navigate('/');
    }catch(err){ setError(err.message); }
  }

  function logout(){
    clearToken();
    navigate('/');
  }

  return (
    <div className="card" style={{maxWidth:420, margin:'40px auto'}}>
      <h2 style={{marginTop:0}}>Sign in</h2>
      <form onSubmit={onSubmit} style={{display:'grid', gap:10}}>
        <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required />
        <button className="btn">Login</button>
      </form>
      {error && <p style={{color:'crimson', marginTop:10}}>{error}</p>}
      <p className="muted" style={{marginTop:10}}>If this is a new install, an admin must create your account.</p>
      <button className="btn secondary" onClick={logout} style={{marginTop:8}}>Logout (clear token)</button>
    </div>
  );
}
