/**
 * src/utils/api.js
 * Central auth helpers + fetch wrapper.
 */
const TOKEN_KEY = 'token';
const USER_KEY = 'user';

/** Save JWT & user info */
export function setToken(token, user) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/** Read JWT ('' if none) */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

/** Read user object or null */
export function getUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); }
  catch { return null; }
}

/** Clear JWT & user */
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * Wrapper that attaches Authorization automatically and sets JSON header
 */
export function apiFetch(url, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };

  const isFormData = (typeof FormData !== 'undefined') && options.body instanceof FormData;
  if (options.body && !isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) headers['Authorization'] = `Bearer ${token}`;

  return fetch(url, { ...options, headers });
}
