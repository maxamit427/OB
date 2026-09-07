import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, CheckCircle, XCircle, UserCheck, UserX, Shield,
  RefreshCw, AlertTriangle, Monitor, Globe, Smartphone, Calendar,
  ChevronDown, Activity
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/adminApi";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useToast } from "@/hooks/use-toast";
import { useAdminTheme } from "@/contexts/AdminThemeContext";

type PendingStatus = "pending" | "approved" | "rejected";

const statusCfg: Record<PendingStatus, { color: string; bg: string; border: string; label: string; icon: React.ElementType }> = {
  pending:  { color: "#fbbf24", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.2)",  label: "Pending",  icon: Clock       },
  approved: { color: "#34d399", bg: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.2)",  label: "Approved", icon: CheckCircle },
  rejected: { color: "#f87171", bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.2)",   label: "Rejected", icon: XCircle     },
};
const roleCfg: Record<string, { color: string; bg: string; border: string }> = {
  super_admin: { color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)" },
  admin:       { color: "#06b6d4", bg: "rgba(6,182,212,0.08)",  border: "rgba(6,182,212,0.2)"  },
  moderator:   { color: "#a78bfa", bg: "rgba(167,139,250,0.08)",border: "rgba(167,139,250,0.2)"},
  editor:      { color: "#34d399", bg: "rgba(52,211,153,0.08)", border: "rgba(52,211,153,0.2)" },
};
const ROLE_ASSIGN_OPTIONS = [
  { value: "admin",       label: "Admin"       },
  { value: "super_admin", label: "Super Admin" },
  { value: "moderator",   label: "Moderator"   },
  { value: "editor",      label: "Editor"      },
];

function getTimeAgo(iso: string) {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60)    return `${sec}s ago`;
  if (sec < 3600)  return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

function DeviceIcon({ ua }: { ua: string }) {
  if (/Mobile|Android|iPhone/i.test(ua)) return <Smartphone size={11} />;
  return <Monitor size={11} />;
}

