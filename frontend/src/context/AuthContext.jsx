import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';
import { disconnectSocket } from '../utils/socket';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('nlpchat_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const data = await api.get('/auth/me');
        setUser(data.user);
      } catch (err) {
        localStorage.removeItem('nlpchat_token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [token]);

  const phoneLogin = async (phone, displayName) => {
    const data = await api.post('/auth/phone-login', { phone, displayName });
    localStorage.setItem('nlpchat_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const checkPhone = async (phone) => {
    return await api.post('/auth/phone-check', { phone });
  };

  const login = async (phone, password) => {
    const data = await api.post('/auth/login', { phone, password });
    localStorage.setItem('nlpchat_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (username, phone, password, display_name) => {
    const data = await api.post('/auth/register', { username, phone, password, display_name });
    localStorage.setItem('nlpchat_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const demoLogin = async (username = 'alice') => {
    const data = await api.post('/auth/demo-login', { username });
    localStorage.setItem('nlpchat_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('nlpchat_token');
    disconnectSocket();
    setToken(null);
    setUser(null);
  };

  const updateUser = (updated) => {
    setUser(prev => ({ ...prev, ...updated }));
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, phoneLogin, checkPhone, register, demoLogin, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
