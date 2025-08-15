/**
 * Minimal helper to send JSON requests with JWT automatically.
 * Looks for 'token' in localStorage (set on login).
 */
export function apiFetch(url, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    ...(options.headers || {}),
  };
  // Set JSON header if a body exists and caller didn't set content type
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return fetch(url, { ...options, headers });
}