function ApproveModal({
  pending, onConfirm, onClose, loading,
}: { pending: any; onConfirm: (role: string) => void; onClose: () => void; loading: boolean }) {
  const [role, setRole]       = useState("admin");
  const [dropOpen, setDropOpen] = useState(false);
  const selected = ROLE_ASSIGN_OPTIONS.find(r => r.value === role)!;
  const rc = roleCfg[role] || roleCfg.admin;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(10px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.28 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm rounded-[22px] p-[2px]"
        style={{ background: "linear-gradient(163deg, #00ff75 0%, #3700ff 100%)" }}
      >
        <div className="rounded-[20px] p-6" style={{ background: "#171717" }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)" }}>
              <UserCheck size={18} style={{ color: "#34d399" }} />
            </div>
            <div>
              <p className="font-semibold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>Approve Request</p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "'Inter',sans-serif" }}>@{pending.username}</p>
            </div>
          </div>

          <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Inter',sans-serif" }}>
            Assign role for this user:
          </p>

          <div className="relative mb-5">
            <button type="button" onClick={() => setDropOpen(o => !o)}
              className="w-full flex items-center gap-2 rounded-full px-4 py-3"
              style={{ background: "#1a1a1a", boxShadow: "inset 2px 5px 10px rgb(5,5,5)" }}>
              <Shield size={16} style={{ color: rc.color, flexShrink: 0 }} />
              <span className="flex-1 text-sm text-left" style={{ color: "#d3d3d3", fontFamily: "'Inter',sans-serif" }}>{selected.label}</span>
              <motion.div animate={{ rotate: dropOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown size={13} style={{ color: "rgba(255,255,255,0.3)" }} />
              </motion.div>
            </button>
            <AnimatePresence>
              {dropOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 right-0 top-full mt-1 rounded-2xl overflow-hidden z-50"
                  style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}
                >
                  {ROLE_ASSIGN_OPTIONS.map(opt => {
                    const orc = roleCfg[opt.value] || roleCfg.admin;
                    return (
                      <button key={opt.value} type="button" onClick={() => { setRole(opt.value); setDropOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                        style={{ background: role === opt.value ? orc.bg : "transparent" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = role === opt.value ? orc.bg : "transparent"}
                      >
                        <div className="w-2 h-2 rounded-full" style={{ background: orc.color }} />
                        <span className="text-sm" style={{ color: "#d3d3d3", fontFamily: "'Inter',sans-serif" }}>{opt.label}</span>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
              onClick={() => onConfirm(role)}
              disabled={loading}
              className="flex-1 py-2.5 rounded-full text-sm font-medium text-white flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: "#252525", fontFamily: "'Space Grotesk',sans-serif" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#000"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#252525"}
            >
              {loading
                ? <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(255,255,255,0.25)", borderTopColor: "#fff" }} />
                : <><UserCheck size={13} /> Approve</>}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
              onClick={onClose}
              className="flex-1 py-2.5 rounded-full text-sm font-medium"
              style={{ background: "#252525", color: "rgba(255,255,255,0.5)", fontFamily: "'Inter',sans-serif" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#000"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#252525"}
            >
              Cancel
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function RejectModal({
  pending, onConfirm, onClose, loading,
}: { pending: any; onConfirm: (reason: string) => void; onClose: () => void; loading: boolean }) {
  const [reason, setReason] = useState("");

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(10px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.28 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm rounded-[22px] p-[2px]"
        style={{ background: "linear-gradient(163deg, #ff0057 0%, #3700ff 100%)" }}
      >
        <div className="rounded-[20px] p-6" style={{ background: "#171717" }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <UserX size={18} style={{ color: "#f87171" }} />
            </div>
            <div>
              <p className="font-semibold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>Reject Request</p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "'Inter',sans-serif" }}>@{pending.username}</p>
            </div>
          </div>

          <div className="rounded-full px-4 py-3 mb-5" style={{ background: "#1a1a1a", boxShadow: "inset 2px 5px 10px rgb(5,5,5)" }}>
            <input type="text" value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Reason (optional)"
              className="w-full bg-transparent border-none outline-none text-sm"
              style={{ color: "#d3d3d3", fontFamily: "'Inter',sans-serif" }}
            />
          </div>

          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
              onClick={() => onConfirm(reason)}
              disabled={loading}
              className="flex-1 py-2.5 rounded-full text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", fontFamily: "'Space Grotesk',sans-serif" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.25)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.15)"}
            >
              {loading
                ? <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(239,68,68,0.25)", borderTopColor: "#f87171" }} />
                : <><UserX size={13} /> Reject</>}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
              onClick={onClose}
              className="flex-1 py-2.5 rounded-full text-sm font-medium"
              style={{ background: "#252525", color: "rgba(255,255,255,0.5)", fontFamily: "'Inter',sans-serif" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#000"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#252525"}
            >
              Cancel
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function PendingUsersContent() {
  const { colors } = useAdminTheme();
  const { user: currentUser } = useAdminAuth();
  const { toast }             = useToast();
  const queryClient           = useQueryClient();

  const [approveTarget, setApproveTarget] = useState<any>(null);
  const [rejectTarget,  setRejectTarget]  = useState<any>(null);
  const [filter,        setFilter]        = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [activityTab,   setActivityTab]   = useState(false);

  const { data: pendingData, isLoading, refetch } = useQuery({
    queryKey: ["admin-pending-users"],
    queryFn:  () => adminApi.getPendingUsers(),
    refetchInterval: 15000,
  });

  const { data: activityData, isLoading: actLoading } = useQuery({
    queryKey: ["admin-activity-logs"],
    queryFn:  () => adminApi.getActivityLogs(100),
    enabled:  activityTab,
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => adminApi.approvePendingUser(id, role),
    onSuccess: () => {
      toast({ title: "User approved successfully" });
      setApproveTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin-pending-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminApi.rejectPendingUser(id, reason),
    onSuccess: () => {
      toast({ title: "Request rejected" });
      setRejectTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin-pending-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (currentUser?.role !== "super_admin") {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertTriangle size={36} style={{ color: "#f59e0b", opacity: 0.5 }} />
        <p className="text-sm" style={{ color: colors.dim, fontFamily: "'Inter',sans-serif" }}>
          Only Super Admin can access this section
        </p>
      </div>
    );
  }

  const allItems: any[] = pendingData?.data ?? [];
  const filtered = filter === "all" ? allItems : allItems.filter(p => p.status === filter);
  const counts = {
    all:      allItems.length,
    pending:  allItems.filter(p => p.status === "pending").length,
    approved: allItems.filter(p => p.status === "approved").length,
    rejected: allItems.filter(p => p.status === "rejected").length,
  };
  const activityLogs: any[] = activityData?.data ?? [];

  const actEventCfg: Record<string, { color: string; label: string }> = {
    login:           { color: "#34d399", label: "Login"     },
    logout:          { color: "#94a3b8", label: "Logout"    },
    signup_request:  { color: "#fbbf24", label: "Signup"    },
    signup_approved: { color: "#06b6d4", label: "Approved"  },
    signup_rejected: { color: "#f87171", label: "Rejected"  },
    password_change: { color: "#a78bfa", label: "Pw Change" },
    page_view:       { color: "#475569", label: "View"      },
  };

  return (
    <>
      <div className="max-w-5xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-semibold" style={{ fontFamily: "'Space Grotesk',sans-serif", color: colors.text }}>
              {activityTab ? "Activity Logs" : "Signup Requests"}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: colors.dim, fontFamily: "'Inter',sans-serif" }}>
              {activityTab ? "Full user activity history" : "Manage pending admin signup requests"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl p-1" style={{ background: colors.input, border: `1px solid ${colors.border}` }}>
              <button
                onClick={() => setActivityTab(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={!activityTab
                  ? { background: "rgba(6,182,212,0.12)", color: "#06b6d4", border: "1px solid rgba(6,182,212,0.25)", fontFamily: "'Inter',sans-serif" }
                  : { color: colors.dimmer, fontFamily: "'Inter',sans-serif" }
                }
              >
                <div className="flex items-center gap-1.5">
                  <UserCheck size={11} />
                  Requests
                  {counts.pending > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-xs font-bold"
                      style={{ background: "rgba(245,158,11,0.2)", color: "#fbbf24" }}>
                      {counts.pending}
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => setActivityTab(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={activityTab
                  ? { background: "rgba(6,182,212,0.12)", color: "#06b6d4", border: "1px solid rgba(6,182,212,0.25)", fontFamily: "'Inter',sans-serif" }
                  : { color: colors.dimmer, fontFamily: "'Inter',sans-serif" }
                }
              >
                <div className="flex items-center gap-1.5">
                  <Activity size={11} />
                  Activity
                </div>
              </button>
            </div>
            <motion.button
              whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.92 }}
              onClick={() => refetch()}
              className="p-2 rounded-xl transition-colors"
              style={{ background: colors.hover, border: `1px solid ${colors.border}`, color: colors.muted }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = colors.text}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = colors.muted}
            >
              <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            </motion.button>
          </div>
        </div>

        {!activityTab ? (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(["all", "pending", "approved", "rejected"] as const).map((s, i) => {
                const cfg = s === "all"
                  ? { color: "#06b6d4", bg: "rgba(6,182,212,0.08)", border: "rgba(6,182,212,0.15)" }
                  : { ...statusCfg[s] };
                return (
                  <motion.button
                    key={s}
                    onClick={() => setFilter(s)}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -2, transition: { duration: 0.15 } }}
                    transition={{ delay: i * 0.04 }}
                    className="rounded-xl p-3 text-left transition-all"
                    style={{
                      background: filter === s ? cfg.bg : colors.card,
                      border:     `1px solid ${filter === s ? cfg.border : colors.border2}`,
                    }}
                  >
                    <p className="text-xl font-bold tabular-nums" style={{ color: cfg.color, fontFamily: "'Space Grotesk',sans-serif" }}>{counts[s]}</p>
                    <p className="text-xs mt-0.5 capitalize" style={{ color: colors.muted, fontFamily: "'Inter',sans-serif" }}>{s === "all" ? "Total" : s}</p>
                  </motion.button>
                );
              })}
            </div>

            {/* List */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl overflow-hidden"
              style={{ background: colors.card, border: `1px solid ${colors.border2}` }}
            >
              <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: `1px solid ${colors.border}` }}>
                <div className="flex items-center gap-2">
                  <Shield size={13} style={{ color: "#06b6d4" }} />
                  <span className="text-sm font-semibold" style={{ fontFamily: "'Space Grotesk',sans-serif", color: colors.text }}>
                    Signup Requests
                  </span>
                  <span className="text-xs font-mono" style={{ color: colors.dimmer }}>{filtered.length} records</span>
                </div>
              </div>

              {isLoading ? (
                <div className="flex flex-col gap-2 p-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: colors.hover }} />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <UserCheck size={36} className="mb-3" style={{ color: colors.dimmest, opacity: 0.25 }} />
                  <p className="text-xs" style={{ color: colors.dimmer, fontFamily: "'Inter',sans-serif" }}>No requests found</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: colors.border }}>
                  <AnimatePresence>
                    {filtered.map((item, i) => {
                      const sc = statusCfg[item.status as PendingStatus] || statusCfg.pending;
                      const rc = roleCfg[item.requestedRole] || roleCfg.admin;
                      const StatusIcon = sc.icon;
                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: Math.min(i * 0.04, 0.3) }}
                          className="flex items-center gap-4 px-5 py-4 flex-wrap sm:flex-nowrap"
                          style={{ transition: "background 0.12s" }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = colors.hover}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                        >
                          {/* Avatar */}
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-semibold text-sm text-white flex-shrink-0"
                            style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.2), rgba(139,92,246,0.2))", border: "1px solid rgba(6,182,212,0.15)" }}>
                            {item.username?.[0]?.toUpperCase()}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold" style={{ fontFamily: "'Space Grotesk',sans-serif", color: colors.text }}>
                                {item.fullName}
                              </span>
                              <span className="text-xs font-mono" style={{ color: colors.dimmer }}>@{item.username}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap mt-0.5">
                              <span className="text-xs" style={{ color: colors.dim, fontFamily: "'Inter',sans-serif" }}>{item.email}</span>
                              <span className="text-xs flex items-center gap-1" style={{ color: colors.dimmer }}>
                                <DeviceIcon ua={item.userAgent} /> {item.ip}
                              </span>
                              <span className="text-xs flex items-center gap-1" style={{ color: colors.dimmest }}>
                                <Calendar size={10} /> {getTimeAgo(item.createdAt)}
                              </span>
                            </div>
                          </div>

                          {/* Badges */}
                          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                            <span className="text-xs px-2 py-0.5 rounded-md font-medium capitalize"
                              style={{ background: rc.bg, color: rc.color, border: `1px solid ${rc.border}`, fontFamily: "'Inter',sans-serif" }}>
                              {item.requestedRole.replace("_", " ")}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-md font-medium flex items-center gap-1"
                              style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, fontFamily: "'Inter',sans-serif" }}>
                              <StatusIcon size={10} /> {sc.label}
                            </span>
                          </div>

                          {/* Actions */}
                          {item.status === "pending" && (
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <motion.button
                                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }}
                                onClick={() => setApproveTarget(item)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
                                style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", color: "#34d399", fontFamily: "'Inter',sans-serif" }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(52,211,153,0.15)"}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(52,211,153,0.08)"}
                              >
                                <UserCheck size={11} /> Approve
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }}
                                onClick={() => setRejectTarget(item)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
                                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", fontFamily: "'Inter',sans-serif" }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.15)"}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.08)"}
                              >
                                <UserX size={11} /> Reject
                              </motion.button>
                            </div>
                          )}

                          {item.status !== "pending" && (
                            <div className="text-xs flex-shrink-0" style={{ color: colors.dimmer, fontFamily: "'Inter',sans-serif" }}>
                              by {item.reviewedBy || "—"}
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          </>
        ) : (
          /* Activity Logs */
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl overflow-hidden"
            style={{ background: colors.card, border: `1px solid ${colors.border2}` }}
          >
            <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: `1px solid ${colors.border}` }}>
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: "#22c55e" }}
                />
                <Activity size={13} style={{ color: "#06b6d4" }} />
                <span className="text-sm font-semibold" style={{ fontFamily: "'Space Grotesk',sans-serif", color: colors.text }}>Activity Stream</span>
                <span className="text-xs font-mono" style={{ color: colors.dimmer }}>{activityLogs.length} records</span>
              </div>
              <span className="text-xs" style={{ color: "#22c55e", fontFamily: "'Inter',sans-serif" }}>Live</span>
            </div>

            <div className="max-h-[560px] overflow-y-auto font-mono">
              {actLoading ? (
                <div className="flex flex-col gap-2 p-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: colors.hover }} />
                  ))}
                </div>
              ) : activityLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Activity size={36} className="mb-3" style={{ color: colors.dimmest, opacity: 0.25 }} />
                  <p className="text-xs" style={{ color: colors.dimmer, fontFamily: "'Inter',sans-serif" }}>No activity recorded yet</p>
                </div>
              ) : (
                <AnimatePresence>
                  {activityLogs.map((log, i) => {
                    const ec = actEventCfg[log.event] || { color: colors.muted, label: log.event };
                    return (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(i * 0.012, 0.3) }}
                        className="flex items-center gap-4 px-5 py-3 transition-colors"
                        style={{ borderBottom: `1px solid ${colors.border}` }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = colors.hover}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                      >
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: ec.color }} />
                        <span className="text-xs flex-shrink-0 w-20 tabular-nums" style={{ color: colors.dimmer }}>
                          {new Date(log.createdAt).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </span>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-md flex-shrink-0 w-20 text-center"
                          style={{ background: `${ec.color}18`, color: ec.color, border: `1px solid ${ec.color}30`, fontFamily: "'Inter',sans-serif" }}>
                          {ec.label}
                        </span>
                        <span className="text-xs flex-shrink-0 w-28 truncate font-semibold" style={{ color: colors.text2 }}>@{log.username}</span>
                        <span className="text-xs flex-1 min-w-0 truncate" style={{ color: colors.dim }}>{log.details}</span>
                        <div className="flex items-center gap-2 flex-shrink-0 hidden md:flex">
                          <span className="text-xs flex items-center gap-1" style={{ color: colors.dimmer }}>
                            <Globe size={9} /> {log.ip || "—"}
                          </span>
                          <span className="text-xs flex items-center gap-1" style={{ color: colors.dimmer }}>
                            <Monitor size={9} /> {log.device}
                          </span>
                          <span className="text-xs" style={{ color: colors.dimmer }}>{log.browser}</span>
                        </div>
                        <span className="text-xs flex-shrink-0 w-14 text-right" style={{ color: colors.dimmest }}>
                          {getTimeAgo(log.createdAt)}
                        </span>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {approveTarget && (
          <ApproveModal
            pending={approveTarget}
            onConfirm={role => approveMutation.mutate({ id: approveTarget.id, role })}
            onClose={() => setApproveTarget(null)}
            loading={approveMutation.isPending}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {rejectTarget && (
          <RejectModal
            pending={rejectTarget}
            onConfirm={reason => rejectMutation.mutate({ id: rejectTarget.id, reason })}
            onClose={() => setRejectTarget(null)}
            loading={rejectMutation.isPending}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default function PendingUsers() {
  return (
    <AdminLayout>
      <PendingUsersContent />
    </AdminLayout>
  );
}
