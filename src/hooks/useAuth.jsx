import { useState, useEffect, createContext, useContext } from 'react';
import { checkAuth, login as apiLogin, register as apiRegister, logout as apiLogout } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth().then(setUser).finally(() => setLoading(false));
  }, []);

  const value = {
    user,
    loading,
    login: async (username, password) => {
      const user = await apiLogin(username, password);
      setUser(user);
      return user;
    },
    logout: () => {
      apiLogout();
      setUser(null);
    },
    register: async (username, email, password) => {
      const user = await apiRegister(username, email, password);
      setUser(user);
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