import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
  isAuthenticated: false,
  isAdmin: false,
  loading: true,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('intellinet_token');
    const savedUser = localStorage.getItem('intellinet_user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        // Verify with /api/auth/me
        api.get('/auth/me')
          .then((res) => {
            setUser(res.data);
            localStorage.setItem('intellinet_user', JSON.stringify(res.data));
          })
          .catch(() => {
            // Token expired or invalid
            localStorage.removeItem('intellinet_token');
            localStorage.removeItem('intellinet_user');
            setToken(null);
            setUser(null);
          })
          .finally(() => setLoading(false));
        return;
      } catch (e) {
        localStorage.removeItem('intellinet_token');
        localStorage.removeItem('intellinet_user');
      }
    }
    setLoading(false);
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('intellinet_token', newToken);
    localStorage.setItem('intellinet_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    if (token) {
      api.post('/auth/logout').catch(() => {});
    }
    localStorage.removeItem('intellinet_token');
    localStorage.removeItem('intellinet_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token && !!user,
        isAdmin: user?.role === 'ADMIN',
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
