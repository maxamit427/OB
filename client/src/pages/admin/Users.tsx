import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Key, Eye, EyeOff, CheckCircle, Lock, Trash2, UserCheck, UserX, AlertTriangle, RefreshCw } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/adminApi";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useToast } from "@/hooks/use-toast";
import { useAdminTheme } from "@/contexts/AdminThemeContext";

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Required"),
  newPassword:     z.string().min(6, "Min 6 characters"),
  confirmPassword: z.string().min(1, "Required"),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});
type PasswordForm = z.infer<typeof passwordSchema>;

function PasswordField({ label, show, onToggle, registration, error, icon: Icon = Lock, colors }: any) {
  const inputBase: React.CSSProperties = {
    background: colors.input,
    border:     `1px solid ${colors.inputBorder}`,
    color:      colors.text,
    outline:    "none",
    fontFamily: "monospace",
  };
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: colors.muted, fontFamily: "'Inter',sans-serif" }}>{label}</label>
      <div className="relative">
        <Icon size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: colors.dimmer }} />
        <input
          {...registration}
          type={show ? "text" : "password"}
          className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm"
          style={inputBase}
          placeholder="••••••••"
          onFocus={(e: any) => (e.currentTarget.style.borderColor = "rgba(6,182,212,0.45)")}
          onBlur={(e: any) => (e.currentTarget.style.borderColor = colors.inputBorder)}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
          style={{ color: colors.dimmer }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = colors.muted}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = colors.dimmer}
        >
          {show ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
      </div>
      {error && <p className="text-xs text-red-400 mt-1.5" style={{ fontFamily: "'Inter',sans-serif" }}>{error}</p>}
    </div>
  );
}

