import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { adminApi } from "@/lib/adminApi";

interface AdminUser {
  id: string;
  username: string;
  role: string;
}

interface AdminAuthContextType {
  user: AdminUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (token) {
      adminApi.me()
        .then(res => setUser(res.user))
        .catch(() => { localStorage.removeItem("admin_token"); })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    const res = await adminApi.login(username, password);
    localStorage.setItem("admin_token", res.token);
    setUser(res.user);
  };

  const logout = async () => {
    try { await adminApi.logout(); } catch {}
    localStorage.removeItem("admin_token");
    setUser(null);
  };

  return (
    <AdminAuthContext.Provider value={{ user, isLoading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
