import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, UserRole } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: UserRole) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  isAdminOrModerator: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to decode JWT token payload without external library
function parseJwtPayload(token: string): { userId: string; role: UserRole } | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (storedToken) {
        setToken(storedToken);
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        } else {
          const decoded = parseJwtPayload(storedToken);
          if (decoded) {
            setUser({
              userId: decoded.userId,
              email: '',
              role: decoded.role || 'user'
            });
          }
        }
      }
    } catch (err) {
      console.error('Error loading stored auth state:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const data = await api.auth.login(email, password);
    const decoded = parseJwtPayload(data.token);
    const resolvedRole = data.role || decoded?.role || 'user';

    const currentUser: User = {
      userId: data.userId || decoded?.userId || '',
      email,
      role: resolvedRole
    };

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(currentUser));

    setToken(data.token);
    setUser(currentUser);
  };

  const register = async (name: string, email: string, password: string, role?: UserRole) => {
    const data = await api.auth.register(name, email, password, role);
    const decoded = parseJwtPayload(data.token);
    const resolvedRole = data.role || decoded?.role || role || 'user';

    const currentUser: User = {
      userId: data.userId || decoded?.userId || '',
      name,
      email,
      role: resolvedRole
    };

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(currentUser));

    setToken(data.token);
    setUser(currentUser);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const isAuthenticated = !!token && !!user;
  const isAdmin = user?.role === 'admin';
  const isModerator = user?.role === 'moderator';
  const isAdminOrModerator = isAdmin || isModerator;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        isAuthenticated,
        isAdmin,
        isModerator,
        isAdminOrModerator
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
