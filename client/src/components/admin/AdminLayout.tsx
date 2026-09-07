import { ReactNode, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { AdminThemeProvider, useAdminTheme } from "@/contexts/AdminThemeContext";
import { useAdminWS, type WSMessage } from "@/hooks/useAdminWS";
import { useToast } from "@/hooks/use-toast";

const pageTitles: Record<string, string> = {
  "/admin/dashboard":     "Dashboard",
  "/admin/messages":      "Messages",
  "/admin/portfolio":     "Portfolio",
  "/admin/team":          "Team",
  "/admin/categories":    "Categories",
  "/admin/users":         "Account",
  "/admin/security":      "Security",
  "/admin/settings":      "Settings",
  "/admin/editor":        "Image Editor",
  "/admin/pending-users": "Pending Users",
};

function AdminLayoutInner({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAdminAuth();
  const [location, navigate] = useLocation();
  const { colors, theme, isDark } = useAdminTheme();
  const { toast } = useToast();

  const handleWsNotification = useCallback((msg: WSMessage) => {
    if (msg.type === "new_order") {
      const d = msg.data ?? {};
      toast({
        title: "🛒 New Order Received!",
        description: `${d.serviceTitle ?? "A service"} — $${d.totalPrice ?? "?"} from ${d.userName ?? d.userEmail ?? "a user"}`,
        duration: 8000,
      });
    } else if (msg.type === "signup_request") {
      toast({
        title: "👤 New Admin Signup Request",
        description: "Someone requested admin access. Review in Pending Users.",
        duration: 6000,
      });
    }
  }, [toast]);

  useAdminWS(handleWsNotification);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate("/admin/login");
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    const root = document.getElementById("admin-root");
    if (root) root.setAttribute("data-admin-theme", theme);
  }, [theme]);

  if (isLoading) {
    return (
      <div
        id="admin-root"
        data-admin-theme={theme}
        className="min-h-screen flex items-center justify-center"
        style={{ background: colors.bg }}
      >
        <div className="flex flex-col items-center gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-10 h-10 rounded-full border-2"
            style={{ borderColor: "rgba(6,182,212,0.15)", borderTopColor: "#06b6d4" }}
          />
          <p className="text-xs tracking-widest uppercase" style={{ color: colors.muted, fontFamily: "'Inter',sans-serif" }}>
            Authenticating
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const title = pageTitles[location] || "Admin";

  return (
    <div
      id="admin-root"
      data-admin-theme={theme}
      className="flex h-screen overflow-hidden"
      style={{ background: colors.bg, fontFamily: "'Inter', sans-serif" }}
    >
      <AdminSidebar />

      <div className="flex-1 flex flex-col min-w-0 relative overflow-hidden">
        {/* ── Ambient blobs (CSS animation — compositor thread, no JS overhead) */}
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
          <div style={{
            position: "absolute", top: "-10%", right: "0%",
            width: 580, height: 580, borderRadius: "50%",
            background: isDark
              ? "radial-gradient(circle, rgba(6,182,212,0.05) 0%, transparent 65%)"
              : "radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 65%)",
            filter: "blur(72px)",
            willChange: "transform",
            animation: "adminBlob1 28s ease-in-out infinite",
          }} />
          <div style={{
            position: "absolute", bottom: "-5%", left: "-5%",
            width: 480, height: 480, borderRadius: "50%",
            background: isDark
              ? "radial-gradient(circle, rgba(139,92,246,0.045) 0%, transparent 65%)"
              : "radial-gradient(circle, rgba(139,92,246,0.065) 0%, transparent 65%)",
            filter: "blur(72px)",
            willChange: "transform",
            animation: "adminBlob2 34s ease-in-out infinite 8s",
          }} />
          <div style={{
            position: "absolute", top: "45%", right: "35%",
            width: 300, height: 300, borderRadius: "50%",
            background: isDark
              ? "radial-gradient(circle, rgba(16,185,129,0.03) 0%, transparent 65%)"
              : "radial-gradient(circle, rgba(16,185,129,0.045) 0%, transparent 65%)",
            filter: "blur(56px)",
            willChange: "transform",
            animation: "adminBlob3 22s ease-in-out infinite 4s",
          }} />
        </div>

        {/* ── Quiet surface texture: visual depth without a moving HUD layer */}
        <div className="admin-surface-effects" aria-hidden="true">
          <div className="admin-vignette" />
        </div>

        {/* ── Content ────────────────────────────────────────────────── */}
        <div className="relative flex-1 flex flex-col min-w-0 overflow-hidden" style={{ zIndex: 1 }}>
          <AdminTopbar title={title} />
          <motion.main
            key={location}
            initial={{ opacity: 0, y: 12, scale: 0.994 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 overflow-y-auto overflow-x-hidden"
            style={{ padding: "24px" }}
          >
            {children}
          </motion.main>
        </div>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminThemeProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </AdminThemeProvider>
  );
}
