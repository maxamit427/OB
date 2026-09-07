import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, Search, X, ExternalLink, ShieldCheck, Sun, Moon, RotateCcw,
  MessageSquare, ShoppingBag, UserPlus, CheckCheck,
} from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useAdminTheme } from "@/contexts/AdminThemeContext";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { adminApi } from "@/lib/adminApi";

function IconBtn({
  onClick,
  title,
  children,
  colors,
  badgeCount,
}: {
  onClick?: () => void;
  title?: string;
  children: React.ReactNode;
  colors: any;
  badgeCount?: number;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.88 }}
      onClick={onClick}
      title={title}
      className="relative flex items-center justify-center rounded-lg flex-shrink-0"
      style={{
        width: 32, height: 32,
        background: "transparent",
        border: "1px solid transparent",
        color: colors.dim,
        cursor: "pointer",
        transition: "background 0.15s, color 0.15s, border-color 0.15s",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background    = colors.hover;
        (e.currentTarget as HTMLElement).style.color         = colors.text;
        (e.currentTarget as HTMLElement).style.borderColor   = colors.border;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background    = "transparent";
        (e.currentTarget as HTMLElement).style.color         = colors.dim;
        (e.currentTarget as HTMLElement).style.borderColor   = "transparent";
      }}
    >
      {children}
      {badgeCount != null && badgeCount > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full text-white flex items-center justify-center pointer-events-none"
          style={{ background: "linear-gradient(135deg, #06b6d4, #8b5cf6)", fontSize: 8, fontWeight: 700 }}
        >
          {badgeCount > 9 ? "9+" : badgeCount}
        </motion.span>
      )}
    </motion.button>
  );
}

