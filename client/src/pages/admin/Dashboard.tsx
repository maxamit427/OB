import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus, Briefcase, Users, Shield, Activity,
  ArrowUpRight, Zap, Package, Server, Wifi, Globe, DollarSign, CheckCircle2,
  MessageSquare, Bell,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/adminApi";
import { Link } from "wouter";
import { useEffect, useRef, useState, useCallback } from "react";
import { useAdminTheme } from "@/contexts/AdminThemeContext";

/* ─── Live clock ─────────────────────────────────────────────────────────── */
function useClock() {
  const [t, setT] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

/* ─── Animated counter ───────────────────────────────────────────────────── */
function useCounter(target: number, duration = 1200) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!target) { setV(0); return; }
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const e = 1 - Math.pow(1 - p, 4);
      setV(Math.floor(e * target));
      if (p < 1) requestAnimationFrame(tick);
      else setV(target);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return v;
}

/* ─── Quiet telemetry line ───────────────────────────────────────────────── */
function HeartbeatLine({ color = "#06b6d4", height = 60 }: { color?: string; height?: number }) {
  const gradientId = `telemetry-${color.replace("#", "")}`;
  return (
    <svg viewBox="0 0 320 48" preserveAspectRatio="none" className="w-full" style={{ height }} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" x2="1">
          <stop offset="0" stopColor={color} stopOpacity="0" />
          <stop offset="0.18" stopColor={color} stopOpacity="0.65" />
          <stop offset="0.82" stopColor={color} stopOpacity="0.65" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0 27 C24 24 32 30 48 27 S72 22 86 27 L98 27 L105 10 L112 37 L120 27 C138 22 148 31 164 27 S190 22 208 27 S232 31 248 27 S276 23 320 27"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ─── Quiet dashboard background ─────────────────────────────────────────── */
function ParticleBg() {
  return (
    <div
      className="absolute inset-0 pointer-events-none opacity-80"
      style={{ background: "radial-gradient(circle at 80% 20%, rgba(6,182,212,0.11), transparent 34%), radial-gradient(circle at 16% 100%, rgba(139,92,246,0.09), transparent 38%)" }}
    />
  );
}

/* ─── SVG ring progress ──────────────────────────────────────────────────── */
function RingProgress({ pct, color, size = 72, label }: { pct: number; color: string; size?: number; label: string }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={8} />
          <motion.circle
            cx={size/2} cy={size/2} r={r} fill="none"
            stroke={color} strokeWidth={8} strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ * (1 - pct / 100) }}
            transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{ filter: `drop-shadow(0 0 4px ${color})` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold tabular-nums" style={{ color, fontFamily: "'Space Grotesk',sans-serif" }}>
            {pct}%
          </span>
        </div>
      </div>
      <span className="text-xs text-center" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "'Inter',sans-serif" }}>{label}</span>
    </div>
  );
}

