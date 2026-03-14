import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { API } from '../config/api';

const TOKEN_KEY = 'bloom_token';

export interface User {
  id: string;
  email: string;
  username: string;
  role?: string;
  avatar?: string;
  [key: string]: unknown;
}

export interface RegisterData {
  email: string;
  password: string;
  username: string;
  pronouns?: string;
  avatar?: string;
  location?: string;
  district?: string;
  phone?: string;
  bio?: string;
  secret_code?: string;
  custom_avatar?: string;
  turnstile_token?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: RegisterData) => Promise<User>;
  loginWithToken: (token: string, userData: User) => void;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => Promise<User>;
  refreshUser: () => Promise<User | null>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const persistToken = useCallback(async (t: string | null) => {
    if (t) {
      await SecureStore.setItemAsync(TOKEN_KEY, t);
      axios.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      delete axios.defaults.headers.common['Authorization'];
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const stored = await SecureStore.getItemAsync(TOKEN_KEY);
        if (stored) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${stored}`;
          const response = await axios.get(`${API}/auth/me`);
          setUser(response.data);
          setToken(stored);
        }
      } catch {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        delete axios.defaults.headers.common['Authorization'];
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    const response = await axios.post(`${API}/auth/login`, { email, password });
    const { token: newToken, user: userData } = response.data;
    await persistToken(newToken);
    setToken(newToken);
    setUser(userData);
    return userData;
  }, [persistToken]);

  const register = useCallback(async (data: RegisterData): Promise<User> => {
    const payload: Record<string, unknown> = {
      email: data.email,
      password: data.password,
      username: data.username,
      pronouns: data.pronouns || 'ona/její',
      avatar: data.avatar || 'fem-pink',
      location: data.location || '',
      district: data.district || '',
      phone: data.phone || '',
      bio: data.bio || '',
      secret_code: data.secret_code || '',
      custom_avatar: data.custom_avatar,
      website: '',
    };
    if (data.turnstile_token) {
      payload.turnstile_token = data.turnstile_token;
    }
    const response = await axios.post(`${API}/auth/register`, payload);
    const { token: newToken, user: userData } = response.data;
    await persistToken(newToken);
    setToken(newToken);
    setUser(userData);
    return userData;
  }, [persistToken]);

  const loginWithToken = useCallback((newToken: string, userData: User) => {
    persistToken(newToken);
    setToken(newToken);
    setUser(userData);
  }, [persistToken]);

  const logout = useCallback(async () => {
    await persistToken(null);
    setToken(null);
    setUser(null);
  }, [persistToken]);

  const updateProfile = useCallback(async (updates: Partial<User>): Promise<User> => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(updates)) {
      if (key === 'custom_avatar') continue;
      if (value !== undefined) {
        params.append(key, value === null ? '' : String(value));
      }
    }
    const response = await axios.put(`${API}/auth/profile?${params.toString()}`);
    setUser(response.data);
    return response.data;
  }, []);

  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
      return response.data;
    } catch {
      return null;
    }
  }, []);

  const deleteAccount = useCallback(async () => {
    await axios.delete(`${API}/auth/profile`);
    await persistToken(null);
    setToken(null);
    setUser(null);
  }, [persistToken]);

  const value: AuthContextType = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin' || user?.role === 'superadmin',
    login,
    register,
    loginWithToken,
    logout,
    updateProfile,
    refreshUser,
    deleteAccount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
