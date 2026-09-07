import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, AlertTriangle, Terminal, Eye, Activity, Lock, RefreshCw } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/adminApi";
import { useState, useEffect, useRef } from "react";
import { useAdminTheme } from "@/contexts/AdminThemeContext";

function getTimeAgo(iso: string) {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60)    return `${sec}s ago`;
  if (sec < 3600)  return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

const sevCfg: Record<string, { color: string; bg: string; border: string; glow: string }> = {
  info:     { color: "#22d3ee", bg: "rgba(6,182,212,0.1)",  border: "rgba(6,182,212,0.22)",  glow: "rgba(6,182,212,0.3)" },
  warning:  { color: "#fbbf24", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.22)", glow: "rgba(245,158,11,0.3)" },
  critical: { color: "#f87171", bg: "rgba(239,68,68,0.1)",  border: "rgba(239,68,68,0.22)",  glow: "rgba(239,68,68,0.5)" },
};

function RadarScope({ threatLevel }: { threatLevel: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const angleRef  = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx  = canvas.getContext("2d");
    if (!ctx) return;
    const size = 200;
    canvas.width  = size;
    canvas.height = size;
    const cx = size / 2, cy = size / 2, r = size / 2 - 10;
    const dotColor   = threatLevel === "CRITICAL" ? "#f87171" : threatLevel === "ELEVATED" ? "#fbbf24" : "#22d3ee";
    const sweepColor = threatLevel === "CRITICAL" ? "rgba(239,68,68," : threatLevel === "ELEVATED" ? "rgba(245,158,11," : "rgba(6,182,212,";
    const blips = [
      { a: 0.8, d: 0.45, alpha: 0.9 },
      { a: 2.1, d: 0.6,  alpha: 0.7 },
      { a: 3.8, d: 0.3,  alpha: 0.6 },
      { a: 5.2, d: 0.7,  alpha: 0.8 },
    ];
    let animId: number;
    const draw = () => {
      ctx.clearRect(0, 0, size, size);
      [1, 0.7, 0.45, 0.2].forEach(f => {
        ctx.beginPath(); ctx.arc(cx, cy, r * f, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(6,182,212,0.08)"; ctx.lineWidth = 1; ctx.stroke();
      });
      ctx.strokeStyle = "rgba(6,182,212,0.06)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r); ctx.stroke();
      ctx.save();
      ctx.beginPath(); ctx.moveTo(cx, cy);
      const sweepAngle = Math.PI * 0.6;
      ctx.arc(cx, cy, r, angleRef.current - sweepAngle, angleRef.current);
      ctx.closePath();
      const sweepGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      sweepGrad.addColorStop(0, `${sweepColor}0.04)`);
      sweepGrad.addColorStop(0.6, `${sweepColor}0.1)`);
      sweepGrad.addColorStop(1, `${sweepColor}0)`);
      ctx.fillStyle = sweepGrad; ctx.fill(); ctx.restore();
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.lineTo(cx + (r + 4) * Math.cos(angleRef.current), cy + (r + 4) * Math.sin(angleRef.current));
      ctx.strokeStyle = `${sweepColor}0.8)`; ctx.lineWidth = 1.5;
      ctx.shadowColor = `${sweepColor}0.7)`; ctx.shadowBlur = 5; ctx.stroke(); ctx.shadowBlur = 0;
      blips.forEach(b => {
        const bx = cx + r * b.d * Math.cos(b.a);
        const by = cy + r * b.d * Math.sin(b.a);
        const angleDiff = ((angleRef.current - b.a) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        const fade = angleDiff < Math.PI * 0.6 ? 1 - angleDiff / (Math.PI * 0.6) : 0;
        if (fade > 0) {
          ctx.beginPath(); ctx.arc(bx, by, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `${sweepColor}${fade * b.alpha})`;
          ctx.shadowColor = dotColor; ctx.shadowBlur = 7; ctx.fill(); ctx.shadowBlur = 0;
        }
      });
      ctx.beginPath(); ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = dotColor; ctx.shadowColor = dotColor; ctx.shadowBlur = 8; ctx.fill(); ctx.shadowBlur = 0;
      angleRef.current += 0.022;
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animId);
  }, [threatLevel]);

  return <canvas ref={canvasRef} className="w-full h-full" style={{ maxWidth: 200, maxHeight: 200 }} />;
}

function SecurityContent() {
  const { colors } = useAdminTheme();
  const [filter, setFilter] = useState<"all" | "info" | "warning" | "critical">("all");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/admin/security/logs-full"],
    queryFn:  () => adminApi.getSecurityLogs(100),
    refetchInterval: 30000,
  });

  const allLogs = data?.data || [];
  const logs    = allLogs.filter((l: any) => filter === "all" || l.severity === filter);
  const counts  = {
    all:      allLogs.length,
    info:     allLogs.filter((l: any) => l.severity === "info").length,
    warning:  allLogs.filter((l: any) => l.severity === "warning").length,
    critical: allLogs.filter((l: any) => l.severity === "critical").length,
  };

  const threatLevel = counts.critical > 0 ? "CRITICAL" : counts.warning > 2 ? "ELEVATED" : "NORMAL";
  const threatColor = threatLevel === "CRITICAL" ? "#f87171" : threatLevel === "ELEVATED" ? "#fbbf24" : "#34d399";

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold" style={{ fontFamily: "'Space Grotesk',sans-serif", color: colors.text }}>Security Monitor</h2>
          <p className="text-xs mt-0.5" style={{ color: colors.dim, fontFamily: "'Inter',sans-serif" }}>Real-time threat intelligence & event logging</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-colors"
          style={{ background: "rgba(6,182,212,0.07)", border: "1px solid rgba(6,182,212,0.18)", color: "#06b6d4", fontFamily: "'Inter',sans-serif" }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(6,182,212,0.12)"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(6,182,212,0.07)"}
        >
          <RefreshCw size={12} />
          Refresh
        </motion.button>
      </div>

      {/* Threat panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Radar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ y: -3, transition: { duration: 0.18 } }}
          className="relative rounded-2xl overflow-hidden flex flex-col items-center justify-center p-6"
          style={{
            background: colors.card,
            border: `1px solid ${colors.border2}`,
            transition: "border-color 0.22s, box-shadow 0.22s",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.borderColor = `${threatColor}40`;
            (e.currentTarget as HTMLElement).style.boxShadow   = `0 12px 28px ${threatColor}0e`;
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.borderColor = colors.border2;
            (e.currentTarget as HTMLElement).style.boxShadow   = "none";
          }}
        >
          <div className="w-48 h-48 mb-4">
            <RadarScope threatLevel={threatLevel} />
          </div>
          <div className="text-center">
            <motion.p
              animate={{ opacity: threatLevel === "CRITICAL" ? [1, 0.4, 1] : 1 }}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-base font-bold tracking-widest"
              style={{ color: threatColor, fontFamily: "'Space Grotesk',sans-serif" }}
            >
              {threatLevel}
            </motion.p>
            <p className="text-xs mt-1" style={{ color: colors.dimmer, fontFamily: "'Inter',sans-serif" }}>Threat level</p>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: "Total events",  value: counts.all,      icon: Terminal,      color: "#06b6d4" },
            { label: "Info",          value: counts.info,     icon: Eye,           color: "#06b6d4" },
            { label: "Warnings",      value: counts.warning,  icon: AlertTriangle, color: "#fbbf24" },
            { label: "Critical",      value: counts.critical, icon: Shield,        color: "#f87171" },
            { label: "Firewall",      value: null,            icon: Lock,          color: "#22c55e",  label2: "Active"   },
            { label: "Monitor",       value: null,            icon: Activity,      color: "#a78bfa",  label2: "Scanning" },
          ].map((c, i) => (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -3, transition: { duration: 0.18 } }}
              transition={{ delay: 0.04 + i * 0.04 }}
              className="relative rounded-xl p-4 overflow-hidden"
              style={{
                background: colors.card,
                border: `1px solid ${colors.border2}`,
                transition: "border-color 0.22s, box-shadow 0.22s",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = `${c.color}40`;
                (e.currentTarget as HTMLElement).style.boxShadow   = `0 8px 20px ${c.color}0e`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = colors.border2;
                (e.currentTarget as HTMLElement).style.boxShadow   = "none";
              }}
            >
              <div className="absolute top-0 right-0 w-14 h-14 rounded-full blur-2xl opacity-10 pointer-events-none" style={{ background: c.color }} />
              <div className="flex items-start justify-between mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${c.color}15`, border: `1px solid ${c.color}25` }}>
                  <c.icon size={14} style={{ color: c.color }} />
                </div>
                {(c as any).label2 && (
                  <motion.div
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-2 h-2 rounded-full"
                    style={{ background: c.color }}
                  />
                )}
              </div>
              {c.value !== null ? (
                <p className="text-xl font-bold tabular-nums" style={{ fontFamily: "'Space Grotesk',sans-serif", color: colors.text }}>{c.value}</p>
              ) : (
                <p className="text-sm font-semibold" style={{ color: c.color, fontFamily: "'Inter',sans-serif" }}>{(c as any).label2}</p>
              )}
              <p className="text-xs mt-0.5" style={{ color: colors.muted, fontFamily: "'Inter',sans-serif" }}>{c.label}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Event log */}
      <div className="rounded-2xl overflow-hidden" style={{ background: colors.card, border: `1px solid ${colors.border2}` }}>
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: `1px solid ${colors.border}` }}>
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "#ef4444" }}
            />
            <Terminal size={13} style={{ color: "#06b6d4" }} />
            <span className="text-sm font-semibold" style={{ fontFamily: "'Space Grotesk',sans-serif", color: colors.text }}>Event stream</span>
            <span className="text-xs font-mono ml-1" style={{ color: colors.dimmer }}>{logs.length} records</span>
          </div>
          <div className="flex items-center gap-0.5 rounded-xl p-1" style={{ background: colors.input }}>
            {(["all", "info", "warning", "critical"] as const).map(f => {
              const fc = f === "info" ? "#22d3ee" : f === "warning" ? "#fbbf24" : f === "critical" ? "#f87171" : colors.muted;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all"
                  style={filter === f
                    ? { background: `${fc}18`, color: fc, border: `1px solid ${fc}35`, fontFamily: "'Inter',sans-serif" }
                    : { color: colors.dim, border: "1px solid transparent", fontFamily: "'Inter',sans-serif" }
                  }
                >
                  {f} {f !== "all" && `(${counts[f]})`}
                </button>
              );
            })}
          </div>
        </div>

        <div className="max-h-[480px] overflow-y-auto font-mono">
          {isLoading ? (
            <div className="flex flex-col gap-2 p-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: colors.hover }} />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Shield size={36} className="mb-3" style={{ color: colors.dimmest, opacity: 0.25 }} />
              <p className="text-xs" style={{ color: colors.dimmer, fontFamily: "'Inter',sans-serif" }}>No events matching filter</p>
            </div>
          ) : (
            <AnimatePresence>
              {logs.map((log: any, i: number) => {
                const s = sevCfg[log.severity] || sevCfg.info;
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
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: s.color, boxShadow: log.severity === "critical" ? `0 0 5px ${s.glow}` : "none" }}
                    />
                    <span className="text-xs flex-shrink-0 w-20 tabular-nums" style={{ color: colors.dimmer }}>
                      {new Date(log.createdAt).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-md flex-shrink-0 w-16 text-center capitalize"
                      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, fontFamily: "'Inter',sans-serif" }}>
                      {log.severity}
                    </span>
                    <span className="text-xs flex-shrink-0 w-40 truncate" style={{ color: colors.text2 }}>{log.event}</span>
                    <span className="text-xs flex-1 min-w-0 truncate" style={{ color: colors.dim }}>{log.details}</span>
                    <span className="text-xs flex-shrink-0 hidden md:block w-24 text-right" style={{ color: colors.dimmer }}>{log.ip || "—"}</span>
                    <span className="text-xs flex-shrink-0 w-16 text-right" style={{ color: colors.dimmest }}>{getTimeAgo(log.createdAt)}</span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        <div className="px-5 py-2.5 flex items-center justify-between" style={{ borderTop: `1px solid ${colors.border}` }}>
          <span className="text-xs font-mono" style={{ color: colors.dimmest }}>Auto-refresh every 30s</span>
          <div className="flex items-center gap-1.5">
            <motion.div
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "#22c55e" }}
            />
            <span className="text-xs" style={{ color: "#22c55e", fontFamily: "'Inter',sans-serif" }}>Monitoring active</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Security() {
  return (
    <AdminLayout>
      <SecurityContent />
    </AdminLayout>
  );
}
