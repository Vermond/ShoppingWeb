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
  requestCurrentUser,
  requestLogout,
  requestRefresh,
  type AuthUser,
} from "../../repositories/auth.repository";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  user: AuthUser | null;
  status: AuthStatus;
  signIn: (user: AuthUser) => void;
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
      let restoredUser: AuthUser | null = null;

      try {
        restoredUser = await requestCurrentUser();
      } catch {
        restoredUser = null;
      }

      if (!restoredUser) {
        try {
          restoredUser = await requestRefresh();
        } catch {
          restoredUser = null;
        }
      }

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

  const signOut = useCallback(async () => {
    authActionStarted.current = true;
    await requestLogout();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo(
    () => ({ user, status, signIn, signOut }),
    [signIn, signOut, status, user],
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
