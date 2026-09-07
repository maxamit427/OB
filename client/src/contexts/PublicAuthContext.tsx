import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { publicAuthApi } from "@/lib/publicAuthApi";

export interface PublicUserProfile {
  id:               string;
  name:             string;
  username:         string;
  email:            string;
  role:             string;
  isEmailVerified:  boolean;
  profileImageUrl?: string;
  createdAt?:       string;
}

interface PublicAuthCtx {
  user:        PublicUserProfile | null;
  token:       string | null;
  isLoading:   boolean;
  isLoggedIn:  boolean;
  login:       (email: string, password: string) => Promise<{ success: boolean; message: string; requiresVerification?: boolean; email?: string }>;
  logout:      () => void;
  setAuthData: (token: string, user: PublicUserProfile) => void;
}

const Ctx = createContext<PublicAuthCtx | null>(null);

const TOKEN_KEY = "public_auth_token";

export function PublicAuthProvider({ children }: { children: ReactNode }) {
  const [user,      setUser]      = useState<PublicUserProfile | null>(null);
  const [token,     setToken]     = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Bootstrap: restore session from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (!saved) { setIsLoading(false); return; }
    publicAuthApi.me(saved)
      .then(res => {
        if (res.success && res.user) {
          setToken(saved);
          setUser(res.user);
        } else {
          localStorage.removeItem(TOKEN_KEY);
        }
      })
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setIsLoading(false));
  }, []);

  const setAuthData = useCallback((newToken: string, newUser: PublicUserProfile) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await publicAuthApi.login(email, password);
    if (res.success && res.token && res.user) {
      setAuthData(res.token, res.user);
    }
    return {
      success:              res.success,
      message:              res.message,
      requiresVerification: res.requiresVerification,
      email:                res.email,
    };
  }, [setAuthData]);

  const logout = useCallback(() => {
    publicAuthApi.logout().catch(() => {});
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <Ctx.Provider value={{
      user, token, isLoading,
      isLoggedIn: !!user,
      login, logout, setAuthData,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function usePublicAuth(): PublicAuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePublicAuth must be used inside PublicAuthProvider");
  return ctx;
}
