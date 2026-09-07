import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Search, Ban, CheckCircle, Trash2, Shield, ShieldOff,
  User, Mail, Clock, Globe, RefreshCw, ChevronDown, X,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/adminApi";
import { useToast } from "@/hooks/use-toast";
import { useAdminTheme } from "@/contexts/AdminThemeContext";

interface PublicUser {
  id:               string;
  name:             string;
  username:         string;
  email:            string;
  role:             string;
  isEmailVerified:  boolean;
  isBanned:         boolean;
  banReason?:       string;
  provider:         string;
  createdAt:        string;
  lastLoginAt?:     string;
  lastSeenAt?:      string;
  ipAddress?:       string;
}

function timeAgo(iso?: string): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return "Just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function UserDetailModal({ user, onClose, colors }: { user: PublicUser; onClose: () => void; colors: any }) {
  const qc            = useQueryClient();
  const { toast }     = useToast();
  const [banReason,   setBanReason]   = useState(user.banReason || "");
  const [showBanForm, setShowBanForm] = useState(false);

  const banMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminApi.banPublicUser(id, reason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/public-users"] }); toast({ title: "User banned" }); onClose(); },
    onError:   (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const unbanMutation = useMutation({
    mutationFn: (id: string) => adminApi.unbanPublicUser(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/public-users"] }); toast({ title: "User unbanned" }); onClose(); },
    onError:   (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deletePublicUser(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/public-users"] }); toast({ title: "User deleted" }); onClose(); },
    onError:   (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const verifyMutation = useMutation({
    mutationFn: (id: string) => adminApi.verifyPublicUser(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/public-users"] }); toast({ title: "Email marked verified" }); onClose(); },
    onError:   (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const fields: [string, string][] = [
    ["ID",          user.id                                      ],
    ["Email",       user.email                                   ],
    ["Provider",    user.provider                                ],
    ["Role",        user.role                                    ],
    ["Joined",      new Date(user.createdAt).toLocaleDateString()],
    ["Last login",  user.lastLoginAt ? timeAgo(user.lastLoginAt) : "Never"],
    ["Last seen",   user.lastSeenAt  ? timeAgo(user.lastSeenAt)  : "Never"],
    ["IP address",  user.ipAddress || "Unknown"                  ],
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.8)" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: colors.bg, border: `1px solid ${colors.border2}` }}
      >
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: colors.border }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm" style={{ background: "linear-gradient(135deg, #06b6d4, #8b5cf6)", color: "#fff" }}>
              {user.name[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: colors.text, fontFamily: "'Space Grotesk',sans-serif" }}>{user.name}</p>
              <p className="text-xs" style={{ color: colors.dim }}>@{user.username}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ color: colors.dim }} className="hover:text-white transition-colors"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Status badges */}
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-1 rounded-lg text-xs font-medium" style={{ background: user.isEmailVerified ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)", border: `1px solid ${user.isEmailVerified ? "rgba(16,185,129,0.25)" : "rgba(245,158,11,0.25)"}`, color: user.isEmailVerified ? "#34d399" : "#fbbf24" }}>
              {user.isEmailVerified ? "Email verified" : "Email unverified"}
            </span>
            {user.isBanned && (
              <span className="px-2 py-1 rounded-lg text-xs font-medium" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}>
                Banned{user.banReason ? `: ${user.banReason}` : ""}
              </span>
            )}
          </div>

          {/* Fields */}
          <div className="grid grid-cols-2 gap-2">
            {fields.map(([k, v]) => (
              <div key={k} className="p-2.5 rounded-xl" style={{ background: colors.hover, border: `1px solid ${colors.border}` }}>
                <p className="text-xs mb-0.5" style={{ color: colors.dimmer }}>{k}</p>
                <p className="text-xs font-medium truncate" style={{ color: colors.text2, fontFamily: "'Inter',sans-serif" }}>{v}</p>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-1">
            {!user.isEmailVerified && (
              <button onClick={() => verifyMutation.mutate(user.id)} disabled={verifyMutation.isPending} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium transition-colors" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", color: "#34d399" }}>
                <CheckCircle size={13} /> Mark email verified
              </button>
            )}

            {user.isBanned ? (
              <button onClick={() => unbanMutation.mutate(user.id)} disabled={unbanMutation.isPending} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium transition-colors" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", color: "#34d399" }}>
                <Shield size={13} /> Unban user
              </button>
            ) : (
              <>
                <button onClick={() => setShowBanForm(s => !s)} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium transition-colors" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#fbbf24" }}>
                  <Ban size={13} /> Ban user <ChevronDown size={11} className={showBanForm ? "rotate-180" : ""} style={{ transition: "transform 0.2s" }} />
                </button>
                <AnimatePresence>
                  {showBanForm && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="space-y-2 pt-1">
                        <input value={banReason} onChange={e => setBanReason(e.target.value)} placeholder="Reason for ban (optional)" className="w-full px-3 py-2 rounded-xl text-xs outline-none" style={{ background: colors.input, border: `1px solid ${colors.inputBorder}`, color: colors.text, fontFamily: "'Inter',sans-serif" }} />
                        <button onClick={() => banMutation.mutate({ id: user.id, reason: banReason })} disabled={banMutation.isPending} className="w-full py-2 rounded-xl text-xs font-semibold transition-colors" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}>
                          Confirm ban
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}

            <button onClick={() => { if (confirm("Delete this user permanently?")) deleteMutation.mutate(user.id); }} disabled={deleteMutation.isPending} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium transition-colors" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", color: "#f87171" }}>
              <Trash2 size={13} /> Delete user
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function PublicUsersContent() {
  const { colors } = useAdminTheme();
  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "verified" | "unverified" | "banned">("all");
  const [selectedUser, setSelectedUser] = useState<PublicUser | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/admin/public-users"],
    queryFn:  () => adminApi.getPublicUsers(),
    refetchInterval: 30000,
  });

  const users: PublicUser[] = data?.data ?? [];

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q || u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchFilter = filterStatus === "all"
      ? true
      : filterStatus === "banned"      ? u.isBanned
      : filterStatus === "verified"    ? u.isEmailVerified && !u.isBanned
      : /* unverified */                 !u.isEmailVerified && !u.isBanned;
    return matchSearch && matchFilter;
  });

  const stats = {
    total:      users.length,
    verified:   users.filter(u => u.isEmailVerified && !u.isBanned).length,
    unverified: users.filter(u => !u.isEmailVerified && !u.isBanned).length,
    banned:     users.filter(u => u.isBanned).length,
  };

  const statCards = [
    { label: "Total users",   value: stats.total,      color: "#06b6d4" },
    { label: "Verified",      value: stats.verified,   color: "#10b981" },
    { label: "Unverified",    value: stats.unverified, color: "#f59e0b" },
    { label: "Banned",        value: stats.banned,     color: "#ef4444" },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold" style={{ fontFamily: "'Space Grotesk',sans-serif", color: colors.text }}>Public Users</h2>
          <p className="text-xs mt-0.5" style={{ color: colors.dim, fontFamily: "'Inter',sans-serif" }}>Manage registered public users</p>
        </div>
        <button onClick={() => refetch()} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs transition-colors" style={{ background: colors.hover, border: `1px solid ${colors.border}`, color: colors.dim }}>
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-2xl p-4 cursor-pointer transition-all"
            style={{ background: colors.card, border: `1px solid ${colors.border2}` }}
            onClick={() => setFilterStatus(["all", "verified", "unverified", "banned"][i] as any)}
          >
            <p className="text-2xl font-bold tabular-nums" style={{ color: s.color, fontFamily: "'Space Grotesk',sans-serif" }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: colors.dim, fontFamily: "'Inter',sans-serif" }}>{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: colors.dim }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, username, or email..."
            className="w-full pl-8 pr-4 py-2.5 rounded-xl text-sm outline-none transition-colors"
            style={{ background: colors.input, border: `1px solid ${colors.inputBorder}`, color: colors.text, fontFamily: "'Inter',sans-serif" }}
            onFocus={e => (e.currentTarget.style.borderColor = "rgba(6,182,212,0.4)")}
            onBlur={e => (e.currentTarget.style.borderColor = colors.inputBorder)}
            data-testid="input-search-users"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as any)}
          className="px-3 py-2 rounded-xl text-sm outline-none"
          style={{ background: colors.input, border: `1px solid ${colors.inputBorder}`, color: colors.text, fontFamily: "'Inter',sans-serif" }}
        >
          <option value="all">All users</option>
          <option value="verified">Verified</option>
          <option value="unverified">Unverified</option>
          <option value="banned">Banned</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: colors.card, border: `1px solid ${colors.border2}` }}>
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: colors.hover }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Users size={28} style={{ color: colors.dimmer, margin: "0 auto 8px" }} />
            <p className="text-sm" style={{ color: colors.dim }}>
              {search ? "No users match your search" : "No public users yet"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                  {["User", "Email", "Provider", "Status", "Last seen", ""].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium" style={{ color: colors.muted, fontFamily: "'Inter',sans-serif" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => (
                  <motion.tr
                    key={u.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="transition-colors cursor-pointer"
                    style={{ borderBottom: `1px solid ${colors.border}` }}
                    onMouseEnter={e => (e.currentTarget.style.background = colors.hover)}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    onClick={() => setSelectedUser(u)}
                    data-testid={`row-user-${u.id}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0" style={{ background: "linear-gradient(135deg, #06b6d4, #8b5cf6)", color: "#fff" }}>
                          {u.name[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: colors.text, fontFamily: "'Inter',sans-serif" }}>{u.name}</p>
                          <p className="text-xs truncate" style={{ color: colors.dim }}>@{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs truncate max-w-[160px]" style={{ color: colors.dim, fontFamily: "'Inter',sans-serif" }}>{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 rounded-lg capitalize" style={{ background: colors.hover, color: colors.text2, fontFamily: "'Inter',sans-serif" }}>{u.provider}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 rounded-lg" style={{
                        background: u.isBanned ? "rgba(239,68,68,0.1)" : u.isEmailVerified ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
                        color:      u.isBanned ? "#f87171"              : u.isEmailVerified ? "#34d399"              : "#fbbf24",
                        border:     `1px solid ${u.isBanned ? "rgba(239,68,68,0.2)" : u.isEmailVerified ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)"}`,
                      }}>
                        {u.isBanned ? "Banned" : u.isEmailVerified ? "Verified" : "Unverified"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs" style={{ color: colors.dimmer }}>{timeAgo(u.lastSeenAt || u.lastLoginAt)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <button className="p-1.5 rounded-lg transition-colors" style={{ color: colors.dim }} onMouseEnter={e => (e.currentTarget.style.color = "#06b6d4")} onMouseLeave={e => (e.currentTarget.style.color = colors.dim)}>
                        <User size={13} />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedUser && (
        <UserDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} colors={colors} />
      )}
    </div>
  );
}

export default function PublicUsers() {
  return <AdminLayout><PublicUsersContent /></AdminLayout>;
}
