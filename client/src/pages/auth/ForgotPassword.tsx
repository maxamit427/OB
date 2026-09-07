import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Shield, Mail, Lock, CheckCircle, AlertCircle, Loader2, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { publicAuthApi } from "@/lib/publicAuthApi";
import { useToast } from "@/hooks/use-toast";

type Step = "email" | "otp" | "password" | "done";

export default function ForgotPassword() {
  const [, navigate] = useLocation();
  const { toast }    = useToast();
  const [step,        setStep]        = useState<Step>("email");
  const [email,       setEmail]       = useState("");
  const [code,        setCode]        = useState<string[]>(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirm,     setConfirm]     = useState("");
  const [showPw,      setShowPw]      = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [cooldown,    setCooldown]    = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true); setError("");
    try {
      const result = await publicAuthApi.forgotPassword(email);
      if (!result.success) throw new Error(result.message || "Failed to send reset code");
      setStep("otp");
      setCooldown(60);
      setTimeout(() => inputRefs.current[0]?.focus(), 200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset code");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpInput = (i: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...code];
    next[i] = value;
    setCode(next);
    if (value && i < 5) inputRefs.current[i + 1]?.focus();
    if (next.every(c => c)) setStep("password");
  };

  const handleOtpKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[i] && i > 0) inputRefs.current[i - 1]?.focus();
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirm) { setError("Passwords do not match"); return; }
    if (newPassword.length < 8)  { setError("Password must be at least 8 characters"); return; }
    setLoading(true); setError("");
    try {
      const res = await publicAuthApi.resetPassword(email, code.join(""), newPassword);
      if (!res.success) { setError(res.message); return; }
      setStep("done");
    } catch {
      setError("Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setError("");
    try {
      const result = await publicAuthApi.forgotPassword(email);
      if (!result.success) throw new Error(result.message || "Failed to resend reset code");
      toast({ title: "New code sent" });
      setCooldown(60);
      setCode(["", "", "", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend reset code");
    }
  };

  const cardStyle = { background: "rgba(13,13,13,0.95)", border: "1px solid rgba(255,255,255,0.08)" };
  const inputClass = "w-full pl-10 pr-4 py-3 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder-white/30 outline-none transition-colors";
  const inputStyle = { fontFamily: "'Inter',sans-serif" };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4 py-12 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        {step === "done" ? (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)" }}>
              <CheckCircle size={36} style={{ color: "#10b981" }} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>Password reset!</h2>
            <p className="text-white/40 text-sm mb-6">Your password has been updated successfully.</p>
            <button onClick={() => navigate("/auth/login")} className="px-6 py-3 rounded-xl font-semibold text-sm text-white" style={{ background: "linear-gradient(135deg, #0891b2, #7c3aed)" }}>
              Sign in now
            </button>
          </motion.div>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={cardStyle}>
            <div className="p-6 border-b border-white/5 flex items-center gap-3">
              <button onClick={() => step === "email" ? navigate("/auth/login") : setStep(step === "otp" ? "email" : "otp")} className="text-white/30 hover:text-white transition-colors">
                <ArrowLeft size={18} />
              </button>
              <div>
                <h1 className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                  {step === "email" ? "Forgot password" : step === "otp" ? "Enter reset code" : "New password"}
                </h1>
                <p className="text-xs text-white/30" style={{ fontFamily: "'Inter',sans-serif" }}>
                  {step === "email" ? "We'll email you a reset code" : step === "otp" ? `Code sent to ${email}` : "Choose a strong password"}
                </p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 p-3 rounded-xl text-sm" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)", color: "#fca5a5" }}>
                  <AlertCircle size={14} /> {error}
                </motion.div>
              )}

              {step === "email" && (
                <form onSubmit={handleSendCode} className="space-y-4">
                  <div className="relative">
                    <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email address" required className={inputClass} style={inputStyle}
                      onFocus={e => (e.currentTarget.style.borderColor = "rgba(6,182,212,0.5)")}
                      onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                      data-testid="input-email"
                    />
                  </div>
                  <button type="submit" disabled={loading || !email} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-50" style={{ background: "linear-gradient(135deg, #0891b2, #7c3aed)" }} data-testid="btn-send-code">
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                    {loading ? "Sending..." : "Send reset code"}
                  </button>
                </form>
              )}

              {step === "otp" && (
                <div className="space-y-4">
                  <div className="flex justify-center gap-2">
                    {code.map((digit, i) => (
                      <input key={i} ref={el => { inputRefs.current[i] = el; }} type="text" inputMode="numeric" maxLength={1} value={digit}
                        onChange={e => handleOtpInput(i, e.target.value)}
                        onKeyDown={e => handleOtpKeyDown(i, e)}
                        className="w-11 h-13 text-center text-xl font-bold rounded-xl border outline-none transition-all"
                        style={{ background: digit ? "rgba(6,182,212,0.08)" : "rgba(255,255,255,0.04)", border: digit ? "1px solid rgba(6,182,212,0.5)" : "1px solid rgba(255,255,255,0.1)", color: "#06b6d4", width: 44, height: 52 }}
                        data-testid={`input-otp-${i}`}
                      />
                    ))}
                  </div>
                  <button onClick={handleResend} disabled={cooldown > 0} className="flex items-center justify-center gap-2 mx-auto text-sm disabled:opacity-40 transition-colors" style={{ color: cooldown > 0 ? "rgba(255,255,255,0.3)" : "#06b6d4" }}>
                    {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                  </button>
                </div>
              )}

              {step === "password" && (
                <form onSubmit={handleReset} className="space-y-3">
                  <div className="relative">
                    <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                    <input type={showPw ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password" required minLength={8} className="w-full pl-10 pr-11 py-3 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder-white/30 outline-none transition-colors" style={inputStyle}
                      onFocus={e => (e.currentTarget.style.borderColor = "rgba(6,182,212,0.5)")}
                      onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                      data-testid="input-new-password"
                    />
                    <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                      {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                    <input type={showPw ? "text" : "password"} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirm password" required className={inputClass} style={inputStyle}
                      onFocus={e => (e.currentTarget.style.borderColor = "rgba(6,182,212,0.5)")}
                      onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                      data-testid="input-confirm-password"
                    />
                  </div>
                  <button type="submit" disabled={loading || !newPassword || !confirm} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-50" style={{ background: "linear-gradient(135deg, #0891b2, #7c3aed)" }} data-testid="btn-reset-password">
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                    {loading ? "Resetting..." : "Reset password"}
                  </button>
                </form>
              )}

              <p className="text-center text-xs text-white/30">
                Remember your password?{" "}
                <button onClick={() => navigate("/auth/login")} className="text-cyan-400 hover:text-cyan-300 transition-colors">Sign in</button>
              </p>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-white/20 mt-6">
          <Shield size={10} className="inline mr-1" />
          Secured by Older Brother
        </p>
      </motion.div>
    </div>
  );
}