/* ─── Animated bar ───────────────────────────────────────────────────────── */
function AnimBar({ val, max, color, label, delay = 0, colors }: any) {
  const pct = max ? Math.round((val / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs w-24 truncate flex-shrink-0" style={{ color: colors.muted, fontFamily: "'Inter',sans-serif" }}>{label}</span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: colors.border }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: color, boxShadow: `0 0 6px ${color}80` }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      <span className="text-xs w-8 text-right font-mono flex-shrink-0" style={{ color }}>{val}</span>
    </div>
  );
}

/* ─── Glowing stat card ──────────────────────────────────────────────────── */
function StatCard({ label, value, icon: Icon, accent, sub, href, delay, colors }: any) {
  const count = useCounter(value ?? 0);
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (value == null) return;
    setPulse(true);
    const id = setTimeout(() => setPulse(false), 600);
    return () => clearTimeout(id);
  }, [value]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2, transition: { duration: 0.18 } }}
      className="relative rounded-2xl overflow-hidden"
      style={{
        background: colors.card,
        border: `1px solid ${colors.border2}`,
        transition: "border-color 0.25s, box-shadow 0.25s",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = `${accent}55`;
        (e.currentTarget as HTMLElement).style.boxShadow  = `0 0 32px ${accent}18, 0 16px 40px rgba(0,0,0,0.3)`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = colors.border2;
        (e.currentTarget as HTMLElement).style.boxShadow  = "none";
      }}
    >
      {/* Quiet top accent */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />

      {/* Background glow blob */}
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${accent}12 0%, transparent 70%)`, filter: "blur(16px)" }} />

      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: `${accent}14`, border: `1px solid ${accent}30` }}
          >
            <Icon size={17} style={{ color: accent }} />
          </div>
          {href ? (
            <Link href={href}>
              <motion.div whileHover={{ x: 2 }} className="cursor-pointer">
                <ArrowUpRight size={13} style={{ color: colors.dimmer }} />
              </motion.div>
            </Link>
          ) : <ArrowUpRight size={13} style={{ color: colors.dimmer }} />}
        </div>

        {/* Live sparkline (canvas) */}
        <HeartbeatLine color={accent} height={42} />

        {/* Count */}
        <motion.p
          animate={pulse ? { scale: [1, 1.08, 1] } : {}}
          transition={{ duration: 0.4 }}
          className="text-2xl font-bold tabular-nums mt-3"
          style={{ fontFamily: "'Space Grotesk',sans-serif", color: colors.text }}
        >
          {value === undefined ? "—" : count.toLocaleString()}
        </motion.p>
        <p className="text-xs mt-0.5" style={{ color: colors.muted, fontFamily: "'Inter',sans-serif" }}>{label}</p>
        {sub && (
          <p
            className="text-xs mt-1"
            style={{ color: `${accent}bb`, fontFamily: "'Inter',sans-serif" }}
          >
            {sub}
          </p>
        )}
      </div>
    </motion.div>
  );
}

/* ─── Static network snapshot ────────────────────────────────────────────── */
function NetworkNodes() {
  return (
    <svg viewBox="0 0 420 220" className="w-full h-full" preserveAspectRatio="none" aria-hidden="true">
      <g stroke="rgba(6,182,212,0.18)" strokeWidth="1">
        <path d="M210 110 L72 58 M210 110 L110 174 M210 110 L328 52 M210 110 L340 162 M210 110 L78 126 M210 110 L286 184" />
      </g>
      {[
        [210, 110, "#06b6d4", 6],
        [72, 58, "#8b5cf6", 4], [110, 174, "#10b981", 4],
        [328, 52, "#f59e0b", 4], [340, 162, "#06b6d4", 4],
        [78, 126, "#ec4899", 4], [286, 184, "#34d399", 4],
      ].map(([cx, cy, fill, r], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r={Number(r) + 8} fill="none" stroke={`${fill}35`} />
          <circle cx={cx} cy={cy} r={r} fill={fill} />
        </g>
      ))}
    </svg>
  );
}

/* ─── Static grid texture ────────────────────────────────────────────────── */
function ScanGrid() {
  return <div className="absolute inset-0 w-full h-full pointer-events-none opacity-60 admin-dashboard-grid" />;
}

/* ─── Order stat cell (needs hook at top level) ─────────────────────────── */
function OrderStatCell({ item, index, colors }: { item: { label: string; val: number; color: string; delay: number }; index: number; colors: any }) {
  const c = useCounter(item.val);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.88 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: item.delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -1 }}
      className="rounded-xl p-3.5 text-center"
      style={{ background: `${item.color}09`, border: `1px solid ${item.color}22` }}
    >
      <p
        className="text-2xl font-bold tabular-nums"
        style={{ fontFamily: "'Space Grotesk',sans-serif", color: item.color }}
      >
        {c}
      </p>
      <p className="text-xs mt-0.5" style={{ color: colors.muted, fontFamily: "'Inter',sans-serif" }}>{item.label}</p>
    </motion.div>
  );
}

/* ─── Main dashboard ─────────────────────────────────────────────────────── */
function DashboardContent() {
  const { colors } = useAdminTheme();
  const clock = useClock();

  const { data: statsData, dataUpdatedAt } = useQuery<any>({
    queryKey: ["/api/admin/stats"],
    queryFn:  () => adminApi.getStats(),
    refetchInterval: 15000,
  });
  const { data: logsData } = useQuery<any>({
    queryKey: ["/api/admin/security/logs"],
    queryFn:  () => adminApi.getSecurityLogs(6),
    refetchInterval: 20000,
  });

  const stats = statsData?.data;
  const logs  = logsData?.data || [];

  // uptime counter (session start)
  const startTime = useRef(Date.now());
  const [uptime, setUptime] = useState("00:00:00");
  useEffect(() => {
    const id = setInterval(() => {
      const s = Math.floor((Date.now() - startTime.current) / 1000);
      const hh = String(Math.floor(s / 3600)).padStart(2, "0");
      const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
      const ss = String(s % 60).padStart(2, "0");
      setUptime(`${hh}:${mm}:${ss}`);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const statCards = [
    { label: "Pending Signups",    value: stats?.pendingSignups,  icon: UserPlus,   accent: "#f87171", sub: (stats?.pendingSignups ?? 0) > 0 ? "Requires review" : "No pending requests", href: "/admin/pending-users" },
    { label: "Registered Users",   value: stats?.publicUsers,     icon: Users,      accent: "#10b981", sub: "Public accounts",                                                              href: "/admin/public-users"  },
    { label: "Total Orders",       value: stats?.orders,          icon: Package,    accent: "#f59e0b", sub: stats?.pendingOrders ? `${stats.pendingOrders} pending` : "No pending",        href: "/admin/orders"        },
    { label: "Revenue (Approved)", value: stats?.totalRevenue !== undefined ? Math.floor(stats.totalRevenue) : undefined, icon: DollarSign, accent: "#22c55e", sub: stats?.completedOrders ? `${stats.completedOrders} completed` : "No completed yet" },
  ];

  const sevColor: Record<string, string> = { info: "#22d3ee", warning: "#fbbf24", critical: "#f87171" };
  const timeAgo = (iso: string) => {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    return `${Math.floor(s / 3600)}h`;
  };

  return (
    <div className="max-w-[1440px] mx-auto space-y-5">

      {/* ── Welcome banner with particle bg ── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(6,182,212,0.07) 0%, rgba(139,92,246,0.05) 100%)",
          border: "1px solid rgba(6,182,212,0.16)",
          minHeight: 90,
        }}
      >
        <ParticleBg />
        <ScanGrid />
        <div className="relative z-10 flex items-center gap-5 px-6 py-5">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #06b6d4, #8b5cf6)", boxShadow: "0 0 20px rgba(6,182,212,0.3)" }}
          >
            <Zap size={19} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-base" style={{ fontFamily: "'Space Grotesk',sans-serif", color: colors.text }}>
              Command Center
            </p>
            <p className="text-xs mt-0.5" style={{ color: colors.muted, fontFamily: "'Inter',sans-serif" }}>
              All systems operational — Older Brother Admin
            </p>
          </div>
          <div className="ml-auto flex items-center gap-6 flex-shrink-0">
            {/* Live clock */}
            <div className="text-right hidden sm:block">
              <p className="text-lg font-bold tabular-nums font-mono" style={{ color: "#06b6d4", letterSpacing: "0.06em" }}>
                {clock.toLocaleTimeString("en-US", { hour12: false })}
              </p>
              <p className="text-xs" style={{ color: colors.dimmer, fontFamily: "'Inter',sans-serif" }}>
                {clock.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </p>
            </div>
            {/* Uptime */}
            <div className="text-right hidden md:block">
              <div className="flex items-center gap-1.5 justify-end">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#22c55e" }} />
                <p className="text-xs font-mono tabular-nums" style={{ color: "#22c55e" }}>{uptime}</p>
              </div>
              <p className="text-xs" style={{ color: colors.dimmest, fontFamily: "'Inter',sans-serif" }}>Uptime</p>
            </div>
            {/* Online badge */}
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
              style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)" }}
            >
              <div className="w-2 h-2 rounded-full" style={{ background: "#22c55e" }} />
              <span className="text-xs font-semibold" style={{ color: "#22c55e", fontFamily: "'Inter',sans-serif" }}>Online</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((c, i) => (
          <StatCard key={c.label} {...c} delay={i * 0.07} colors={colors} />
        ))}
      </div>

      {/* ── Middle row: Network + Rings + Bars ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Network map */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="relative rounded-2xl overflow-hidden"
          style={{ background: colors.card, border: `1px solid ${colors.border2}`, height: 260 }}
          whileHover={{ boxShadow: "0 8px 32px rgba(6,182,212,0.1)", transition: { duration: 0.2 } } as any}
        >
          <ScanGrid />
          <div className="absolute inset-0 z-10">
            <NetworkNodes />
          </div>
          <div className="absolute top-4 left-5 z-20">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#22c55e" }} />
              <span className="text-xs font-semibold" style={{ color: colors.text, fontFamily: "'Space Grotesk',sans-serif" }}>Network Map</span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: colors.dimmer, fontFamily: "'Inter',sans-serif" }}>Live node topology</p>
          </div>
          <div className="absolute bottom-4 right-5 z-20 flex items-center gap-1.5">
            <Wifi size={11} style={{ color: "#06b6d4" }} />
            <span className="text-xs font-mono" style={{ color: "#06b6d4" }}>7 nodes</span>
          </div>
        </motion.div>

        {/* System rings */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          className="rounded-2xl p-5"
          style={{ background: colors.card, border: `1px solid ${colors.border2}` }}
          whileHover={{ boxShadow: "0 8px 32px rgba(139,92,246,0.1)", transition: { duration: 0.2 } } as any}
        >
          <div className="flex items-center gap-2 mb-5">
            <Server size={14} style={{ color: "#8b5cf6" }} />
            <span className="text-sm font-semibold" style={{ fontFamily: "'Space Grotesk',sans-serif", color: colors.text }}>System Health</span>
          </div>
          <div className="flex items-center justify-around mb-5">
            <RingProgress pct={92} color="#06b6d4" label="CPU" />
            <RingProgress pct={67} color="#8b5cf6" label="Memory" />
            <RingProgress pct={45} color="#10b981" label="Storage" />
          </div>
          {/* Live ECG */}
          <div className="rounded-xl overflow-hidden" style={{ background: "rgba(6,182,212,0.04)", border: "1px solid rgba(6,182,212,0.1)" }}>
            <div className="px-3 pt-2 flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full" style={{ background: "#ef4444" }} />
              <span className="text-xs font-mono" style={{ color: "rgba(6,182,212,0.6)" }}>SYS PULSE</span>
            </div>
            <HeartbeatLine color="#06b6d4" height={40} />
          </div>
        </motion.div>

        {/* Platform stats bars */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="rounded-2xl p-5"
          style={{ background: colors.card, border: `1px solid ${colors.border2}` }}
          whileHover={{ boxShadow: "0 8px 32px rgba(16,185,129,0.08)", transition: { duration: 0.2 } } as any}
        >
          <div className="flex items-center gap-2 mb-5">
            <Activity size={14} style={{ color: "#10b981" }} />
            <span className="text-sm font-semibold" style={{ fontFamily: "'Space Grotesk',sans-serif", color: colors.text }}>Platform Activity</span>
          </div>
          <div className="space-y-3.5">
            {[
              { label: "Team Members",    val: stats?.teamMembers   ?? 0, max: 20, color: "#10b981" },
              { label: "Portfolio Items", val: stats?.portfolioItems ?? 0, max: 50, color: "#8b5cf6" },
              { label: "Services",        val: stats?.services       ?? 0, max: 30, color: "#06b6d4" },
              { label: "Categories",      val: stats?.categories     ?? 0, max: 20, color: "#f59e0b" },
              { label: "Security Alerts", val: stats?.securityAlerts ?? 0, max: 20, color: "#ef4444" },
            ].map((item, i) => (
              <AnimBar key={item.label} {...item} delay={0.45 + i * 0.06} colors={colors} />
            ))}
          </div>
          {/* Second ECG */}
          <div className="mt-4 rounded-xl overflow-hidden" style={{ background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.1)" }}>
            <HeartbeatLine color="#10b981" height={36} />
          </div>
        </motion.div>
      </div>

      {/* ── Bottom row: Orders + Security logs ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Orders overview */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.4 }}
          className="rounded-2xl p-5"
          style={{ background: colors.card, border: `1px solid ${colors.border2}` }}
          whileHover={{ boxShadow: "0 8px 32px rgba(245,158,11,0.08)", transition: { duration: 0.2 } } as any}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#f59e0b" }} />
              <Package size={14} style={{ color: "#f59e0b" }} />
              <span className="text-sm font-semibold" style={{ fontFamily: "'Space Grotesk',sans-serif", color: colors.text }}>Orders Overview</span>
            </div>
            <Link href="/admin/orders">
              <span className="text-xs cursor-pointer transition-colors" style={{ color: colors.dimmer, fontFamily: "'Inter',sans-serif" }}
                onMouseEnter={(e: any) => e.target.style.color = "#f59e0b"}
                onMouseLeave={(e: any) => e.target.style.color = colors.dimmer}>
                Manage →
              </span>
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: "Total Orders",  val: stats?.orders        ?? 0, color: "#06b6d4", delay: 0.50 },
              { label: "Pending",       val: stats?.pendingOrders ?? 0, color: "#f59e0b", delay: 0.56 },
              { label: "Services",      val: stats?.services       ?? 0, color: "#8b5cf6", delay: 0.62 },
              { label: "Portfolio",     val: stats?.portfolioItems ?? 0, color: "#10b981", delay: 0.68 },
            ].map((item, i) => (
              <OrderStatCell key={item.label} item={item} index={i} colors={colors} />
            ))}
          </div>
          <HeartbeatLine color="#f59e0b" height={38} />
        </motion.div>

        {/* Security log feed */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="rounded-2xl overflow-hidden"
          style={{ background: colors.card, border: `1px solid ${colors.border2}` }}
          whileHover={{ boxShadow: "0 8px 32px rgba(239,68,68,0.08)", transition: { duration: 0.2 } } as any}
        >
          <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: `1px solid ${colors.border}` }}>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#ef4444" }} />
              <Shield size={13} style={{ color: "#ef4444" }} />
              <span className="text-sm font-semibold" style={{ fontFamily: "'Space Grotesk',sans-serif", color: colors.text }}>Security Feed</span>
            </div>
            <Link href="/admin/security">
              <span className="text-xs cursor-pointer" style={{ color: colors.dimmer, fontFamily: "'Inter',sans-serif" }}
                onMouseEnter={(e: any) => e.target.style.color = "#ef4444"}
                onMouseLeave={(e: any) => e.target.style.color = colors.dimmer}>
                View all →
              </span>
            </Link>
          </div>

          <div className="divide-y" style={{ borderColor: colors.border }}>
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10">
                <Shield size={28} style={{ color: colors.dimmest, opacity: 0.2 }} />
                <p className="text-xs mt-2" style={{ color: colors.dimmer, fontFamily: "'Inter',sans-serif" }}>No events yet</p>
              </div>
            ) : (
              <AnimatePresence>
                {logs.map((log: any, i: number) => {
                  const col = sevColor[log.severity] || sevColor.info;
                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.55 + i * 0.05, duration: 0.28, ease: "easeOut" }}
                      className="flex items-center gap-3 px-5 py-3 transition-colors cursor-default"
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = colors.hover}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                    >
                      <div
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: col, boxShadow: `0 0 5px ${col}` }}
                      />
                      <span className="text-xs px-1.5 py-0.5 rounded-md capitalize flex-shrink-0" style={{ background: col + "15", color: col, border: `1px solid ${col}30`, fontFamily: "'Inter',sans-serif" }}>
                        {log.severity}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs truncate" style={{ color: colors.text2, fontFamily: "'Inter',sans-serif" }}>{log.event}</p>
                        {log.details && <p className="text-xs truncate font-mono" style={{ color: colors.dimmer, fontSize: 10 }}>{log.details}</p>}
                      </div>
                      <span className="text-xs flex-shrink-0 font-mono" style={{ color: colors.dimmest }}>{timeAgo(log.createdAt)}</span>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>

          <div className="px-5 py-2.5 flex items-center justify-between" style={{ borderTop: `1px solid ${colors.border}` }}>
            <div className="flex items-center gap-1.5">
              <Globe size={10} style={{ color: colors.dimmest }} />
              <span className="text-xs font-mono" style={{ color: colors.dimmest }}>
                {new Date(dataUpdatedAt || Date.now()).toLocaleTimeString("en-US", { hour12: false })}
              </span>
            </div>
            <div
              className="flex items-center gap-1.5"
            >
              <div className="w-1 h-1 rounded-full" style={{ background: "#22c55e" }} />
              <span className="text-xs" style={{ color: "#22c55e", fontFamily: "'Inter',sans-serif" }}>Live monitoring</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Quick actions ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.35 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {[
          { label: "Messages",  href: "/admin/messages",  icon: MessageSquare, color: "#06b6d4" },
          { label: "Portfolio", href: "/admin/portfolio", icon: Briefcase,     color: "#8b5cf6" },
          { label: "Team",      href: "/admin/team",      icon: Users,         color: "#10b981" },
          { label: "Security",  href: "/admin/security",  icon: Shield,        color: "#f59e0b" },
        ].map((a, i) => (
          <Link key={a.label} href={a.href}>
            <motion.div
              whileHover={{ y: -3, boxShadow: `0 8px 20px ${a.color}18` }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.18 }}
              className="flex items-center gap-3 rounded-2xl px-4 py-3.5 cursor-pointer"
              style={{
                background: colors.card,
                border: `1px solid ${colors.border2}`,
                transition: "border-color 0.2s",
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = `${a.color}40`}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = colors.border2}
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${a.color}12`, border: `1px solid ${a.color}25` }}>
                <a.icon size={15} style={{ color: a.color }} />
              </div>
              <span className="text-sm font-medium" style={{ fontFamily: "'Inter',sans-serif", color: colors.text2 }}>{a.label}</span>
              <ArrowUpRight size={12} className="ml-auto" style={{ color: colors.dimmest }} />
            </motion.div>
          </Link>
        ))}
      </motion.div>

    </div>
  );
}

export default function Dashboard() {
  return (
    <AdminLayout>
      <DashboardContent />
    </AdminLayout>
  );
}