function UsersContent() {
  const { colors } = useAdminTheme();
  const { user: currentUser } = useAdminAuth();
  const { toast }             = useToast();
  const queryClient           = useQueryClient();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [show, setShow] = useState({ current: false, new: false, confirm: false });
  const [pwSuccess, setPwSuccess] = useState(false);

  const { data: usersData, isLoading, refetch } = useQuery({
    queryKey: ["admin-users"],
    queryFn:  () => adminApi.getUsers(),
  });
  const users = usersData?.data ?? [];

  const { register: registerPw, handleSubmit: handlePwSubmit, reset: resetPw, formState: { errors: pwErrors } } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  const changePwMutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      adminApi.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      toast({ title: "Password updated" });
      resetPw();
      setPwSuccess(true);
      setTimeout(() => setPwSuccess(false), 4000);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => {
      toast({ title: "User deleted" });
      setDeleteConfirm(null);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const roleColors: Record<string, { bg: string; color: string; border: string }> = {
    super_admin: { bg: "rgba(139,92,246,0.1)", color: "#a78bfa", border: "rgba(139,92,246,0.25)" },
    admin:       { bg: "rgba(6,182,212,0.1)",  color: "#06b6d4", border: "rgba(6,182,212,0.25)"  },
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold" style={{ fontFamily: "'Space Grotesk',sans-serif", color: colors.text }}>Account</h2>
          <p className="text-xs mt-0.5" style={{ color: colors.dim, fontFamily: "'Inter',sans-serif" }}>Admin credentials management</p>
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

      {/* Active admins */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl overflow-hidden"
        style={{ background: colors.card, border: `1px solid ${colors.border2}` }}
      >
        <div className="px-5 py-4" style={{ borderBottom: `1px solid ${colors.border}` }}>
          <div className="flex items-center gap-2">
            <UserCheck size={14} style={{ color: "#06b6d4" }} />
            <span className="text-sm font-semibold" style={{ fontFamily: "'Space Grotesk',sans-serif", color: colors.text }}>Admin accounts</span>
          </div>
        </div>
        <div className="p-5">
          {isLoading ? (
            <div className="h-16 rounded-xl animate-pulse" style={{ background: colors.hover }} />
          ) : (
            <div className="space-y-2">
              {users.map((u: any, idx: number) => {
                const isSelf = currentUser?.username === u.username;
                const rc     = roleColors[u.role] || roleColors.admin;
                return (
                  <motion.div
                    key={u.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileHover={{ x: 3, transition: { duration: 0.15 } }}
                    transition={{ delay: idx * 0.04 }}
                    className="flex items-center gap-4 px-4 py-3 rounded-xl"
                    style={{
                      background: isSelf ? "rgba(6,182,212,0.05)" : colors.hover,
                      border:     isSelf ? "1px solid rgba(6,182,212,0.18)" : `1px solid ${colors.border}`,
                      transition: "border-color 0.15s",
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-semibold text-sm text-white flex-shrink-0"
                      style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.3), rgba(139,92,246,0.3))", border: "1px solid rgba(6,182,212,0.2)" }}
                    >
                      {u.username[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold" style={{ fontFamily: "'Space Grotesk',sans-serif", color: colors.text }}>
                          {u.username}
                        </span>
                        {isSelf && (
                          <span className="text-xs px-1.5 py-0.5 rounded-md font-medium"
                            style={{ background: "rgba(6,182,212,0.1)", color: "#06b6d4", border: "1px solid rgba(6,182,212,0.22)", fontFamily: "'Inter',sans-serif" }}>
                            You
                          </span>
                        )}
                        <span className="text-xs px-1.5 py-0.5 rounded-md font-medium capitalize"
                          style={{ background: rc.bg, color: rc.color, border: `1px solid ${rc.border}`, fontFamily: "'Inter',sans-serif" }}>
                          {u.role?.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5 font-mono" style={{ color: colors.dimmer }}>
                        Since {new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    {!isSelf && users.length > 1 && (
                      <motion.button
                        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        onClick={() => setDeleteConfirm(u.id)}
                        className="p-2 rounded-lg transition-colors"
                        style={{ background: colors.hover, color: colors.dim, border: `1px solid ${colors.border}` }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.color       = "#f87171";
                          (e.currentTarget as HTMLElement).style.borderColor = "rgba(239,68,68,0.3)";
                          (e.currentTarget as HTMLElement).style.background  = "rgba(239,68,68,0.08)";
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.color       = colors.dim;
                          (e.currentTarget as HTMLElement).style.borderColor = colors.border;
                          (e.currentTarget as HTMLElement).style.background  = colors.hover;
                        }}
                      >
                        <Trash2 size={13} />
                      </motion.button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>

      {/* Change password */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="rounded-2xl overflow-hidden"
        style={{ background: colors.card, border: `1px solid ${colors.border2}` }}
      >
        <div className="px-5 py-4" style={{ borderBottom: `1px solid ${colors.border}` }}>
          <div className="flex items-center gap-2">
            <Key size={14} style={{ color: "#a78bfa" }} />
            <span className="text-sm font-semibold" style={{ fontFamily: "'Space Grotesk',sans-serif", color: colors.text }}>Change password</span>
          </div>
        </div>
        <div className="p-5">
          <form onSubmit={handlePwSubmit(data => changePwMutation.mutate(data))} className="space-y-3">
            <PasswordField label="Current password" show={show.current} onToggle={() => setShow(s => ({ ...s, current: !s.current }))} registration={registerPw("currentPassword")} error={pwErrors.currentPassword?.message} icon={Lock} colors={colors} />
            <PasswordField label="New password" show={show.new} onToggle={() => setShow(s => ({ ...s, new: !s.new }))} registration={registerPw("newPassword")} error={pwErrors.newPassword?.message} icon={Key} colors={colors} />
            <PasswordField label="Confirm new password" show={show.confirm} onToggle={() => setShow(s => ({ ...s, confirm: !s.confirm }))} registration={registerPw("confirmPassword")} error={pwErrors.confirmPassword?.message} icon={Key} colors={colors} />

            <AnimatePresence>
              {pwSuccess && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.18)" }}>
                    <CheckCircle size={13} style={{ color: "#34d399" }} />
                    <span className="text-xs" style={{ color: "#34d399", fontFamily: "'Inter',sans-serif" }}>Password updated successfully</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={changePwMutation.isPending}
              className="w-full py-2.5 rounded-xl font-semibold text-white text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #7c3aed, #0891b2)", fontFamily: "'Space Grotesk',sans-serif" }}
            >
              {changePwMutation.isPending ? (
                <><div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> Updating...</>
              ) : (
                <><Key size={13} /> Update password</>
              )}
            </motion.button>
          </form>
        </div>
      </motion.div>

      {/* Security note */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="flex items-start gap-3 px-4 py-3 rounded-xl"
        style={{ background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.12)" }}
      >
        <AlertTriangle size={13} style={{ color: "#f59e0b" }} className="flex-shrink-0 mt-0.5" />
        <p className="text-xs leading-relaxed" style={{ color: "#b45309", fontFamily: "'Inter',sans-serif" }}>
          Change your password regularly to maintain account security.
        </p>
      </motion.div>

      {/* Delete confirm dialog */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }}
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              onClick={e => e.stopPropagation()}
              className="rounded-2xl p-6 w-80 shadow-2xl"
              style={{ background: colors.card2, border: "1px solid rgba(239,68,68,0.28)" }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)" }}>
                  <AlertTriangle size={17} style={{ color: "#f87171" }} />
                </div>
                <div>
                  <p className="font-semibold" style={{ fontFamily: "'Space Grotesk',sans-serif", color: colors.text }}>Delete user?</p>
                  <p className="text-xs" style={{ color: colors.muted, fontFamily: "'Inter',sans-serif" }}>This cannot be undone</p>
                </div>
              </div>
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
                  onClick={() => deleteUserMutation.mutate(deleteConfirm!)}
                  disabled={deleteUserMutation.isPending}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: "rgba(239,68,68,0.14)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", fontFamily: "'Space Grotesk',sans-serif" }}
                >
                  {deleteUserMutation.isPending ? "Deleting..." : <><UserX size={13} /> Delete</>}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: colors.input, border: `1px solid ${colors.inputBorder}`, color: colors.muted, fontFamily: "'Inter',sans-serif" }}
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Users() {
  return (
    <AdminLayout>
      <UsersContent />
    </AdminLayout>
  );
}
