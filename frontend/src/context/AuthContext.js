import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const AuthContext = createContext(null);
import { API } from '../lib/api';

// Interceptor: zobrazit toast při 403 kvůli neověřenému e-mailu nebo zablokovanému účtu
axios.interceptors.response.use(
  (res) => res,
  (err) => {
    const detail = err.response?.data?.detail;
    if (err.response?.status === 403 && typeof detail === 'string') {
      if (detail.includes('ověřit') || detail.includes('zablokován')) toast.error(detail);
    }
    return Promise.reject(err);
  }
);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch { logout(); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    // CRITICAL: If returning from OAuth callback, skip the /me check.
    // GoogleCallback will exchange the session_id and establish the session first.
    if (window.location.hash?.includes('session_id=') || window.location.pathname === '/auth/google-callback' || window.location.pathname === '/auth/facebook-callback') {
      setLoading(false);
      return;
    }
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else { setLoading(false); }
  }, [token, fetchUser]);

  const login = async (tokenOrEmail, passwordOrUser) => {
    // Support both: login(email, password) and login(token, userObj) for Google auth
    if (typeof passwordOrUser === 'object' && passwordOrUser !== null) {
      const newToken = tokenOrEmail;
      const userData = passwordOrUser;
      localStorage.setItem('token', newToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      setToken(newToken);
      setUser(userData);
      return userData;
    }
    const response = await axios.post(`${API}/auth/login`, { email: tokenOrEmail, password: passwordOrUser });
    const { token: newToken, user: userData } = response.data;
    localStorage.setItem('token', newToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const register = async (userData) => {
    const response = await axios.post(`${API}/auth/register`, userData);
    const { token: newToken, user: newUser } = response.data;
    localStorage.setItem('token', newToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(newUser);
    return newUser;
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (updates) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && value !== null && key !== 'custom_avatar') params.append(key, value);
    }
    const response = await axios.put(`${API}/auth/profile?${params.toString()}`);
    setUser(response.data);
    return response.data;
  };

  const deleteAccount = async () => {
    await axios.delete(`${API}/auth/profile`);
    logout();
  };

  return (
    <AuthContext.Provider value={{
      user, token, loading, login, register, logout, updateProfile, deleteAccount,
      isAuthenticated: !!user, isAdmin: ['admin', 'superadmin'].includes((user?.role || '').toLowerCase()), isSuperAdmin: (user?.role || '').toLowerCase() === 'superadmin'
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
