import { motion } from "framer-motion";
import { Lock, ShieldOff } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useAdminTheme } from "@/contexts/AdminThemeContext";

interface Props {
  children: React.ReactNode;
}

export default function SuperAdminGuard({ children }: Props) {
  const { user, isLoading } = useAdminAuth();
  const { colors } = useAdminTheme();

  if (isLoading) return null;

  if (user?.role !== "super_admin") {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center gap-5 text-center max-w-sm px-6"
        >
          {/* Icon */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
            }}
          >
            <ShieldOff size={28} style={{ color: "#f87171" }} />
          </div>

          {/* Text */}
          <div className="space-y-2">
            <h2
              className="text-lg font-bold"
              style={{ fontFamily: "'Space Grotesk',sans-serif", color: colors.text }}
            >
              Super Admin Only
            </h2>
            <p
              className="text-sm leading-relaxed"
              style={{ color: colors.dim, fontFamily: "'Inter',sans-serif" }}
            >
              এই section টি শুধুমাত্র Super Admin access করতে পারবেন।
              <br />
              <span style={{ color: colors.dimmer }}>
                Your role: <span style={{ color: "#f87171" }}>{user?.role ?? "unknown"}</span>
              </span>
            </p>
          </div>

          {/* Lock badge */}
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold"
            style={{
              background: "rgba(239,68,68,0.06)",
              border: "1px solid rgba(239,68,68,0.18)",
              color: "#f87171",
              fontFamily: "'Inter',sans-serif",
            }}
          >
            <Lock size={11} /> Access Restricted
          </div>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