export default function AdminTopbar({ title }: { title: string }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch]               = useState(false);
  const [refreshing, setRefreshing]               = useState(false);
  const { user } = useAdminAuth();
  const { isDark, toggleTheme, colors } = useAdminTheme();
  const qc = useQueryClient();

  const { data: statsData } = useQuery({
    queryKey: ["/api/admin/stats"],
    queryFn:  () => adminApi.getStats(),
    refetchInterval: 20000,
  });

  const { data: settingsData } = useQuery({
    queryKey: ["/api/admin/settings"],
    queryFn:  () => adminApi.getSettings(),
    staleTime: 60000,
  });

  const stats = statsData?.data ?? {};
  const settings = settingsData?.data ?? {};
  const logoUrl: string = settings.logo_url ?? "";

  const notifications: { id: string; type: string; title: string; sub: string; link: string; count?: number }[] = [];
  if ((stats.unreadMessages ?? 0) > 0) {
    notifications.push({
      id:    "unread-messages",
      type:  "info",
      title: `${stats.unreadMessages} unread message${stats.unreadMessages > 1 ? "s" : ""}`,
      sub:   "Contact form submissions",
      link:  "/admin/messages",
    });
  }
  if ((stats.pendingOrders ?? 0) > 0) {
    notifications.push({
      id:    "pending-orders",
      type:  "warning",
      title: `${stats.pendingOrders} pending order${stats.pendingOrders > 1 ? "s" : ""}`,
      sub:   "Awaiting admin review",
      link:  "/admin/orders",
    });
  }
  if ((stats.pendingSignups ?? 0) > 0) {
    notifications.push({
      id:    "pending-signups",
      type:  "warning",
      title: `${stats.pendingSignups} signup request${stats.pendingSignups > 1 ? "s" : ""}`,
      sub:   "Awaiting approval",
      link:  "/admin/pending-users",
    });
  }

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    await qc.invalidateQueries();
    setTimeout(() => setRefreshing(false), 900);
  }, [refreshing, qc]);

  return (
    <header
      className="h-14 flex items-center justify-between flex-shrink-0 px-5 relative z-20"
      style={{
        background:     colors.topbar,
        borderBottom:   `1px solid ${colors.border}`,
        backdropFilter: "blur(16px)",
      }}
    >
      {/* Left */}
      <div className="flex items-center gap-3">
        {/* Logo (from settings, shown only in topbar if sidebar is collapsed) */}
        {logoUrl && (
          <img
            src={logoUrl}
            alt="Logo"
            className="w-7 h-7 rounded-lg object-cover flex-shrink-0 border"
            style={{ borderColor: colors.border2 }}
          />
        )}
        <div className="flex items-center gap-1.5" style={{ color: colors.dimmer }}>
          <span className="text-xs hidden sm:block" style={{ fontFamily: "'Inter',sans-serif" }}>Admin</span>
          <span className="text-xs hidden sm:block">/</span>
        </div>
        <h1 className="text-sm font-semibold" style={{ fontFamily: "'Space Grotesk',sans-serif", color: colors.text }}>
          {title}
        </h1>
        <div
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-full"
          style={{ background: "rgba(6,182,212,0.07)", border: "1px solid rgba(6,182,212,0.15)" }}
        >
          <motion.div
            animate={{ opacity: [1, 0.2, 1], scale: [1, 1.3, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "#06b6d4" }}
          />
          <span className="text-xs" style={{ color: "rgba(6,182,212,0.7)", fontFamily: "'Inter',sans-serif" }}>Live</span>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1.5">

        {/* Refresh */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.88 }}
          onClick={handleRefresh}
          title="Refresh data"
          className="relative flex items-center justify-center rounded-lg flex-shrink-0"
          style={{
            width: 32, height: 32,
            background: refreshing ? "rgba(6,182,212,0.10)" : "transparent",
            border: `1px solid ${refreshing ? "rgba(6,182,212,0.30)" : "transparent"}`,
            color: refreshing ? "#06b6d4" : colors.dim,
            cursor: "pointer",
            transition: "background 0.15s, color 0.15s, border-color 0.15s",
          }}
          onMouseEnter={e => {
            if (refreshing) return;
            (e.currentTarget as HTMLElement).style.background  = colors.hover;
            (e.currentTarget as HTMLElement).style.color       = colors.text;
            (e.currentTarget as HTMLElement).style.borderColor = colors.border;
          }}
          onMouseLeave={e => {
            if (refreshing) return;
            (e.currentTarget as HTMLElement).style.background  = "transparent";
            (e.currentTarget as HTMLElement).style.color       = colors.dim;
            (e.currentTarget as HTMLElement).style.borderColor = "transparent";
          }}
        >
          <motion.div
            animate={refreshing ? { rotate: 360 } : { rotate: 0 }}
            transition={refreshing
              ? { duration: 0.7, repeat: Infinity, ease: "linear" }
              : { duration: 0.25 }
            }
            style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <RotateCcw size={14} />
          </motion.div>
        </motion.button>

        {/* Search */}
        <AnimatePresence mode="wait">
          {showSearch ? (
            <motion.div
              key="open"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 200, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="relative overflow-hidden"
            >
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: colors.dimmer }} />
              <input
                autoFocus
                placeholder="Search..."
                className="w-full pl-8 pr-8 py-1.5 text-xs outline-none rounded-lg"
                style={{
                  background:   colors.input,
                  border:       `1px solid ${colors.inputBorder}`,
                  color:        colors.text,
                  fontFamily:   "'Inter',sans-serif",
                }}
              />
              <button
                onClick={() => setShowSearch(false)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2"
                style={{ color: colors.dim }}
              >
                <X size={11} />
              </button>
            </motion.div>
          ) : (
            <motion.div key="closed" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <IconBtn onClick={() => setShowSearch(true)} title="Search" colors={colors}>
                <Search size={14} />
              </IconBtn>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Theme toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.85, rotate: isDark ? 20 : -20 }}
          onClick={toggleTheme}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          className="flex items-center justify-center rounded-lg flex-shrink-0"
          style={{
            width: 32, height: 32,
            background: "transparent",
            border: "1px solid transparent",
            color: colors.dim,
            cursor: "pointer",
            transition: "background 0.15s, color 0.15s, border-color 0.15s",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background    = colors.hover;
            (e.currentTarget as HTMLElement).style.color         = isDark ? "#fbbf24" : "#8b5cf6";
            (e.currentTarget as HTMLElement).style.borderColor   = colors.border;
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background    = "transparent";
            (e.currentTarget as HTMLElement).style.color         = colors.dim;
            (e.currentTarget as HTMLElement).style.borderColor   = "transparent";
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={isDark ? "sun" : "moon"}
              initial={{ rotate: -30, opacity: 0, scale: 0.7 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 30, opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.18 }}
            >
              {isDark ? <Sun size={14} /> : <Moon size={14} />}
            </motion.div>
          </AnimatePresence>
        </motion.button>

        {/* View site */}
        <Link href="/">
          <div className="hidden sm:block">
            <IconBtn title="View public site" colors={colors}>
              <ExternalLink size={14} />
            </IconBtn>
          </div>
        </Link>

        {/* Notifications */}
        <div className="relative">
          <IconBtn
            onClick={() => setShowNotifications(!showNotifications)}
            title="Notifications"
            colors={colors}
            badgeCount={notifications.length}
          >
            <Bell size={14} />
          </IconBtn>

          <AnimatePresence>
            {showNotifications && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowNotifications(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute right-0 top-10 w-72 rounded-2xl overflow-hidden z-40"
                  style={{
                    background:  colors.card2,
                    border:      `1px solid ${colors.border2}`,
                    boxShadow:   isDark ? "0 20px 48px rgba(0,0,0,0.55)" : "0 8px 32px rgba(0,0,0,0.14)",
                  }}
                >
                  <div
                    className="flex items-center justify-between px-4 py-3"
                    style={{ borderBottom: `1px solid ${colors.border}` }}
                  >
                    <span className="text-sm font-semibold" style={{ fontFamily: "'Space Grotesk',sans-serif", color: colors.text }}>
                      Notifications
                    </span>
                    <span className="text-xs" style={{ color: colors.dim, fontFamily: "'Inter',sans-serif" }}>
                      {notifications.length} active
                    </span>
                  </div>

                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-2">
                      <CheckCheck size={20} style={{ color: colors.dimmer }} />
                      <p className="text-xs" style={{ color: colors.dimmer, fontFamily: "'Inter',sans-serif" }}>
                        All caught up!
                      </p>
                    </div>
                  ) : (
                    notifications.map((n, i) => {
                      const Icon = n.id === "unread-messages" ? MessageSquare
                        : n.id === "pending-orders" ? ShoppingBag
                        : UserPlus;
                      const accent = n.type === "warning" ? "#f59e0b" : "#22d3ee";
                      const bg     = n.type === "warning" ? "rgba(245,158,11,0.10)" : "rgba(6,182,212,0.08)";
                      return (
                        <Link key={n.id} href={n.link}>
                          <motion.div
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer"
                            style={{ borderBottom: i < notifications.length - 1 ? `1px solid ${colors.border}` : "none" }}
                            onClick={() => setShowNotifications(false)}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = colors.hover}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                          >
                            <div
                              className="mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: bg }}
                            >
                              <Icon size={12} style={{ color: accent }} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium" style={{ fontFamily: "'Inter',sans-serif", color: colors.text }}>{n.title}</p>
                              <p className="text-xs mt-0.5" style={{ color: colors.dim, fontFamily: "'Inter',sans-serif" }}>{n.sub}</p>
                            </div>
                          </motion.div>
                        </Link>
                      );
                    })
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        <div className="w-px h-5 mx-1" style={{ background: colors.border }} />

        {/* User avatar */}
        <motion.div
          whileHover={{ scale: 1.08 }}
          className="flex items-center gap-2 cursor-pointer"
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center font-semibold text-xs text-white"
            style={{ background: "linear-gradient(135deg, #06b6d4, #8b5cf6)" }}
          >
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <span className="text-xs hidden md:block" style={{ color: colors.muted, fontFamily: "'Inter',sans-serif" }}>
            {user?.username}
          </span>
        </motion.div>

      </div>
    </header>
  );
}
