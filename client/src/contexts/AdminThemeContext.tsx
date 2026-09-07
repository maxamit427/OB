import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type AdminTheme = "dark" | "light";

interface AdminThemeContextValue {
  theme: AdminTheme;
  toggleTheme: () => void;
  isDark: boolean;
  colors: typeof DARK_COLORS;
}

const DARK_COLORS = {
  bg:           "#09090f",
  sidebar:      "#0c0c15",
  topbar:       "rgba(12,12,21,0.95)",
  card:         "#111118",
  card2:        "#131320",
  border:       "rgba(255,255,255,0.06)",
  border2:      "rgba(255,255,255,0.07)",
  input:        "rgba(255,255,255,0.04)",
  inputBorder:  "rgba(255,255,255,0.09)",
  hover:        "rgba(255,255,255,0.04)",
  text:         "#f0f0f8",
  text2:        "#c8c8e0",
  muted:        "#6e6e8e",
  dim:          "#4a4a6a",
  dimmer:       "#3d3d5e",
  dimmest:      "#2e2e4e",
  navActive:    "rgba(6,182,212,0.1)",
  navSection:   "#2a2a42",
};

const LIGHT_COLORS = {
  bg:           "#f1f5f9",
  sidebar:      "#ffffff",
  topbar:       "rgba(255,255,255,0.97)",
  card:         "#ffffff",
  card2:        "#f8fafc",
  border:       "rgba(0,0,0,0.07)",
  border2:      "rgba(0,0,0,0.09)",
  input:        "rgba(0,0,0,0.03)",
  inputBorder:  "rgba(0,0,0,0.12)",
  hover:        "rgba(0,0,0,0.04)",
  text:         "#0f172a",
  text2:        "#1e293b",
  muted:        "#64748b",
  dim:          "#94a3b8",
  dimmer:       "#b0bec5",
  dimmest:      "#cbd5e1",
  navActive:    "rgba(6,182,212,0.08)",
  navSection:   "#94a3b8",
};

const AdminThemeContext = createContext<AdminThemeContextValue | null>(null);

export function AdminThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<AdminTheme>(() => {
    try {
      return (localStorage.getItem("admin_theme") as AdminTheme) || "dark";
    } catch {
      return "dark";
    }
  });

  const toggleTheme = () => {
    setTheme(t => {
      const next = t === "dark" ? "light" : "dark";
      try { localStorage.setItem("admin_theme", next); } catch {}
      return next;
    });
  };

  const isDark = theme === "dark";
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  useEffect(() => {
    const root = document.getElementById("admin-root");
    if (root) root.setAttribute("data-admin-theme", theme);
  }, [theme]);

  return (
    <AdminThemeContext.Provider value={{ theme, toggleTheme, isDark, colors }}>
      {children}
    </AdminThemeContext.Provider>
  );
}

export function useAdminTheme() {
  const ctx = useContext(AdminThemeContext);
  if (!ctx) throw new Error("useAdminTheme must be used inside AdminThemeProvider");
  return ctx;
}

export { DARK_COLORS, LIGHT_COLORS };
