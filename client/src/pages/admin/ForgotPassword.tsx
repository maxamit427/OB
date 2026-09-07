import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { AlertCircle, ArrowLeft, CheckCircle, KeyRound, Loader2, Mail, Shield } from "lucide-react";
import { adminApi } from "@/lib/adminApi";

type Step = "email" | "otp" | "password" | "done";

export default function AdminForgotPassword() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  const sendCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await adminApi.forgotPassword(email.trim());
      if (!result.success) throw new Error(result.message);
      setStep("otp");
      setTimeout(() => inputs.current[0]?.focus(), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset code.");
    } finally {
      setLoading(false);
    }
  };

  const updateCode = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...code];
    next[index] = value;
    setCode(next);
    if (value && index < 5) inputs.current[index + 1]?.focus();
    if (next.every(Boolean)) setStep("password");
  };

  const resetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");

    setLoading(true);
    try {
      const result = await adminApi.resetPassword(email.trim(), code.join(""), password);
      if (!result.success) throw new Error(result.message);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset admin password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#050508] px-4 py-10 text-white">
      <section className="w-full max-w-md overflow-hidden rounded-3xl border border-cyan-400/20 bg-[#0b0d14]/95 shadow-[0_0_80px_rgba(6,182,212,0.10)]">
        <div className="h-1 bg-gradient-to-r from-cyan-400 via-violet-500 to-cyan-400" />
        <div className="p-7 sm:p-9">
          <button
            type="button"
            onClick={() => navigate("/admin/login")}
            className="mb-7 flex items-center gap-2 text-xs text-white/40 transition-colors hover:text-white"
          >
            <ArrowLeft size={14} /> Back to admin login
          </button>

          {step === "done" ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10">
                <CheckCircle className="text-emerald-400" size={30} />
              </div>
              <h1 className="text-2xl font-semibold">Password updated</h1>
              <p className="mt-2 text-sm text-white/45">Your admin password is ready. Sign in with the new password.</p>
              <button onClick={() => navigate("/admin/login")} className="mt-7 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-5 py-3 text-sm font-semibold">
                Continue to login
              </button>
            </div>
          ) : (
            <>
              <div className="mb-7">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
                  <Shield className="text-cyan-300" size={20} />
                </div>
                <h1 className="text-2xl font-semibold">
                  {step === "email" ? "Recover admin access" : step === "otp" ? "Verify reset code" : "Create new password"}
                </h1>
                <p className="mt-2 text-sm text-white/45">
                  {step === "email" ? "We’ll send a one-time code to your admin email." : step === "otp" ? `Enter the 6-digit code sent to ${email}.` : "Use at least 8 characters for your new password."}
                </p>
              </div>

              {error && (
                <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
                </div>
              )}

              {step === "email" && (
                <form onSubmit={sendCode} className="space-y-4">
                  <label className="block text-xs uppercase tracking-[0.16em] text-white/40">Admin email</label>
                  <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4">
                    <Mail size={16} className="text-cyan-300/70" />
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" placeholder="admin@example.com" className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-white/25" />
                  </div>
                  <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 py-3.5 text-sm font-semibold disabled:opacity-50">
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />} {loading ? "Sending..." : "Send reset code"}
                  </button>
                </form>
              )}

              {step === "otp" && (
                <div className="space-y-5">
                  <div className="flex justify-between gap-2">
                    {code.map((digit, index) => (
                      <input
                        key={index}
                        ref={element => { inputs.current[index] = element; }}
                        value={digit}
                        onChange={event => updateCode(index, event.target.value)}
                        onKeyDown={event => {
                          if (event.key === "Backspace" && !code[index] && index > 0) inputs.current[index - 1]?.focus();
                        }}
                        inputMode="numeric"
                        maxLength={1}
                        aria-label={`Reset code digit ${index + 1}`}
                        className="h-12 w-11 rounded-xl border border-white/10 bg-white/[0.04] text-center text-lg font-semibold text-cyan-300 outline-none focus:border-cyan-400/60"
                      />
                    ))}
                  </div>
                  <p className="flex items-center justify-center gap-2 text-xs text-white/35"><KeyRound size={13} /> Code expires in 10 minutes</p>
                </div>
              )}

              {step === "password" && (
                <form onSubmit={resetPassword} className="space-y-4">
                  <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" placeholder="New password" className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm outline-none placeholder:text-white/25 focus:border-cyan-400/60" />
                  <input type="password" required minLength={8} value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" placeholder="Confirm new password" className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm outline-none placeholder:text-white/25 focus:border-cyan-400/60" />
                  <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 py-3.5 text-sm font-semibold disabled:opacity-50">
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />} {loading ? "Updating..." : "Update password"}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}