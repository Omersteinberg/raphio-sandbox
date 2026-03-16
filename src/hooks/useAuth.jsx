import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { checkAuth, login as apiLogin, register as apiRegister, logout as apiLogout } from '../api/auth';
import { getBalance } from '../services/credits';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState(null);

  useEffect(() => {
    checkAuth().then((u) => {
      setUser(u);
      if (u) refreshCredits();
    }).finally(() => setLoading(false));
  }, []);

  const refreshCredits = useCallback(async () => {
    console.log("[useAuth] refreshCredits called");
    try {
      const data = await getBalance();
      console.log("[useAuth] getBalance returned:", JSON.stringify(data));
      console.log("[useAuth] setting credits to:", data?.credits);
      setCredits(data?.credits ?? null);
    } catch (err) {
      console.error('[useAuth] Failed to fetch credits:', err.message);
    }
  }, []);

  const value = {
    user,
    loading,
    credits,
    refreshCredits,
    login: async (username, password) => {
      const user = await apiLogin(username, password);
      setUser(user);
      refreshCredits();
      return user;
    },
    logout: () => {
      apiLogout();
      setUser(null);
      setCredits(null);
    },
    register: async (username, email, password) => {
      const user = await apiRegister(username, email, password);
      setUser(user);
      refreshCredits();
      return user;
    },
    updateUser: (updatedUser) => {
      setUser(updatedUser);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};