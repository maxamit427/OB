import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, LogIn, Mail, Lock, Shield, AlertCircle, Loader2 } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { usePublicAuth } from "@/contexts/PublicAuthContext";
import { requestGoogleAccessToken } from "@/lib/googleAuth";
import { publicAuthApi } from "@/lib/publicAuthApi";
import logoFallback from "@assets/Messenger_creation_C808A249-822C-4C7C-B971-68BAAB329ABA_1763833106108.jpeg";

export default function Login() {
  const [, navigate]    = useLocation();
  const { login, setAuthData } = usePublicAuth();
  const [email,        setEmail]       = useState("");
  const [password,     setPassword]    = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]     = useState(false);
  const [error,        setError]       = useState("");
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true); setError("");
    try {
      const result = await login(email, password);
      if (!result.success) {
        if (result.requiresVerification) {
          navigate(`/auth/verify-email?email=${encodeURIComponent(result.email || email)}`);
          return;
        }
        setError(result.message || "Login failed");
        return;
      }
      navigate("/");
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
      const redirect = new URLSearchParams(window.location.search).get("redirect");
      navigate(redirect || "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4 py-12 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md relative"
      >
        {/* Card */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(13,13,13,0.95)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {/* Header */}
          <div className="p-8 text-center border-b border-white/5">
            <button onClick={() => navigate("/")} className="flex items-center justify-center mx-auto mb-6 group">
              <img
                src={logoFallback}
                alt="Older Brother"
                className="w-14 h-14 rounded-full object-cover border-2 border-cyan-400/40 shadow-[0_0_20px_rgba(34,211,238,0.3)] group-hover:scale-105 transition-transform"
              />
            </button>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
              Welcome back
            </h1>
            <p className="text-sm text-white/40 mt-1" style={{ fontFamily: "'Inter',sans-serif" }}>
              Sign in to your Older Brother account
            </p>
          </div>

          <div className="p-8 space-y-4">
            {/* Google login */}
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
              <span className="text-xs text-white/30">or continue with email</span>
              <div className="flex-1 h-px bg-white/8" />
            </div>

            {/* Error */}
            <AnimatePresence>{error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-start gap-3 p-3 rounded-xl text-sm"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)", color: "#fca5a5" }}
              >
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                {error}
              </motion.div>
            )}</AnimatePresence>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="text"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Email or username"
                  autoComplete="username"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder-white/30 outline-none transition-colors"
                  style={{ fontFamily: "'Inter',sans-serif" }}
                  onFocus={e => (e.currentTarget.style.borderColor = "rgba(6,182,212,0.5)")}
                  onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                  data-testid="input-email"
                />
              </div>

              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete="current-password"
                  required
                  className="w-full pl-10 pr-11 py-3 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder-white/30 outline-none transition-colors"
                  style={{ fontFamily: "'Inter',sans-serif" }}
                  onFocus={e => (e.currentTarget.style.borderColor = "rgba(6,182,212,0.5)")}
                  onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                  data-testid="input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => navigate("/auth/forgot-password")}
                  className="text-xs text-cyan-400/70 hover:text-cyan-400 transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-50 transition-all"
                style={{ background: "linear-gradient(135deg, #0891b2, #7c3aed)" }}
                data-testid="btn-login"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            {/* Footer */}
            <p className="text-center text-xs text-white/30" style={{ fontFamily: "'Inter',sans-serif" }}>
              Don't have an account?{" "}
              <button
                onClick={() => navigate("/auth/signup")}
                className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                data-testid="link-to-signup"
              >
                Create one
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
