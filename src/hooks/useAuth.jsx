import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import {
  checkAuth,
  login as apiLogin,
  loginWithGoogle as apiLoginWithGoogle,
  register as apiRegister,
  logout as apiLogout,
} from '../api/auth';
import { getBalance } from '../services/credits';
import {
  fetchSettings,
  saveAutoApprove,
  markAutoApproveIntroSeen as apiMarkIntroSeen,
  markIntroVideoSeen as apiMarkIntroVideoSeen,
  EMPTY_AUTO_APPROVE,
} from '../api/settings';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState(null);
  // The user's auto-approve toggles, loaded from the DB (single source of truth).
  // Defaults all-off so consumers never see null and get the normal manual flow
  // until the real values arrive.
  const [autoApprove, setAutoApproveState] = useState(EMPTY_AUTO_APPROVE);
  // Whether the user has already seen the one-time "approve everything" modal.
  const [autoApproveIntroSeen, setIntroSeenState] = useState(false);
  // Keys of the first-visit tutorial videos this user has already dismissed.
  const [introVideosSeen, setIntroVideosSeen] = useState([]);
  // Flips true after the first settings load resolves, so the first-run modal
  // gate never fires against not-yet-loaded state (which would nag returning users).
  const [settingsReady, setSettingsReady] = useState(false);

  useEffect(() => {
    checkAuth().then((u) => {
      setUser(u);
      if (u) {
        refreshCredits();
        refreshSettings();
      }
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

  const refreshSettings = useCallback(async () => {
    try {
      const s = await fetchSettings();
      setAutoApproveState(s.autoApprove);
      setIntroSeenState(s.autoApproveIntroSeen);
      setIntroVideosSeen(s.introVideosSeen);
    } catch (err) {
      console.error('[useAuth] Failed to fetch settings:', err.message);
    } finally {
      setSettingsReady(true);
    }
  }, []);

  // Persist changed toggles and update local state optimistically so the
  // Settings page reflects the change immediately.
  const updateAutoApprove = useCallback(async (partial) => {
    setAutoApproveState((prev) => ({ ...prev, ...partial }));
    try {
      const saved = await saveAutoApprove(partial);
      setAutoApproveState(saved);
    } catch (err) {
      console.error('[useAuth] Failed to save auto-approve settings:', err.message);
      // Re-sync from the server so the UI doesn't keep a value that didn't save.
      refreshSettings();
    }
  }, [refreshSettings]);

  // Record (optimistically) that the user has seen the one-time intro modal.
  const markAutoApproveIntroSeen = useCallback(() => {
    setIntroSeenState(true);
    apiMarkIntroSeen().catch((err) =>
      console.error('[useAuth] Failed to mark intro seen:', err.message)
    );
  }, []);

  // Optimistic: the local flip is what closes the modal and releases the tour.
  // A failed write only means the video may reappear on another device.
  const markIntroVideoSeen = useCallback((key) => {
    setIntroVideosSeen((prev) => (prev.includes(key) ? prev : [...prev, key]));
    apiMarkIntroVideoSeen(key).catch((err) =>
      console.error('[useAuth] Failed to mark intro video seen:', err.message)
    );
  }, []);

  const value = {
    user,
    loading,
    credits,
    isAdmin: !!user?.isAdmin,
    refreshCredits,
    autoApprove,
    updateAutoApprove,
    autoApproveIntroSeen,
    markAutoApproveIntroSeen,
    introVideosSeen,
    markIntroVideoSeen,
    settingsReady,
    login: async (username, password) => {
      const user = await apiLogin(username, password);
      setUser(user);
      refreshCredits();
      refreshSettings();
      return user;
    },
    googleLogin: async (credential) => {
      const user = await apiLoginWithGoogle(credential);
      setUser(user);
      refreshCredits();
      refreshSettings();
      return user;
    },
    logout: () => {
      apiLogout();
      setUser(null);
      setCredits(null);
      setAutoApproveState(EMPTY_AUTO_APPROVE);
      setIntroSeenState(false);
      setIntroVideosSeen([]);
      setSettingsReady(false);
    },
    register: async (username, email, password) => {
      const user = await apiRegister(username, email, password);
      setUser(user);
      refreshCredits();
      refreshSettings();
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
