import React, { useState } from 'react';
import { apiFetch } from '../utils/api';
import { setAnyToken } from '../utils/auth';
import logoUrl from '../assets/logo.png';

export default function Login(){
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  async function onLogin(e){
    e.preventDefault();
    const r = await apiFetch('/api/auth/login', { method:'POST', body: JSON.stringify({ email, password })});
    const d = await r.json();
    if(r.ok && d?.token){ setAnyToken(d.token); window.location.href='/'; }
    else alert(d?.error || 'Login failed');
  }
  return (
    <div className="center">
      <form className="panel narrow" onSubmit={onLogin}>
        <div className="panel-head">
          <img src={logoUrl} alt="logo" height="26" />
          <h2>Welcome back</h2>
        </div>
        <input className="pill" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="pill" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <div className="row">
          <button className="btn" type="submit">Login</button>
          <a className="btn ghost" href="/register">Register</a>
        </div>
      </form>
    </div>
  );
}
