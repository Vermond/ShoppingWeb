"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  requestAuthenticatedUser,
  requestLogout,
  type AuthUser,
} from "../../repositories/auth.repository";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  user: AuthUser | null;
  status: AuthStatus;
  signIn: (user: AuthUser) => void;
  updateUser: (user: AuthUser) => void;
  clearSession: () => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const authActionStarted = useRef(false);

  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      const restoredUser = await requestAuthenticatedUser();

      if (!active || authActionStarted.current) {
        return;
      }

      setUser(restoredUser);
      setStatus(restoredUser ? "authenticated" : "unauthenticated");
    };

    void restoreSession();

    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback((nextUser: AuthUser) => {
    authActionStarted.current = true;
    setUser(nextUser);
    setStatus("authenticated");
  }, []);

  const updateUser = useCallback((nextUser: AuthUser) => {
    authActionStarted.current = true;
    setUser(nextUser);
    setStatus("authenticated");
  }, []);

  const clearSession = useCallback(() => {
    authActionStarted.current = true;
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const signOut = useCallback(async () => {
    authActionStarted.current = true;
    await requestLogout();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo(
    () => ({ user, status, signIn, updateUser, clearSession, signOut }),
    [clearSession, signIn, signOut, status, updateUser, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
