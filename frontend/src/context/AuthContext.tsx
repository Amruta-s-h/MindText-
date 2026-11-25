import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User } from '../types/sentiment';
import {
  loginUser,
  registerUser,
  getCurrentUser,
  updateUserProfile,
  logoutUser,
  getStoredToken,
} from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: { full_name?: string; new_password?: string; current_password?: string }) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const userData = await getCurrentUser();
      setUser(userData);
    } catch {
      // Token expired or invalid
      logoutUser();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const res = await loginUser({ email, password });
    if (res.user) {
      setUser(res.user);
    } else {
      await refreshUser();
    }
  };

  const register = async (fullName: string, email: string, password: string, confirmPassword: string) => {
    const res = await registerUser({
      full_name: fullName,
      email,
      password,
      confirm_password: confirmPassword,
    });
    if (res.user) {
      setUser(res.user);
    } else {
      await refreshUser();
    }
  };

  const logout = () => {
    logoutUser();
    setUser(null);
  };

  const updateProfile = async (data: { full_name?: string; new_password?: string; current_password?: string }) => {
    const updated = await updateUserProfile(data);
    setUser(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateProfile,
        refreshUser,
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
