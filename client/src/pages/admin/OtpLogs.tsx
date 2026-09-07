import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { KeyRound, CheckCircle2, XCircle, Clock, RefreshCw, Mail, ShieldAlert } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/adminApi";
import { useAdminTheme } from "@/contexts/AdminThemeContext";

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  verify_email:   { label: "Email Verify",  color: "#06b6d4" },
  reset_password: { label: "Password Reset", color: "#f59e0b" },
  admin_reset_password: { label: "Admin Password Reset", color: "#ef4444" },
  login:          { label: "Login OTP",      color: "#8b5cf6" },
};

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 0)     return "just now";
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function OtpLogsInner() {
  const { colors } = useAdminTheme();
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-otp-logs"],
    queryFn:  () => adminApi.getOtpLogs(200),
    refetchInterval: 30000,
  });

  const all: any[] = data?.data ?? [];

  const filtered = all.filter(o => {
    const matchType   = typeFilter   === "all" || o.type === typeFilter;
    const matchStatus = statusFilter === "all"
      || (statusFilter === "used"    && !!o.usedAt)
      || (statusFilter === "expired" && !o.usedAt && new Date(o.expiresAt) < new Date())
      || (statusFilter === "active"  && !o.usedAt && new Date(o.expiresAt) >= new Date());
    return matchType && matchStatus;
  });

  const stats = {
    total:   all.length,
    used:    all.filter(o => !!o.usedAt).length,
    expired: all.filter(o => !o.usedAt && new Date(o.expiresAt) < new Date()).length,
    active:  all.filter(o => !o.usedAt && new Date(o.expiresAt) >= new Date()).length,
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.25)" }}>
              <KeyRound size={18} style={{ color: "#06b6d4" }} />
            </div>
            <div>
              <h1 className="text-lg font-bold" style={{ fontFamily: "'Space Grotesk',sans-serif", color: colors.text }}>
                OTP Logs
              </h1>
              <p className="text-xs" style={{ color: colors.muted, fontFamily: "'Inter',sans-serif" }}>
                Verification code activity — {all.length} records
              </p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors"
            style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)", color: "#06b6d4" }}
          >
            <RefreshCw size={12} className={isFetching ? "animate-spin" : ""} />
            Refresh
          </motion.button>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Sent",   val: stats.total,   color: "#06b6d4", icon: Mail },
            { label: "Used",         val: stats.used,    color: "#10b981", icon: CheckCircle2 },
            { label: "Expired",      val: stats.expired, color: "#ef4444", icon: XCircle },
            { label: "Active",       val: stats.active,  color: "#f59e0b", icon: Clock },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.07 }}
              whileHover={{ y: -3 }}
              className="rounded-2xl p-4"
              style={{ background: colors.card, border: `1px solid ${colors.border2}` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <s.icon size={13} style={{ color: s.color }} />
                <span className="text-xs" style={{ color: colors.muted, fontFamily: "'Inter',sans-serif" }}>{s.label}</span>
              </div>
              <p className="text-2xl font-bold tabular-nums" style={{ fontFamily: "'Space Grotesk',sans-serif", color: s.color }}>
                {s.val}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap gap-2"
        >
          {/* Type filter */}
          <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: colors.card, border: `1px solid ${colors.border2}` }}>
            {[
              { val: "all",            label: "All Types" },
              { val: "verify_email",   label: "Email Verify" },
              { val: "reset_password", label: "Password Reset" },
              { val: "login",          label: "Login" },
            ].map(f => (
              <button
                key={f.val}
                onClick={() => setTypeFilter(f.val)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: typeFilter === f.val ? "rgba(6,182,212,0.15)" : "transparent",
                  color: typeFilter === f.val ? "#06b6d4" : colors.muted,
                  border: typeFilter === f.val ? "1px solid rgba(6,182,212,0.3)" : "1px solid transparent",
                  fontFamily: "'Inter',sans-serif",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: colors.card, border: `1px solid ${colors.border2}` }}>
            {[
              { val: "all",     label: "All Status" },
              { val: "active",  label: "Active" },
              { val: "used",    label: "Used" },
              { val: "expired", label: "Expired" },
            ].map(f => (
              <button
                key={f.val}
                onClick={() => setStatusFilter(f.val)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: statusFilter === f.val ? "rgba(139,92,246,0.15)" : "transparent",
                  color: statusFilter === f.val ? "#8b5cf6" : colors.muted,
                  border: statusFilter === f.val ? "1px solid rgba(139,92,246,0.3)" : "1px solid transparent",
                  fontFamily: "'Inter',sans-serif",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-2xl overflow-hidden"
          style={{ background: colors.card, border: `1px solid ${colors.border2}` }}
        >
          {/* Table header */}
          <div className="grid gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider"
            style={{
              gridTemplateColumns: "2fr 1.2fr 0.8fr 0.8fr 0.6fr 0.7fr",
              color: colors.muted,
              fontFamily: "'Inter',sans-serif",
              borderBottom: `1px solid ${colors.border}`,
            }}
          >
            <span>Email</span>
            <span>Type</span>
            <span>Status</span>
            <span>Attempts</span>
            <span>Expires</span>
            <span>Sent</span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                <RefreshCw size={20} style={{ color: "#06b6d4" }} />
              </motion.div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <ShieldAlert size={32} style={{ color: colors.dimmest, opacity: 0.3 }} />
              <p className="text-sm" style={{ color: colors.muted, fontFamily: "'Inter',sans-serif" }}>No OTP records found</p>
            </div>
          ) : (
            <AnimatePresence>
              {filtered.map((log: any, i: number) => {
                const isUsed    = !!log.usedAt;
                const isExpired = !isUsed && new Date(log.expiresAt) < new Date();
                const isActive  = !isUsed && !isExpired;
                const statusColor = isUsed ? "#10b981" : isExpired ? "#ef4444" : "#f59e0b";
                const statusLabel = isUsed ? "Used" : isExpired ? "Expired" : "Active";
                const typeConf = TYPE_CONFIG[log.type] ?? { label: log.type, color: "#8b5cf6" };

                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.3) }}
                    className="grid gap-2 px-4 py-3 text-xs items-center transition-colors cursor-default"
                    style={{
                      gridTemplateColumns: "2fr 1.2fr 0.8fr 0.8fr 0.6fr 0.7fr",
                      borderBottom: `1px solid ${colors.border}`,
                      fontFamily: "'Inter',sans-serif",
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = colors.hover}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Mail size={11} style={{ color: colors.dimmer, flexShrink: 0 }} />
                      <span className="truncate font-mono" style={{ color: colors.text2 }}>{log.email}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md text-xs font-medium w-fit"
                      style={{ background: `${typeConf.color}15`, color: typeConf.color, border: `1px solid ${typeConf.color}30` }}>
                      {typeConf.label}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-xs font-medium w-fit"
                      style={{ background: `${statusColor}12`, color: statusColor, border: `1px solid ${statusColor}28` }}>
                      {statusLabel}
                    </span>
                    <span style={{ color: log.attempts > 0 ? "#fbbf24" : colors.dimmer }}>
                      {log.attempts} / 5
                    </span>
                    <span style={{ color: isExpired ? "#ef444480" : colors.dimmer }}>
                      {timeAgo(log.expiresAt)}
                    </span>
                    <span style={{ color: colors.dimmest }}>
                      {timeAgo(log.createdAt)}
                    </span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}

          {filtered.length > 0 && (
            <div className="px-4 py-2.5 flex items-center justify-between"
              style={{ borderTop: `1px solid ${colors.border}` }}>
              <span className="text-xs" style={{ color: colors.dimmest, fontFamily: "'Inter',sans-serif" }}>
                Showing {filtered.length} of {all.length} records
              </span>
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 2.5, repeat: Infinity }}
                className="flex items-center gap-1.5"
              >
                <div className="w-1 h-1 rounded-full" style={{ background: "#22c55e" }} />
                <span className="text-xs" style={{ color: "#22c55e", fontFamily: "'Inter',sans-serif" }}>Auto-refreshes every 30s</span>
              </motion.div>
            </div>
          )}
        </motion.div>
      </div>
  );
}

export default function OtpLogs() {
  return <AdminLayout><OtpLogsInner /></AdminLayout>;
}
