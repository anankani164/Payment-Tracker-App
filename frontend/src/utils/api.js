export function setToken(t){ localStorage.setItem('token', t); }
export function getToken(){ return localStorage.getItem('token'); }
export function clearToken(){ localStorage.removeItem('token'); }

export async function apiFetch(url, options = {}){
  const opts = { ...options, headers: { ...(options.headers||{}) } };
  if (opts.body && !opts.headers['Content-Type']) opts.headers['Content-Type'] = 'application/json';
  const t = getToken();
  if (t) opts.headers['Authorization'] = `Bearer ${t}`;
  const res = await fetch(url, opts);
  if (res.status === 401) throw new Error('Unauthorized (please login)');
  return res;
}
