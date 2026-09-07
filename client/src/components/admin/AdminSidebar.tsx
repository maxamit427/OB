import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Briefcase, Users, ShieldCheck,
  Settings, LogOut, ChevronLeft, ChevronRight, LayoutGrid,
  User, Globe, ShoppingBag, Package, UserPlus, KeyRound,
} from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useAdminTheme } from "@/contexts/AdminThemeContext";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/adminApi";
import logoFallback from "@assets/Messenger_creation_C808A249-822C-4C7C-B971-68BAAB329ABA_1763833106108.jpeg";

const navItems = [
  { label: "Dashboard",  icon: LayoutDashboard, href: "/admin/dashboard"  },
  { label: "Portfolio",  icon: Briefcase,       href: "/admin/portfolio"  },
  { label: "Team",       icon: Users,           href: "/admin/team"       },
  { label: "Categories", icon: LayoutGrid,      href: "/admin/categories" },
  { label: "Services",   icon: ShoppingBag,     href: "/admin/services"   },
  { label: "Orders",     icon: Package,         href: "/admin/orders"     },
];

const systemItems = [
  { label: "Account",      icon: User,        href: "/admin/users"        },
  { label: "OTP Logs",     icon: KeyRound,    href: "/admin/otp-logs"     },
  { label: "Security",     icon: ShieldCheck, href: "/admin/security"     },
  { label: "Settings",     icon: Settings,    href: "/admin/settings"     },
  { label: "Public Users", icon: Globe,       href: "/admin/public-users" },
];

