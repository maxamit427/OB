import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Eye, EyeOff, AlertCircle, CheckCircle2, User, Mail, Lock, Shield, ChevronDown } from "lucide-react";
import logoFallback from "@assets/Messenger_creation_C808A249-822C-4C7C-B971-68BAAB329ABA_1763833106108.jpeg";

const ROLE_OPTIONS = [
  { value: "admin",       label: "Admin",             desc: "Standard admin access" },
  { value: "super_admin", label: "Super Admin Request","desc": "Full system access (requires approval)" },
] as const;

type RoleValue = "admin" | "super_admin";

function InputRow({
  icon: Icon,
  children,
}: {
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center gap-2 rounded-full px-4 py-3"
      style={{
        background:  "#171717",
        boxShadow:   "inset 2px 5px 10px rgb(5,5,5)",
      }}
    >
      <Icon size={18} color="rgba(255,255,255,0.5)" style={{ flexShrink: 0 }} />
      {children}
    </div>
  );
}

export default function AdminSignup() {
  const [, navigate] = useLocation();

  const [fullName,  setFullName]  = useState("");
  const [username,  setUsername]  = useState("");
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [role,      setRole]      = useState<RoleValue>("admin");
  const [showPass,  setShowPass]  = useState(false);
  const [showConf,  setShowConf]  = useState(false);
  const [dropOpen,  setDropOpen]  = useState(false);
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState(false);
  const [loading,   setLoading]   = useState(false);

  const { data: settingsData } = useQuery({
    queryKey: ["/api/public/settings"],
    queryFn: () => fetch("/api/public/settings").then(r => r.json()),
    staleTime: 60000,
  });
  const logoSrc = settingsData?.data?.logo_url || logoFallback;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/signup", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ fullName, username, email, password, requestedRole: role }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Signup failed");
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const selectedRole = ROLE_OPTIONS.find(r => r.value === role)!;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: "#0d0d0d",
        backgroundImage:
          "radial-gradient(ellipse 70% 45% at 50% 0%, rgba(0,255,117,0.04) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(55,0,255,0.05) 0%, transparent 60%)",
      }}
    >
      {/* Dot grid */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:  "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize:   "28px 28px",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-sm"
      >
        {/* Gradient border card */}
        <div
          className="rounded-[22px] p-[2px] transition-all duration-300"
          style={{
            background:  "linear-gradient(163deg, #00ff75 0%, #3700ff 100%)",
            boxShadow:   "0px 0px 0px 0px rgba(0,255,117,0)",
            transition:  "box-shadow 0.3s",
          }}
          onMouseEnter={e =>
            ((e.currentTarget as HTMLElement).style.boxShadow =
              "0px 0px 30px 1px rgba(0,255,117,0.3)")
          }
          onMouseLeave={e =>
            ((e.currentTarget as HTMLElement).style.boxShadow =
              "0px 0px 0px 0px rgba(0,255,117,0)")
          }
        >
          {/* Inner card */}
          <div className="rounded-[20px]" style={{ background: "#171717" }}>
            <AnimatePresence mode="wait">
              {success ? (
                /* ── Success state ─────────────────────────────────────── */
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col items-center gap-4 px-8 py-10 text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 260, damping: 20 }}
                    className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{
                      background: "rgba(0,255,117,0.08)",
                      border:     "1px solid rgba(0,255,117,0.25)",
                      boxShadow:  "0 0 24px rgba(0,255,117,0.15)",
                    }}
                  >
                    <CheckCircle2 size={32} style={{ color: "#00ff75" }} />
                  </motion.div>
                  <div>
                    <p
                      className="text-white font-semibold text-base mb-1"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      Request Submitted!
                    </p>
                    <p
                      className="text-xs leading-relaxed"
                      style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Inter', sans-serif" }}
                    >
                      Your signup request is pending approval.
                      A Super Admin will review it shortly.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate("/admin/login")}
                    className="w-full rounded-md py-2 text-sm font-medium text-white transition-all duration-300"
                    style={{
                      background:  "#252525",
                      fontFamily:  "'Space Grotesk', sans-serif",
                    }}
                    onMouseEnter={e =>
                      ((e.currentTarget as HTMLElement).style.background = "#000")
                    }
                    onMouseLeave={e =>
                      ((e.currentTarget as HTMLElement).style.background = "#252525")
                    }
                  >
                    Back to Login
                  </button>
                </motion.div>
              ) : (
                /* ── Form state ────────────────────────────────────────── */
                <motion.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubmit}
                  className="flex flex-col gap-3 px-8 pb-6 pt-2"
                >
                  {/* Logo */}
                  <div className="flex justify-center mt-6 mb-1">
                    <img
                      src={logoSrc}
                      alt="Logo"
                      className="w-16 h-16 rounded-full object-cover"
                      style={{ border: "2px solid rgba(255,255,255,0.08)" }}
                    />
                  </div>

                  {/* Heading */}
                  <p
                    className="text-center text-white mb-1"
                    style={{
                      fontFamily:    "'Space Grotesk', sans-serif",
                      fontSize:      "1.25rem",
                      fontWeight:    600,
                      letterSpacing: "0.02em",
                    }}
                  >
                    Sign Up
                  </p>
                  <p
                    className="text-center text-xs mb-1"
                    style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'Inter', sans-serif" }}
                  >
                    Request will require Super Admin approval
                  </p>

                  {/* Full Name */}
                  <InputRow icon={User}>
                    <input
                      type="text"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="Full Name"
                      autoComplete="name"
                      required
                      className="flex-1 bg-transparent border-none outline-none text-sm"
                      style={{ color: "#d3d3d3", fontFamily: "'Inter', sans-serif" }}
                    />
                  </InputRow>

                  {/* Username */}
                  <InputRow icon={Shield}>
                    <input
                      type="text"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      placeholder="Username"
                      autoComplete="off"
                      required
                      className="flex-1 bg-transparent border-none outline-none text-sm"
                      style={{ color: "#d3d3d3", fontFamily: "'Inter', sans-serif" }}
                    />
                  </InputRow>

                  {/* Email */}
                  <InputRow icon={Mail}>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="Email Address"
                      autoComplete="email"
                      required
                      className="flex-1 bg-transparent border-none outline-none text-sm"
                      style={{ color: "#d3d3d3", fontFamily: "'Inter', sans-serif" }}
                    />
                  </InputRow>

                  {/* Password */}
                  <div
                    className="flex items-center gap-2 rounded-full px-4 py-3"
                    style={{ background: "#171717", boxShadow: "inset 2px 5px 10px rgb(5,5,5)" }}
                  >
                    <Lock size={18} color="rgba(255,255,255,0.5)" style={{ flexShrink: 0 }} />
                    <input
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Password"
                      required
                      className="flex-1 bg-transparent border-none outline-none text-sm"
                      style={{ color: "#d3d3d3", fontFamily: "'Inter', sans-serif" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      style={{ color: "rgba(255,255,255,0.3)", flexShrink: 0 }}
                      onMouseEnter={e =>
                        ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.7)")
                      }
                      onMouseLeave={e =>
                        ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.3)")
                      }
                    >
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>

                  {/* Confirm Password */}
                  <div
                    className="flex items-center gap-2 rounded-full px-4 py-3"
                    style={{ background: "#171717", boxShadow: "inset 2px 5px 10px rgb(5,5,5)" }}
                  >
                    <Lock size={18} color="rgba(255,255,255,0.5)" style={{ flexShrink: 0 }} />
                    <input
                      type={showConf ? "text" : "password"}
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="Confirm Password"
                      required
                      className="flex-1 bg-transparent border-none outline-none text-sm"
                      style={{ color: "#d3d3d3", fontFamily: "'Inter', sans-serif" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConf(!showConf)}
                      style={{ color: "rgba(255,255,255,0.3)", flexShrink: 0 }}
                      onMouseEnter={e =>
                        ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.7)")
                      }
                      onMouseLeave={e =>
                        ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.3)")
                      }
                    >
                      {showConf ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>

                  {/* Role Request dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setDropOpen(o => !o)}
                      className="w-full flex items-center gap-2 rounded-full px-4 py-3 text-left transition-all"
                      style={{ background: "#171717", boxShadow: "inset 2px 5px 10px rgb(5,5,5)" }}
                    >
                      <Shield size={18} color="rgba(0,255,117,0.6)" style={{ flexShrink: 0 }} />
                      <span
                        className="flex-1 text-sm"
                        style={{ color: "#d3d3d3", fontFamily: "'Inter', sans-serif" }}
                      >
                        {selectedRole.label}
                      </span>
                      <motion.div animate={{ rotate: dropOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronDown size={14} style={{ color: "rgba(255,255,255,0.3)" }} />
                      </motion.div>
                    </button>

                    <AnimatePresence>
                      {dropOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -6, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.97 }}
                          transition={{ duration: 0.15 }}
                          className="absolute left-0 right-0 top-full mt-2 rounded-2xl overflow-hidden z-50"
                          style={{
                            background: "#1a1a1a",
                            border:     "1px solid rgba(255,255,255,0.08)",
                            boxShadow:  "0 12px 40px rgba(0,0,0,0.5)",
                          }}
                        >
                          {ROLE_OPTIONS.map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => { setRole(opt.value); setDropOpen(false); }}
                              className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors"
                              style={{
                                background: role === opt.value ? "rgba(0,255,117,0.06)" : "transparent",
                              }}
                              onMouseEnter={e =>
                                ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)")
                              }
                              onMouseLeave={e =>
                                ((e.currentTarget as HTMLElement).style.background =
                                  role === opt.value ? "rgba(0,255,117,0.06)" : "transparent")
                              }
                            >
                              <div
                                className="w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5"
                                style={{
                                  borderColor: role === opt.value ? "#00ff75" : "rgba(255,255,255,0.2)",
                                  background:  role === opt.value ? "rgba(0,255,117,0.15)" : "transparent",
                                }}
                              >
                                {role === opt.value && (
                                  <div className="w-2 h-2 rounded-full" style={{ background: "#00ff75" }} />
                                )}
                              </div>
                              <div>
                                <p
                                  className="text-sm font-medium"
                                  style={{
                                    color:      role === opt.value ? "#00ff75" : "#d3d3d3",
                                    fontFamily: "'Space Grotesk', sans-serif",
                                  }}
                                >
                                  {opt.label}
                                </p>
                                <p
                                  className="text-xs mt-0.5"
                                  style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'Inter', sans-serif" }}
                                >
                                  {opt.desc}
                                </p>
                              </div>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Error message */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div
                          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl"
                          style={{
                            background: "rgba(239,68,68,0.08)",
                            border:     "1px solid rgba(239,68,68,0.2)",
                          }}
                        >
                          <AlertCircle size={13} style={{ color: "#f87171", flexShrink: 0 }} />
                          <span
                            className="text-xs"
                            style={{ color: "#f87171", fontFamily: "'Inter', sans-serif" }}
                          >
                            {error}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Buttons row */}
                  <div className="flex justify-center gap-3 mt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex items-center justify-center gap-2 rounded-md px-7 py-2 text-sm text-white font-medium transition-all duration-300 disabled:opacity-50"
                      style={{
                        background:  "#252525",
                        fontFamily:  "'Space Grotesk', sans-serif",
                        minWidth:    110,
                      }}
                      onMouseEnter={e =>
                        ((e.currentTarget as HTMLElement).style.background = "#000")
                      }
                      onMouseLeave={e =>
                        ((e.currentTarget as HTMLElement).style.background = "#252525")
                      }
                    >
                      {loading ? (
                        <div
                          className="w-4 h-4 rounded-full border-2"
                          style={{
                            borderColor:    "rgba(255,255,255,0.25)",
                            borderTopColor: "#fff",
                            animation:      "uv-spin 0.75s linear infinite",
                          }}
                        />
                      ) : (
                        "Sign Up"
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate("/admin/login")}
                      className="rounded-md px-7 py-2 text-sm text-white font-medium transition-all duration-300"
                      style={{ background: "#252525", fontFamily: "'Space Grotesk', sans-serif" }}
                      onMouseEnter={e =>
                        ((e.currentTarget as HTMLElement).style.background = "#000")
                      }
                      onMouseLeave={e =>
                        ((e.currentTarget as HTMLElement).style.background = "#252525")
                      }
                    >
                      Login
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      <style>{`
        @keyframes uv-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
