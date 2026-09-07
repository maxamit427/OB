import { useState, useRef, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { motion } from "framer-motion";
import { Shield, CheckCircle, AlertCircle, Loader2, RefreshCw, Mail } from "lucide-react";
import { publicAuthApi } from "@/lib/publicAuthApi";
import { usePublicAuth } from "@/contexts/PublicAuthContext";
import { useToast } from "@/hooks/use-toast";

export default function VerifyEmail() {
  const [, navigate]     = useLocation();
  const search           = useSearch();
  const params           = new URLSearchParams(search);
  const email            = params.get("email") || "";
  const { setAuthData }  = usePublicAuth();
  const { toast }        = useToast();

  const [code,      setCode]      = useState<string[]>(["", "", "", "", "", ""]);
  const [loading,   setLoading]   = useState(false);
  const [resending, setResending] = useState(false);
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState(false);
  const [cooldown,  setCooldown]  = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleInput = (i: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...code];
    next[i] = value;
    setCode(next);
    if (value && i < 5) inputRefs.current[i + 1]?.focus();
    if (next.every(c => c) && next.join("").length === 6) {
      handleVerify(next.join(""));
    }
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(""));
      handleVerify(pasted);
    }
  };

  const handleVerify = async (fullCode?: string) => {
    const otp = fullCode || code.join("");
    if (otp.length !== 6) { setError("Please enter all 6 digits"); return; }
    setLoading(true); setError("");
    try {
      const res = await publicAuthApi.verifyOtp(email, otp, "verify_email");
      if (!res.success) { setError(res.message); return; }
      setSuccess(true);
      if (res.token && res.user) {
        setAuthData(res.token, res.user);
        setTimeout(() => navigate("/"), 1500);
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || !email) return;
    setResending(true); setError("");
    try {
      await publicAuthApi.sendOtp(email, "verify_email");
      toast({ title: "New code sent", description: "Check your email for a new 6-digit code." });
      setCooldown(60);
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch {
      toast({ title: "Failed to resend code", variant: "destructive" });
    } finally {
      setResending(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)" }}
          >
            <CheckCircle size={36} style={{ color: "#10b981" }} />
          </motion.div>
          <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>Email verified!</h2>
          <p className="text-white/40 text-sm">Redirecting you to the homepage...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4 py-12 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(13,13,13,0.95)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="p-8 text-center border-b border-white/5">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.3)" }}>
              <Mail size={24} style={{ color: "#06b6d4" }} />
            </div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
              Verify your email
            </h1>
            <p className="text-sm text-white/40 mt-2" style={{ fontFamily: "'Inter',sans-serif" }}>
              We sent a 6-digit code to<br />
              <span className="text-cyan-400 font-medium">{email || "your email"}</span>
            </p>
          </div>

          <div className="p-8 space-y-6">
            {/* OTP inputs */}
            <div className="flex justify-center gap-2" onPaste={handlePaste}>
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleInput(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  className="w-12 h-14 text-center text-2xl font-bold rounded-xl border outline-none transition-all"
                  style={{
                    background: digit ? "rgba(6,182,212,0.08)" : "rgba(255,255,255,0.04)",
                    border: digit ? "1px solid rgba(6,182,212,0.5)" : "1px solid rgba(255,255,255,0.1)",
                    color: "#06b6d4",
                    fontFamily: "'Space Grotesk',monospace",
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = "rgba(6,182,212,0.8)")}
                  onBlur={e => (e.currentTarget.style.borderColor = digit ? "rgba(6,182,212,0.5)" : "rgba(255,255,255,0.1)")}
                  data-testid={`input-otp-${i}`}
                />
              ))}
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex items-center gap-2 p-3 rounded-xl text-sm"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)", color: "#fca5a5" }}
              >
                <AlertCircle size={14} />
                {error}
              </motion.div>
            )}

            <button
              onClick={() => handleVerify()}
              disabled={loading || code.join("").length !== 6}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-50 transition-all"
              style={{ background: "linear-gradient(135deg, #0891b2, #7c3aed)" }}
              data-testid="btn-verify"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              {loading ? "Verifying..." : "Verify email"}
            </button>

            <div className="text-center space-y-2">
              <button
                onClick={handleResend}
                disabled={resending || cooldown > 0}
                className="flex items-center justify-center gap-2 mx-auto text-sm transition-colors disabled:opacity-40"
                style={{ color: cooldown > 0 ? "rgba(255,255,255,0.3)" : "#06b6d4" }}
                data-testid="btn-resend"
              >
                {resending ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
              </button>
              <button onClick={() => navigate("/auth/login")} className="text-xs text-white/30 hover:text-white/50 transition-colors">
                Back to sign in
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-white/20 mt-6">
          <Shield size={10} className="inline mr-1" />
          Secured by Older Brother
        </p>
      </motion.div>
    </div>
  );
}
