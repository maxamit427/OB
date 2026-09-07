import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Eye, EyeOff, AlertCircle, ShieldCheck, Zap } from "lucide-react";
import logoFallback from "@assets/Messenger_creation_C808A249-822C-4C7C-B971-68BAAB329ABA_1763833106108.jpeg";

function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const particles: { x: number; y: number; vx: number; vy: number; alpha: number; size: number; color: string }[] = [];
    const colors = ["rgba(6,182,212,", "rgba(139,92,246,", "rgba(16,185,129,"];
    for (let i = 0; i < 55; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        alpha: Math.random() * 0.5 + 0.1,
        size: Math.random() * 1.8 + 0.4,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    let animId: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color + p.alpha + ")";
        ctx.fill();
      });
      particles.forEach((a, i) => {
        particles.slice(i + 1).forEach(b => {
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 100) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(6,182,212,${0.06 * (1 - d / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }} />;
}

export default function AdminLogin() {
  const [identifier, setIdentifier] = useState("");
  const [password,   setPassword]   = useState("");
  const [showPass,   setShowPass]   = useState(false);
  const [error,      setError]      = useState("");
  const [loading,    setLoading]    = useState(false);
  const [glowing,    setGlowing]    = useState(false);
  const { login }                   = useAdminAuth();
  const [, navigate]                = useLocation();

  const { data: settingsData } = useQuery({
    queryKey: ["/api/public/settings"],
    queryFn:  () => fetch("/api/public/settings").then(r => r.json()),
    staleTime: 60000,
  });
  const logoSrc = settingsData?.data?.logo_url || logoFallback;

  useEffect(() => {
    const id = setInterval(() => setGlowing(g => !g), 2800);
    return () => clearInterval(id);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(identifier, password);
      navigate("/admin/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const isEmail = identifier.includes("@");

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "#050508" }}
    >
      <ParticleField />

      {/* Ambient blobs */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 1 }}>
        <div style={{
          position: "absolute", top: "10%", left: "15%",
          width: 500, height: 500, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)",
          filter: "blur(60px)",
          animation: "blob1 18s ease-in-out infinite",
        }} />
        <div style={{
          position: "absolute", bottom: "10%", right: "15%",
          width: 450, height: 450, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)",
          filter: "blur(60px)",
          animation: "blob2 22s ease-in-out infinite 4s",
        }} />
      </div>

      {/* Dot grid */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)",
        backgroundSize: "30px 30px",
        zIndex: 1,
      }} />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[360px]"
      >
        {/* Outer glow ring */}
        <motion.div
          animate={{
            boxShadow: glowing
              ? "0 0 60px rgba(6,182,212,0.18), 0 0 120px rgba(139,92,246,0.10)"
              : "0 0 30px rgba(6,182,212,0.08), 0 0 60px rgba(139,92,246,0.05)",
          }}
          transition={{ duration: 2.8, ease: "easeInOut" }}
          className="rounded-[24px] p-[1.5px]"
          style={{
            background: "linear-gradient(135deg, rgba(6,182,212,0.5) 0%, rgba(139,92,246,0.4) 50%, rgba(6,182,212,0.2) 100%)",
          }}
        >
          {/* Inner card */}
          <div
            className="rounded-[23px] overflow-hidden"
            style={{
              background: "rgba(10,10,18,0.95)",
              backdropFilter: "blur(20px)",
            }}
          >
            {/* Top gradient bar */}
            <div style={{
              height: 3,
              background: "linear-gradient(90deg, #06b6d4, #8b5cf6, #06b6d4)",
              backgroundSize: "200% 100%",
              animation: "gradientFlow 3s linear infinite",
            }} />

            <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-8 pb-8 pt-6">
              {/* Logo + brand */}
              <div className="flex flex-col items-center gap-3 mb-1">
                <motion.div
                  whileHover={{ scale: 1.08, rotate: 5 }}
                  transition={{ duration: 0.2 }}
                  className="relative"
                >
                  <div className="w-16 h-16 rounded-2xl overflow-hidden" style={{
                    border: "2px solid rgba(6,182,212,0.3)",
                    boxShadow: "0 0 20px rgba(6,182,212,0.2)",
                  }}>
                    <img src={logoSrc} alt="Logo" className="w-full h-full object-cover" />
                  </div>
                  {/* Live pulse */}
                  <motion.div
                    animate={{ scale: [1, 1.6, 1], opacity: [1, 0, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2"
                    style={{ background: "#22c55e", borderColor: "#050508" }}
                  />
                </motion.div>

                <div className="text-center">
                  <p className="font-bold text-white text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "0.01em" }}>
                    Older Brother
                  </p>
                  <div className="flex items-center justify-center gap-1.5 mt-0.5">
                    <ShieldCheck size={11} style={{ color: "#06b6d4" }} />
                    <p className="text-xs" style={{ color: "rgba(6,182,212,0.7)", fontFamily: "'Inter', sans-serif", letterSpacing: "0.08em" }}>
                      ADMIN ACCESS
                    </p>
                  </div>
                </div>
              </div>

              {/* Username / Email field */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Inter', sans-serif", letterSpacing: "0.06em" }}>
                  {isEmail ? "EMAIL" : "USERNAME / EMAIL"}
                </label>
                <div
                  className="relative flex items-center rounded-xl overflow-hidden transition-all duration-200"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  onFocusCapture={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(6,182,212,0.4)"; (e.currentTarget as HTMLElement).style.background = "rgba(6,182,212,0.04)"; }}
                  onBlurCapture={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                >
                  <div className="pl-3 pr-2 flex-shrink-0" style={{ color: isEmail ? "#06b6d4" : "rgba(255,255,255,0.3)" }}>
                    {isEmail ? (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                      </svg>
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                      </svg>
                    )}
                  </div>
                  <input
                    type="text"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    placeholder="Username or email address"
                    autoComplete="username"
                    required
                    className="flex-1 py-3 pr-4 bg-transparent border-none outline-none text-sm"
                    style={{ color: "#e8e8f0", fontFamily: "'Inter', sans-serif" }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/admin/forgot-password")}
                  className="mt-2 text-xs transition-colors hover:text-cyan-300"
                  style={{ color: "rgba(6,182,212,0.72)", fontFamily: "'Inter', sans-serif" }}
                >
                  Forgot admin password?
                </button>
              </div>

              {/* Password field */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Inter', sans-serif", letterSpacing: "0.06em" }}>
                  PASSWORD
                </label>
                <div
                  className="relative flex items-center rounded-xl overflow-hidden transition-all duration-200"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  onFocusCapture={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(139,92,246,0.4)"; (e.currentTarget as HTMLElement).style.background = "rgba(139,92,246,0.04)"; }}
                  onBlurCapture={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                >
                  <div className="pl-3 pr-2 flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </div>
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    required
                    className="flex-1 py-3 bg-transparent border-none outline-none text-sm"
                    style={{ color: "#e8e8f0", fontFamily: "monospace", letterSpacing: "0.05em" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    className="pr-3 pl-1 flex-shrink-0 transition-colors"
                    style={{ color: "rgba(255,255,255,0.25)" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.6)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.25)"}
                  >
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -6, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl" style={{
                      background: "rgba(239,68,68,0.07)",
                      border: "1px solid rgba(239,68,68,0.2)",
                    }}>
                      <AlertCircle size={13} style={{ color: "#f87171", flexShrink: 0 }} />
                      <span className="text-xs" style={{ color: "#f87171", fontFamily: "'Inter', sans-serif" }}>
                        {error}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Login button */}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={loading ? {} : { scale: 1.02 }}
                whileTap={loading ? {} : { scale: 0.97 }}
                className="relative w-full py-3 rounded-xl font-semibold text-sm text-white overflow-hidden flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
                style={{
                  background: "linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)",
                  fontFamily: "'Space Grotesk', sans-serif",
                  boxShadow: "0 0 24px rgba(6,182,212,0.25)",
                }}
              >
                {loading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 rounded-full border-2"
                      style={{ borderColor: "rgba(255,255,255,0.25)", borderTopColor: "#fff" }}
                    />
                    Authenticating…
                  </>
                ) : (
                  <>
                    <Zap size={14} />
                    Sign In
                  </>
                )}
              </motion.button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.2)", fontFamily: "'Inter', sans-serif" }}>or</span>
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
              </div>

              {/* Sign up button */}
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/admin/signup")}
                className="w-full py-2.5 rounded-xl font-medium text-sm transition-all"
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.5)",
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(6,182,212,0.3)";
                  (e.currentTarget as HTMLElement).style.color = "rgba(6,182,212,0.8)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
                  (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.5)";
                }}
              >
                Request Admin Access
              </motion.button>
            </form>
          </div>
        </motion.div>
      </motion.div>

      <style>{`
        @keyframes blob1 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(30px,-20px) scale(1.1)} }
        @keyframes blob2 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-25px,15px) scale(1.08)} }
        @keyframes gradientFlow { 0%{background-position:0% 50%} 100%{background-position:200% 50%} }
      `}</style>
    </div>
  );
}
