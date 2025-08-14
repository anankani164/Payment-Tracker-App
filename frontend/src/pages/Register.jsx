import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import { setToken } from '../utils/api';

export default function Register(){
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function onSubmit(e){
    e.preventDefault();
    setError('');
    try{
      const r = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, name })
      });
      const data = await r.json();
      if(!r.ok) throw new Error(data?.error || 'Registration failed');
      // Save token and go to dashboard
      setToken(data.token);
      navigate('/');
    }catch(err){
      setError(err.message);
    }
  }

  return (
    <div className="card" style={{maxWidth:420, margin:'40px auto'}}>
      <h2 style={{marginTop:0}}>Create your account</h2>
      <p className="muted" style={{marginTop:-6, marginBottom:12}}>The first account becomes <b>admin</b> automatically.</p>
      <form onSubmit={onSubmit} style={{display:'grid', gap:10}}>
        <input type="text" placeholder="Name" value={name} onChange={e=>setName(e.target.value)} />
        <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required />
        <button className="btn">Register</button>
      </form>
      {error && <p style={{color:'crimson', marginTop:10}}>{error}</p>}
      <p className="muted" style={{marginTop:10}}>Already have an account? <a href="/login">Sign in</a></p>
    </div>
  );
}
