import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getToken } from './utils/api';

/**
 * Route guard that ensures a token exists before rendering protected pages.
 * If not authenticated, redirects to /login (preserving attempted location).
 */
export default function RequireAuth({ children }){
  const token = getToken();
  const location = useLocation();
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return children;
}