export default function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [location] = useLocation();
  const { logout, user } = useAdminAuth();
  const { colors } = useAdminTheme();
  const [time, setTime] = useState("");

  // Poll pending signups count for super_admin
  const { data: statsData } = useQuery({
    queryKey: ["admin-stats"],
    queryFn:  () => adminApi.getStats(),
    refetchInterval: 30000,
    enabled: user?.role === "super_admin",
  });
  const pendingCount = statsData?.data?.pendingSignups ?? 0;

  // Logo from settings
  const { data: settingsData } = useQuery({
    queryKey: ["/api/admin/settings"],
    queryFn:  () => adminApi.getSettings(),
    staleTime: 60000,
  });
  const logoUrl: string = settingsData?.data?.logo_url ?? "";

  useEffect(() => {
    const fmt = () => {
      const n = new Date();
      setTime(n.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }));
    };
    fmt();
    const id = setInterval(fmt, 10000);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.aside
      animate={{ width: collapsed ? 68 : 248 }}
      transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
      className="relative flex flex-col h-screen overflow-hidden flex-shrink-0"
      style={{
        background:   colors.sidebar,
        borderRight:  `1px solid ${colors.border}`,
        zIndex:       40,
      }}
    >
      {/* Brand header */}
      <div
        className="flex items-center justify-center flex-shrink-0 overflow-hidden"
        style={{
          height:  64,
          padding: collapsed ? "0 14px" : "0 16px",
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        {collapsed ? (
          /* Collapsed: small square logo */
          <div
            className="rounded-xl overflow-hidden flex-shrink-0"
            style={{ width: 36, height: 36, border: "1.5px solid rgba(6,182,212,0.2)" }}
          >
            <img
              src={logoUrl || logoFallback}
              alt="Logo"
              className="w-full h-full object-cover"
              onError={e => { (e.currentTarget as HTMLImageElement).src = logoFallback; }}
            />
          </div>
        ) : (
          /* Expanded: wide logo that fills the header */
          <AnimatePresence>
            <motion.div
              key="logo-expanded"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.18 }}
              className="flex items-center gap-3 w-full min-w-0"
            >
              <div
                className="rounded-xl overflow-hidden flex-shrink-0"
                style={{
                  width: 40, height: 40,
                  border: "1.5px solid rgba(6,182,212,0.25)",
                  boxShadow: "0 0 12px rgba(6,182,212,0.12)",
                }}
              >
                <img
                  src={logoUrl || logoFallback}
                  alt="Logo"
                  className="w-full h-full object-cover"
                  onError={e => { (e.currentTarget as HTMLImageElement).src = logoFallback; }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="font-bold text-sm truncate"
                  style={{
                    fontFamily: "'Space Grotesk',sans-serif",
                    lineHeight: 1.2,
                    color: colors.text,
                    letterSpacing: "0.01em",
                  }}
                >
                  Older Brother
                </p>
                <p
                  className="text-xs mt-0.5 truncate"
                  style={{
                    color: "rgba(6,182,212,0.6)",
                    fontFamily: "'Inter',sans-serif",
                    fontSize: 10,
                    letterSpacing: "0.06em",
                  }}
                >
                  ADMIN PANEL
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3">
        <NavSection items={navItems} location={location} collapsed={collapsed} label={!collapsed ? "Main" : undefined} colors={colors} />
        <NavSection items={systemItems} location={location} collapsed={collapsed} label={!collapsed ? "System" : undefined} colors={colors} />
        {user?.role === "super_admin" && (
          <NavSectionWithBadge
            items={[{ label: "Pending Users", icon: UserPlus, href: "/admin/pending-users", badge: pendingCount }]}
            location={location}
            collapsed={collapsed}
            label={!collapsed ? "Super Admin" : undefined}
            colors={colors}
          />
        )}
      </nav>

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${colors.border}`, padding: "12px 10px" }}>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center justify-between mb-2 px-2"
            >
              <span className="text-xs tabular-nums font-mono" style={{ color: colors.dimmest }}>{time}</span>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#22c55e" }} />
                <span className="text-xs" style={{ color: colors.dimmest, fontFamily: "'Inter',sans-serif" }}>Online</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* User row */}
        <div
          className="flex items-center gap-2.5 rounded-xl overflow-hidden"
          style={{ padding: "8px 10px" }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 font-semibold text-xs text-white"
            style={{ background: "linear-gradient(135deg, #06b6d4, #8b5cf6)" }}
          >
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="min-w-0 flex-1"
              >
                <p className="text-xs font-semibold truncate" style={{ fontFamily: "'Inter',sans-serif", color: colors.text }}>
                  {user?.username}
                </p>
                <p className="text-xs capitalize" style={{ color: colors.dimmer }}>{user?.role?.replace("_", " ")}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          title="Sign out"
          className="flex items-center gap-2.5 w-full rounded-xl mt-1 transition-all"
          style={{
            padding:         "8px 10px",
            justifyContent:  collapsed ? "center" : "flex-start",
            color:           colors.dim,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.color      = "#ef4444";
            (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.07)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.color      = colors.dim;
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
        >
          <LogOut size={15} />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-xs font-medium"
                style={{ fontFamily: "'Inter',sans-serif" }}
              >
                Sign out
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="absolute top-5 flex items-center justify-center rounded-full transition-all"
        style={{
          right: -11, width: 22, height: 22,
          background:  colors.card,
          border:      `1px solid ${colors.border2}`,
          color:       colors.dim,
          zIndex:      50,
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.color       = "#06b6d4";
          (e.currentTarget as HTMLElement).style.borderColor = "rgba(6,182,212,0.4)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.color       = colors.dim;
          (e.currentTarget as HTMLElement).style.borderColor = colors.border2;
        }}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </motion.aside>
  );
}

function NavSection({
  items, location, collapsed, label, colors,
}: {
  items: { href: string; label: string; icon: React.ElementType }[];
  location: string;
  collapsed: boolean;
  label?: string;
  colors: ReturnType<typeof useAdminTheme>["colors"];
}) {
  return (
    <div className="mb-4">
      {label && (
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-xs font-medium tracking-wider uppercase px-5 pb-1"
              style={{ color: colors.navSection, fontFamily: "'Inter',sans-serif", fontSize: 10 }}
            >
              {label}
            </motion.div>
          )}
        </AnimatePresence>
      )}
      <div className="flex flex-col gap-0.5 px-2">
        {items.map(item => {
          const active = location === item.href || location.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <div
                title={collapsed ? item.label : undefined}
                className="relative flex items-center rounded-xl transition-all cursor-pointer"
                style={{
                  height:          38,
                  gap:             10,
                  padding:         collapsed ? "0 11px" : "0 12px",
                  justifyContent:  collapsed ? "center" : "flex-start",
                  background:      active ? colors.navActive : "transparent",
                  color:           active ? "#06b6d4" : colors.dim,
                }}
                onMouseEnter={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = colors.hover;
                    (e.currentTarget as HTMLElement).style.color      = colors.text2;
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.color      = colors.dim;
                  }
                }}
              >
                {active && (
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full"
                    style={{ width: 3, height: 20, background: "#06b6d4" }}
                  />
                )}
                <Icon size={16} strokeWidth={active ? 2.5 : 2} />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="text-sm font-medium truncate"
                      style={{ fontFamily: "'Inter',sans-serif" }}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function NavSectionWithBadge({
  items, location, collapsed, label, colors,
}: {
  items: { href: string; label: string; icon: React.ElementType; badge: number }[];
  location: string;
  collapsed: boolean;
  label?: string;
  colors: ReturnType<typeof useAdminTheme>["colors"];
}) {
  return (
    <div className="mb-4">
      {label && (
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-xs font-medium tracking-wider uppercase px-5 pb-1"
              style={{ color: colors.navSection, fontFamily: "'Inter',sans-serif", fontSize: 10 }}
            >
              {label}
            </motion.div>
          )}
        </AnimatePresence>
      )}
      <div className="flex flex-col gap-0.5 px-2">
        {items.map(item => {
          const active = location === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.href + item.label} href={item.href}>
              <div
                title={collapsed ? item.label : undefined}
                className="relative flex items-center rounded-xl transition-all cursor-pointer"
                style={{
                  height:          38,
                  gap:             10,
                  padding:         collapsed ? "0 11px" : "0 12px",
                  justifyContent:  collapsed ? "center" : "flex-start",
                  background:      active ? colors.navActive : "transparent",
                  color:           active ? "#06b6d4" : colors.dim,
                }}
                onMouseEnter={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = colors.hover;
                    (e.currentTarget as HTMLElement).style.color      = colors.text2;
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.color      = colors.dim;
                  }
                }}
              >
                {active && (
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full"
                    style={{ width: 3, height: 20, background: "#06b6d4" }}
                  />
                )}
                <div className="relative flex-shrink-0">
                  <Icon size={16} strokeWidth={active ? 2.5 : 2} />
                  {item.badge > 0 && (
                    <div
                      className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-white"
                      style={{ background: "#ef4444", fontSize: 8, fontWeight: 700, boxShadow: "0 0 6px rgba(239,68,68,0.7)" }}
                    >
                      {item.badge > 9 ? "9+" : item.badge}
                    </div>
                  )}
                </div>
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="text-sm font-medium truncate flex-1"
                      style={{ fontFamily: "'Inter',sans-serif" }}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {!collapsed && item.badge > 0 && (
                  <AnimatePresence>
                    <div
                      className="flex-shrink-0 px-1.5 py-0.5 rounded-full text-xs font-bold"
                      style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.4)", fontSize: 10 }}
                    >
                      {item.badge}
                    </div>
                  </AnimatePresence>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
