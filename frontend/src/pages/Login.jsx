import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, setToken, clearToken } from '../utils/api';

export default function Login(){
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e){
    e.preventDefault();
    setLoading(true);
    try{
      const res = await apiFetch('/api/auth/login', {
        method:'POST',
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if(!res.ok || !data?.token){
        throw new Error(data?.error || 'Login failed');
      }
      // Persist token + user so other pages (Clients) can send Authorization header
      setToken(data.token, data.user);
      navigate('/');
    }catch(err){
      alert(err.message || 'Login failed');
      clearToken();
    }finally{
      setLoading(false);
    }
  }

  return (
    <div style={{maxWidth:380, margin:'40px auto'}}>
      <h1 className="page-title">Login</h1>
      <div className="card">
        <form onSubmit={submit}>
          <div style={{display:'grid', gap:12}}>
            <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required />
            <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required />
          </div>
          <div style={{display:'flex', gap:8, justifyContent:'flex-end', marginTop:12}}>
            <button type="submit" className="btn" disabled={loading}>{loading?'Signing in…':'Login'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
