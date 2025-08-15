/**
 * Auth helpers + fetch wrapper used across the app.
 * Ensures JWT is sent on API calls and provides token storage utilities.
 */

const TOKEN_KEY = 'token';

/** Save JWT to localStorage */
export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
}

/** Read JWT from localStorage ('' if none) */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

/** Remove JWT from localStorage */
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * apiFetch(url, { method, headers, body })
 * - Automatically attaches Authorization: Bearer <token> if present
 * - Sets Content-Type: application/json when a non-FormData body is provided and header not already set
 */
export function apiFetch(url, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };

  // Set JSON header if needed
  const isFormData = (typeof FormData !== 'undefined') && options.body instanceof FormData;
  if (options.body && !isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(url, { ...options, headers });
}
