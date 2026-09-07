import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Eye, EyeOff, UserPlus, Mail, Lock, User, Shield, AlertCircle, Loader2, CheckCircle } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { publicAuthApi } from "@/lib/publicAuthApi";
import { requestGoogleAccessToken } from "@/lib/googleAuth";
import { usePublicAuth } from "@/contexts/PublicAuthContext";
import { useToast } from "@/hooks/use-toast";
import logoFallback from "@assets/Messenger_creation_C808A249-822C-4C7C-B971-68BAAB329ABA_1763833106108.jpeg";

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8+ chars",        ok: password.length >= 8         },
    { label: "Uppercase",       ok: /[A-Z]/.test(password)       },
    { label: "Number",          ok: /[0-9]/.test(password)       },
    { label: "Special char",   ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.ok).length;
  const colors = ["#ef4444", "#f59e0b", "#10b981", "#06b6d4"];

  if (!password) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="flex-1 h-1 rounded-full transition-all" style={{
            background: i < score ? colors[score - 1] : "rgba(255,255,255,0.08)"
          }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {checks.map(c => (
          <span key={c.label} className="text-xs flex items-center gap-1" style={{ color: c.ok ? "#10b981" : "rgba(255,255,255,0.3)" }}>
            <CheckCircle size={9} />
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Signup() {
  const [, navigate]  = useLocation();
  const { toast }     = useToast();
  const { setAuthData } = usePublicAuth();
  const [name,        setName]        = useState("");
  const [username,    setUsername]    = useState("");
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !username || !email || !password) return;
    setLoading(true); setError("");
    try {
      const res = await publicAuthApi.register({ name, username, email, password });
      if (!res.success) { setError(res.message); return; }
      toast({ title: "Account created! Verify your email to continue." });
      navigate(`/auth/verify-email?email=${encodeURIComponent(email)}`);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSocial = async (provider: string) => {
    setSocialLoading(provider);
    setError("");
    try {
      if (provider !== "google") throw new Error(`${provider} sign-in is not available yet.`);
      const accessToken = await requestGoogleAccessToken();
      const result = await publicAuthApi.socialLogin("google", accessToken);
      if (!result.success || !result.token || !result.user) {
        throw new Error(result.message || "Google sign-in failed.");
      }
      setAuthData(result.token, result.user);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4 py-12 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/3 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative"
      >
        <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(13,13,13,0.95)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="p-8 text-center border-b border-white/5">
            <button onClick={() => navigate("/")} className="flex items-center justify-center mx-auto mb-6 group">
              <img
                src={logoFallback}
                alt="Older Brother"
                className="w-14 h-14 rounded-full object-cover border-2 border-cyan-400/40 shadow-[0_0_20px_rgba(34,211,238,0.3)] group-hover:scale-105 transition-transform"
              />
            </button>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
              Create account
            </h1>
            <p className="text-sm text-white/40 mt-1" style={{ fontFamily: "'Inter',sans-serif" }}>
              Join Older Brother Team
            </p>
          </div>

          <div className="p-8 space-y-4">
            {/* Google signup */}
            <button
              onClick={() => handleSocial("google")}
              disabled={!!socialLoading || loading}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.75)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
              data-testid="btn-social-google"
            >
              {socialLoading === "google" ? <Loader2 size={14} className="animate-spin" /> : <SiGoogle size={14} />}
              Continue with Google
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/8" />
              <span className="text-xs text-white/30">or with email</span>
              <div className="flex-1 h-px bg-white/8" />
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 p-3 rounded-xl text-sm"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)", color: "#fca5a5" }}
              >
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                {error}
              </motion.div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Full name"
                  required
                  minLength={2}
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder-white/30 outline-none transition-colors"
                  style={{ fontFamily: "'Inter',sans-serif" }}
                  onFocus={e => (e.currentTarget.style.borderColor = "rgba(6,182,212,0.5)")}
                  onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                  data-testid="input-name"
                />
              </div>

              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 text-xs font-mono">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                  placeholder="Username"
                  required
                  minLength={3}
                  maxLength={32}
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder-white/30 outline-none transition-colors font-mono"
                  onFocus={e => (e.currentTarget.style.borderColor = "rgba(6,182,212,0.5)")}
                  onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                  data-testid="input-username"
                />
              </div>

              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Email address"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder-white/30 outline-none transition-colors"
                  style={{ fontFamily: "'Inter',sans-serif" }}
                  onFocus={e => (e.currentTarget.style.borderColor = "rgba(6,182,212,0.5)")}
                  onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                  data-testid="input-email"
                />
              </div>

              <div>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Password (min. 8 characters)"
                    required
                    minLength={8}
                    className="w-full pl-10 pr-11 py-3 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder-white/30 outline-none transition-colors"
                    style={{ fontFamily: "'Inter',sans-serif" }}
                    onFocus={e => (e.currentTarget.style.borderColor = "rgba(6,182,212,0.5)")}
                    onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                    data-testid="input-password"
                  />
                  <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {password && <div className="mt-2"><PasswordStrength password={password} /></div>}
              </div>

              <button
                type="submit"
                disabled={loading || !name || !username || !email || password.length < 8}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-50 transition-all"
                style={{ background: "linear-gradient(135deg, #0891b2, #7c3aed)" }}
                data-testid="btn-signup"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                {loading ? "Creating account..." : "Create account"}
              </button>
            </form>

            <p className="text-center text-xs text-white/30" style={{ fontFamily: "'Inter',sans-serif" }}>
              Already have an account?{" "}
              <button onClick={() => navigate("/auth/login")} className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors" data-testid="link-to-login">
                Sign in
              </button>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-white/20 mt-6" style={{ fontFamily: "'Inter',sans-serif" }}>
          <Shield size={10} className="inline mr-1" />
          Secured by Older Brother
        </p>
      </motion.div>
    </div>
  );
}
