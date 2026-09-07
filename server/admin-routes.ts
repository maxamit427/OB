import { Router } from "express";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { storage } from "./storage";
import { requireAdmin, generateToken } from "./middleware/adminAuth";
import { z } from "zod";
import { broadcast } from "./adminWS";
import { generateOtp, sendOtpEmail } from "./auth-routes";

export const adminRouter = Router();

// ─── SIMPLE IN-MEMORY BRUTE-FORCE PROTECTION ────────────────────────────────
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();
const resetAttempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 10;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(ip: string): { blocked: boolean; remaining: number } {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry) return { blocked: false, remaining: MAX_ATTEMPTS };
  if (entry.lockedUntil > now) return { blocked: true, remaining: 0 };
  if (entry.lockedUntil > 0 && entry.lockedUntil <= now) {
    loginAttempts.delete(ip);
    return { blocked: false, remaining: MAX_ATTEMPTS };
  }
  return { blocked: false, remaining: Math.max(0, MAX_ATTEMPTS - entry.count) };
}

function recordFailedLogin(ip: string) {
  const now = Date.now();
  const entry = loginAttempts.get(ip) ?? { count: 0, lockedUntil: 0 };
  const updated = { count: entry.count + 1, lockedUntil: entry.lockedUntil };
  if (updated.count >= MAX_ATTEMPTS) updated.lockedUntil = now + LOCK_DURATION_MS;
  loginAttempts.set(ip, updated);
}

function clearLoginAttempts(ip: string) {
  loginAttempts.delete(ip);
}

function resetBlocked(key: string) {
  const now = Date.now();
  const entry = resetAttempts.get(key);
  if (!entry) return false;
  if (entry.lockedUntil > now) return true;
  if (entry.lockedUntil > 0) resetAttempts.delete(key);
  return false;
}

function recordResetAttempt(key: string) {
  const entry = resetAttempts.get(key) ?? { count: 0, lockedUntil: 0 };
  const count = entry.count + 1;
  resetAttempts.set(key, {
    count,
    lockedUntil: count >= 3 ? Date.now() + 10 * 60 * 1000 : 0,
  });
}

function clearResetAttempts(key: string) {
  resetAttempts.delete(key);
}

// ─── AUTH ────────────────────────────────────────────────────────────────────

adminRouter.post("/login", async (req, res) => {
  const ip = req.ip || "unknown";
  const ua = req.headers["user-agent"] || "";
  const { blocked } = checkRateLimit(ip);
  if (blocked) {
    return res.status(429).json({ success: false, message: "Too many failed attempts. Try again in 15 minutes." });
  }

  try {
    const { username, password } = z.object({
      username: z.string().min(1),
      password: z.string().min(1),
    }).parse(req.body);

    // Support login via username OR email
    const user = await storage.getAdminUserByUsernameOrEmail(username);
    if (!user) {
      recordFailedLogin(ip);
      await storage.createSecurityLog({ event: "Failed Login Attempt", severity: "warning", ip, userAgent: ua, details: `Invalid identifier attempted` });
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      recordFailedLogin(ip);
      await storage.createSecurityLog({ event: "Failed Login Attempt", severity: "warning", ip, userAgent: ua, details: `Wrong password for user: ${username}` });
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    clearLoginAttempts(ip);
    const token = generateToken({ id: user.id, username: user.username, role: user.role });

    // Update last seen
    await storage.updateAdminUserLastSeen(user.id);

    // Security log + activity log
    await storage.createSecurityLog({ event: "Admin Login", severity: "info", ip, userAgent: ua, details: `Successful login: ${username} (${user.role})` });
    await storage.createActivityLog({ userId: user.id, username: user.username, event: "login", ip, userAgent: ua, details: `Logged in as ${user.role}` });

    res.json({ success: true, token, user: { id: user.id, username: user.username, role: user.role, fullName: user.fullName, email: user.email } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, message: err.errors[0].message });
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ─── ADMIN PASSWORD RESET (public, OTP protected) ─────────────────────────────

adminRouter.post("/forgot-password", async (req, res) => {
  try {
    const { email } = z.object({ email: z.string().email("Enter a valid admin email") }).parse(req.body);
    const normalizedEmail = email.trim().toLowerCase();
    const rateKey = `admin-reset:${req.ip || "unknown"}:${normalizedEmail}`;

    if (resetBlocked(rateKey)) {
      return res.status(429).json({ success: false, message: "Too many reset requests. Please wait before trying again." });
    }
    recordResetAttempt(rateKey);

    const admin = await storage.getAdminUserByEmail(normalizedEmail);
    if (admin) {
      const code = generateOtp();
      await storage.createOtpCode({ email: normalizedEmail, code, type: "admin_reset_password" });
      try {
        await sendOtpEmail(normalizedEmail, code, "reset");
      } catch (mailErr) {
        console.error("[ADMIN FORGOT-PW] Email send failed:", mailErr);
      }
    }

    return res.json({
      success: true,
      message: "If an admin account exists with that email, a reset code has been sent.",
    });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, message: err.errors[0].message });
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

adminRouter.post("/reset-password", async (req, res) => {
  try {
    const { email, code, newPassword } = z.object({
      email: z.string().email("Enter a valid admin email"),
      code: z.string().length(6, "Reset code must be 6 digits"),
      newPassword: z.string().min(8, "Password must be at least 8 characters"),
    }).parse(req.body);

    const normalizedEmail = email.trim().toLowerCase();
    const admin = await storage.getAdminUserByEmail(normalizedEmail);
    const otp = await storage.getValidOtpCode(normalizedEmail, "admin_reset_password");

    if (!admin || !otp || new Date(otp.expiresAt) < new Date() || otp.attempts >= 5) {
      return res.status(400).json({ success: false, message: "Invalid or expired reset code" });
    }
    if (otp.code !== code) {
      await storage.incrementOtpAttempts(otp.id);
      return res.status(400).json({ success: false, message: "Invalid or expired reset code" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await storage.markOtpUsed(otp.id);
    await storage.updateAdminUserPassword(admin.id, hashedPassword);
    clearResetAttempts(`admin-reset:${req.ip || "unknown"}:${normalizedEmail}`);
    await storage.createSecurityLog({
      event: "Admin Password Reset",
      severity: "info",
      ip: req.ip || "",
      userAgent: req.headers["user-agent"] || "",
      details: `Password reset for admin: ${admin.username}`,
    });

    return res.json({ success: true, message: "Admin password reset successfully. You can now sign in." });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, message: err.errors[0].message });
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

adminRouter.post("/logout", requireAdmin, async (req, res) => {
  const admin = req.admin!;
  const ip = req.ip || "";
  const ua = req.headers["user-agent"] || "";
  await storage.createSecurityLog({ event: "Admin Logout", severity: "info", ip, userAgent: ua, details: `Logout: ${admin.username}` });
  await storage.createActivityLog({ userId: admin.id, username: admin.username, event: "logout", ip, userAgent: ua, details: `Signed out` });
  res.json({ success: true });
});

adminRouter.get("/me", requireAdmin, async (req, res) => {
  const admin = req.admin!;
  await storage.updateAdminUserLastSeen(admin.id);
  res.json({ success: true, user: req.admin });
});

// ─── PUBLIC SIGNUP (no auth required) ────────────────────────────────────────

adminRouter.post("/signup", async (req, res) => {
  const ip = req.ip || "unknown";
  const ua = req.headers["user-agent"] || "";

  try {
    const { fullName, username, email, password, requestedRole } = z.object({
      fullName:      z.string().min(2, "Full name must be at least 2 characters").max(80),
      username:      z.string().min(3, "Username must be at least 3 characters").max(32).regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores"),
      email:         z.string().email("Invalid email address").max(200),
      password:      z.string().min(8, "Password must be at least 8 characters"),
      requestedRole: z.enum(["admin", "super_admin"]).default("admin"),
    }).parse(req.body);

    // Check existing admin user with same username
    const existingUser = await storage.getAdminUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Username already taken" });
    }

    // Check pending request with same username
    const pendingUsers = await storage.getPendingUsers();
    const existingPending = pendingUsers.find(
      p => p.username.toLowerCase() === username.toLowerCase() && p.status === "pending"
    );
    if (existingPending) {
      return res.status(400).json({ success: false, message: "A signup request with this username is already pending" });
    }

    // Hash password immediately and store it — so we can approve later
    const hashedPassword = await bcrypt.hash(password, 10);

    const pending = await storage.createPendingUser({
      fullName,
      username,
      email,
      password: hashedPassword,
      requestedRole,
      ip,
      userAgent: ua,
    });

    await storage.createSecurityLog({ event: "Signup Request", severity: "info", ip, userAgent: ua, details: `New signup request: ${username} (${email}) requesting ${requestedRole}` });
    await storage.createActivityLog({ userId: pending.id, username, event: "signup_request", ip, userAgent: ua, details: `Requested role: ${requestedRole}` });

    broadcast("signup_request", { id: pending.id, username });

    res.status(201).json({ success: true, message: "Your signup request has been submitted. A Super Admin will review it shortly." });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, message: err.errors[0].message });
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ─── PENDING USERS (Super Admin only) ─────────────────────────────────────────

adminRouter.get("/pending-users", requireAdmin, async (req, res) => {
  const admin = req.admin!;
  if (admin.role !== "super_admin") {
    return res.status(403).json({ success: false, message: "Only Super Admin can view pending signups" });
  }
  const pending = await storage.getPendingUsers();
  // Never expose hashed passwords
  const safe = pending.map(({ password: _pw, ...p }) => p);
  res.json({ success: true, data: safe });
});

adminRouter.post("/pending-users/:id/approve", requireAdmin, async (req, res) => {
  const admin = req.admin!;
  if (admin.role !== "super_admin") {
    return res.status(403).json({ success: false, message: "Only Super Admin can approve signups" });
  }
  try {
    const { role } = z.object({
      role: z.enum(["super_admin", "admin", "moderator", "editor"]),
    }).parse(req.body);

    const pending = await storage.getPendingUser(req.params.id);
    if (!pending) return res.status(404).json({ success: false, message: "Signup request not found" });
    if (pending.status !== "pending") return res.status(400).json({ success: false, message: "Request already reviewed" });

    const updated = await storage.approvePendingUser(req.params.id, role, admin.username);
    await storage.createSecurityLog({ event: "Signup Approved", severity: "info", ip: req.ip || "", userAgent: req.headers["user-agent"] || "", details: `${pending.username} approved as ${role} by ${admin.username}` });
    await storage.createActivityLog({ userId: req.params.id, username: pending.username, event: "signup_approved", ip: req.ip || "", userAgent: req.headers["user-agent"] || "", details: `Approved as ${role} by ${admin.username}` });

    broadcast("signup_approved", { id: req.params.id, username: pending.username });

    const safe = updated ? (({ password: _pw, ...p }) => p)(updated) : null;
    res.json({ success: true, data: safe });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, message: err.errors[0].message });
    res.status(500).json({ success: false, message: "Server error" });
  }
});

adminRouter.post("/pending-users/:id/reject", requireAdmin, async (req, res) => {
  const admin = req.admin!;
  if (admin.role !== "super_admin") {
    return res.status(403).json({ success: false, message: "Only Super Admin can reject signups" });
  }
  try {
    const { reason } = z.object({ reason: z.string().optional() }).parse(req.body);

    const pending = await storage.getPendingUser(req.params.id);
    if (!pending) return res.status(404).json({ success: false, message: "Signup request not found" });
    if (pending.status !== "pending") return res.status(400).json({ success: false, message: "Request already reviewed" });

    const updated = await storage.rejectPendingUser(req.params.id, admin.username, reason);
    await storage.createSecurityLog({ event: "Signup Rejected", severity: "warning", ip: req.ip || "", userAgent: req.headers["user-agent"] || "", details: `${pending.username} rejected by ${admin.username}` });
    await storage.createActivityLog({ userId: req.params.id, username: pending.username, event: "signup_rejected", ip: req.ip || "", userAgent: req.headers["user-agent"] || "", details: `Rejected by ${admin.username}` });

    broadcast("signup_rejected", { id: req.params.id, username: pending.username });

    const safe = updated ? (({ password: _pw, ...p }) => p)(updated) : null;
    res.json({ success: true, data: safe });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, message: err.errors[0].message });
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ─── ACTIVITY LOGS (Super Admin only) ─────────────────────────────────────────

adminRouter.get("/activity-logs", requireAdmin, async (req, res) => {
  const admin = req.admin!;
  if (admin.role !== "super_admin") {
    return res.status(403).json({ success: false, message: "Only Super Admin can view activity logs" });
  }
  const rawLimit = parseInt((req.query.limit as string) || "100", 10);
  const limit = isNaN(rawLimit) || rawLimit < 1 ? 100 : Math.min(rawLimit, 500);
  const logs = await storage.getActivityLogs(limit);
  res.json({ success: true, data: logs });
});

// ─── STATS ───────────────────────────────────────────────────────────────────

adminRouter.get("/stats", requireAdmin, async (_req, res) => {
  const stats = await storage.getStats();
  res.json({ success: true, data: stats });
});

// ─── MESSAGES ────────────────────────────────────────────────────────────────

adminRouter.get("/messages", requireAdmin, async (_req, res) => {
  const msgs = await storage.getMessages();
  res.json({ success: true, data: msgs });
});

adminRouter.get("/messages/:id", requireAdmin, async (req, res) => {
  const msg = await storage.getMessage(req.params.id);
  if (!msg) return res.status(404).json({ success: false, message: "Not found" });
  await storage.updateMessageRead(req.params.id, true);
  res.json({ success: true, data: { ...msg, isRead: true } });
});

adminRouter.patch("/messages/:id/read", requireAdmin, async (req, res) => {
  try {
    const { isRead } = z.object({ isRead: z.boolean() }).parse(req.body);
    const msg = await storage.updateMessageRead(req.params.id, isRead);
    if (!msg) return res.status(404).json({ success: false, message: "Not found" });
    broadcast("message_updated", { id: req.params.id });
    res.json({ success: true, data: msg });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, message: err.errors[0].message });
    res.status(500).json({ success: false, message: "Server error" });
  }
});

adminRouter.delete("/messages/:id", requireAdmin, async (req, res) => {
  const ok = await storage.deleteMessage(req.params.id);
  if (!ok) return res.status(404).json({ success: false, message: "Not found" });
  broadcast("message_deleted", { id: req.params.id });
  res.json({ success: true });
});

// ─── PORTFOLIO ───────────────────────────────────────────────────────────────

const portfolioSchema = z.object({
  title:       z.string().min(1),
  description: z.string().min(1),
  category:    z.string().min(1),
  tags:        z.string().default("[]"),
  imageUrl:    z.string().default(""),
  liveUrl:     z.string().default(""),
  featured:    z.boolean().default(false),
  order:       z.number().int().default(0),
});

adminRouter.get("/portfolio", requireAdmin, async (_req, res) => {
  const items = await storage.getPortfolioItems();
  res.json({ success: true, data: items });
});

adminRouter.post("/portfolio", requireAdmin, async (req, res) => {
  try {
    const data = portfolioSchema.parse(req.body);
    const item = await storage.createPortfolioItem(data);
    broadcast("portfolio_created", { id: item.id });
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, message: err.errors[0].message });
    res.status(500).json({ success: false, message: "Server error" });
  }
});

adminRouter.put("/portfolio/:id", requireAdmin, async (req, res) => {
  try {
    const data = portfolioSchema.partial().parse(req.body);
    const item = await storage.updatePortfolioItem(req.params.id, data);
    if (!item) return res.status(404).json({ success: false, message: "Not found" });
    broadcast("portfolio_updated", { id: req.params.id });
    res.json({ success: true, data: item });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, message: err.errors[0].message });
    res.status(500).json({ success: false, message: "Server error" });
  }
});

adminRouter.delete("/portfolio/:id", requireAdmin, async (req, res) => {
  const ok = await storage.deletePortfolioItem(req.params.id);
  if (!ok) return res.status(404).json({ success: false, message: "Not found" });
  broadcast("portfolio_deleted", { id: req.params.id });
  res.json({ success: true });
});

// ─── TEAM ─────────────────────────────────────────────────────────────────────

const teamSchema = z.object({
  name:        z.string().min(1),
  position:    z.string().min(1),
  bio:         z.string().default(""),
  imageUrl:    z.string().default(""),
  facebookUrl: z.string().default(""),
  twitterUrl:  z.string().default(""),
  linkedinUrl: z.string().default(""),
  githubUrl:   z.string().default(""),
  order:       z.number().int().default(0),
  isActive:    z.boolean().default(true),
});

adminRouter.get("/team", requireAdmin, async (_req, res) => {
  const members = await storage.getTeamMembers();
  res.json({ success: true, data: members });
});

adminRouter.post("/team", requireAdmin, async (req, res) => {
  try {
    const data = teamSchema.parse(req.body);
    const member = await storage.createTeamMember(data);
    broadcast("team_created", { id: member.id });
    res.status(201).json({ success: true, data: member });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, message: err.errors[0].message });
    res.status(500).json({ success: false, message: "Server error" });
  }
});

adminRouter.put("/team/:id", requireAdmin, async (req, res) => {
  try {
    const data = teamSchema.partial().parse(req.body);
    const member = await storage.updateTeamMember(req.params.id, data);
    if (!member) return res.status(404).json({ success: false, message: "Not found" });
    broadcast("team_updated", { id: req.params.id });
    res.json({ success: true, data: member });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, message: err.errors[0].message });
    res.status(500).json({ success: false, message: "Server error" });
  }
});

adminRouter.delete("/team/:id", requireAdmin, async (req, res) => {
  const ok = await storage.deleteTeamMember(req.params.id);
  if (!ok) return res.status(404).json({ success: false, message: "Not found" });
  broadcast("team_deleted", { id: req.params.id });
  res.json({ success: true });
});

// ─── CATEGORIES ───────────────────────────────────────────────────────────────

const categorySchema = z.object({
  title:       z.string().min(1),
  subtitle:    z.string().default(""),
  description: z.string().default(""),
  icon:        z.string().default("Shield"),
  color:       z.string().default("text-cyan-400"),
  imageUrl:    z.string().default(""),
  type:        z.string().default("service"),
  order:       z.number().int().default(0),
  isVisible:   z.boolean().default(true),
});

adminRouter.get("/categories", requireAdmin, async (_req, res) => {
  const cats = await storage.getCategories();
  res.json({ success: true, data: cats });
});

adminRouter.post("/categories", requireAdmin, async (req, res) => {
  try {
    const data = categorySchema.parse(req.body);
    const cat = await storage.createCategory(data);
    broadcast("category_created", { id: cat.id });
    res.status(201).json({ success: true, data: cat });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, message: err.errors[0].message });
    res.status(500).json({ success: false, message: "Server error" });
  }
});

adminRouter.put("/categories/:id", requireAdmin, async (req, res) => {
  try {
    const data = categorySchema.partial().parse(req.body);
    const cat = await storage.updateCategory(req.params.id, data);
    if (!cat) return res.status(404).json({ success: false, message: "Not found" });
    broadcast("category_updated", { id: req.params.id });
    res.json({ success: true, data: cat });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, message: err.errors[0].message });
    res.status(500).json({ success: false, message: "Server error" });
  }
});

adminRouter.delete("/categories/:id", requireAdmin, async (req, res) => {
  const ok = await storage.deleteCategory(req.params.id);
  if (!ok) return res.status(404).json({ success: false, message: "Not found" });
  broadcast("category_deleted", { id: req.params.id });
  res.json({ success: true });
});

// ─── SECURITY LOGS ────────────────────────────────────────────────────────────

adminRouter.get("/security/logs", requireAdmin, async (req, res) => {
  const rawLimit = parseInt((req.query.limit as string) || "50", 10);
  const limit = isNaN(rawLimit) || rawLimit < 1 ? 50 : Math.min(rawLimit, 500);
  const logs = await storage.getSecurityLogs(limit);
  res.json({ success: true, data: logs });
});

// ─── SETTINGS ────────────────────────────────────────────────────────────────

adminRouter.get("/settings", requireAdmin, async (_req, res) => {
  const settings = await storage.getSettings();
  const obj: Record<string, string> = {};
  for (const s of settings) obj[s.key] = s.value;
  res.json({ success: true, data: obj });
});

adminRouter.put("/settings", requireAdmin, async (req, res) => {
  try {
    const updates = z.record(z.string(), z.string()).parse(req.body);
    for (const [key, value] of Object.entries(updates)) {
      await storage.setSetting(key, value);
    }
    const settings = await storage.getSettings();
    const obj: Record<string, string> = {};
    for (const s of settings) obj[s.key] = s.value;
    broadcast("settings_updated", {});
    res.json({ success: true, data: obj });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, message: err.errors[0].message });
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ─── USERS ────────────────────────────────────────────────────────────────────

adminRouter.get("/users", requireAdmin, async (_req, res) => {
  const users = await storage.getAllAdminUsers();
  const safe = users.map(u => ({ id: u.id, username: u.username, role: u.role, fullName: u.fullName, email: u.email, createdAt: u.createdAt, lastLogin: u.lastLogin, lastSeen: u.lastSeen }));
  res.json({ success: true, data: safe });
});

adminRouter.put("/users/password", requireAdmin, async (req, res) => {
  try {
    const { currentPassword, newPassword } = z.object({
      currentPassword: z.string().min(1),
      newPassword:     z.string().min(6, "New password must be at least 6 characters"),
    }).parse(req.body);

    const admin = req.admin!;
    const user = await storage.getAdminUserByUsername(admin.username);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(400).json({ success: false, message: "Current password is incorrect" });

    const hashed = await bcrypt.hash(newPassword, 10);
    await storage.updateAdminUserPassword(user.id, hashed);
    await storage.createSecurityLog({ event: "Password Changed", severity: "info", ip: req.ip || "", userAgent: req.headers["user-agent"] || "", details: `${admin.username} changed their password` });
    await storage.createActivityLog({ userId: user.id, username: admin.username, event: "password_change", ip: req.ip || "", userAgent: req.headers["user-agent"] || "", details: "Password updated" });

    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, message: err.errors[0].message });
    res.status(500).json({ success: false, message: "Server error" });
  }
});

adminRouter.post("/users", requireAdmin, async (req, res) => {
  try {
    const admin = req.admin!;
    if (admin.role !== "super_admin" && admin.role !== "admin") {
      return res.status(403).json({ success: false, message: "Insufficient permissions" });
    }
    const { username, password, role } = z.object({
      username: z.string().min(3).max(32),
      password: z.string().min(6),
      role:     z.enum(["super_admin", "admin", "moderator", "editor"]),
    }).parse(req.body);

    const existing = await storage.getAdminUserByUsername(username);
    if (existing) return res.status(400).json({ success: false, message: "Username already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await storage.createAdminUser(username, hashed, role);
    await storage.createSecurityLog({ event: "User Created", severity: "info", ip: req.ip || "", userAgent: req.headers["user-agent"] || "", details: `New ${role}: ${username} (created by ${admin.username})` });
    res.status(201).json({ success: true, data: { id: user.id, username: user.username, role: user.role, createdAt: user.createdAt } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, message: err.errors[0].message });
    res.status(500).json({ success: false, message: "Server error" });
  }
});

adminRouter.put("/users/:id/role", requireAdmin, async (req, res) => {
  try {
    const admin = req.admin!;
    if (admin.role !== "super_admin") {
      return res.status(403).json({ success: false, message: "Only Super Admin can change roles" });
    }
    const { role } = z.object({ role: z.enum(["super_admin", "admin", "moderator", "editor"]) }).parse(req.body);
    const updated = await storage.updateAdminUserRole(req.params.id, role);
    if (!updated) return res.status(404).json({ success: false, message: "User not found" });
    await storage.createSecurityLog({ event: "Role Changed", severity: "info", ip: req.ip || "", userAgent: req.headers["user-agent"] || "", details: `${updated.username} role changed to ${role} by ${admin.username}` });
    res.json({ success: true, data: { id: updated.id, username: updated.username, role: updated.role } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, message: err.errors[0].message });
    res.status(500).json({ success: false, message: "Server error" });
  }
});

adminRouter.delete("/users/:id", requireAdmin, async (req, res) => {
  const admin = req.admin!;
  if (admin.role !== "super_admin") {
    return res.status(403).json({ success: false, message: "Only Super Admin can delete users" });
  }
  if (admin.id === req.params.id) {
    return res.status(400).json({ success: false, message: "Cannot delete your own account" });
  }
  const ok = await storage.deleteAdminUser(req.params.id);
  if (!ok) return res.status(404).json({ success: false, message: "User not found" });
  await storage.createSecurityLog({ event: "User Deleted", severity: "warning", ip: req.ip || "", userAgent: req.headers["user-agent"] || "", details: `User ID ${req.params.id} deleted by ${admin.username}` });
  res.json({ success: true });
});

// ─── PUBLIC USER MANAGEMENT ──────────────────────────────────────────────────
adminRouter.get("/public-users", requireAdmin, async (_req, res) => {
  try {
    const users = await storage.getAllPublicUsers();
    // Strip sensitive fields before returning
    const safe = users.map(u => ({
      id:              u.id,
      name:            u.name,
      username:        u.username,
      email:           u.email,
      role:            u.role,
      isEmailVerified: u.isEmailVerified,
      isBanned:        u.isBanned,
      banReason:       u.banReason,
      provider:        u.provider,
      createdAt:       u.createdAt,
      lastLoginAt:     u.lastLoginAt,
      lastSeenAt:      u.lastSeenAt,
      ipAddress:       u.ipAddress,
    }));
    res.json({ success: true, data: safe });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

adminRouter.post("/public-users/:id/ban", requireAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await storage.banPublicUser(req.params.id, reason || "");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    await storage.createSecurityLog({ event: "Public User Banned", severity: "warning", ip: req.ip || "", userAgent: req.headers["user-agent"] || "", details: `User ${user.username} banned by admin` });
    res.json({ success: true, data: user });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

adminRouter.post("/public-users/:id/unban", requireAdmin, async (req, res) => {
  try {
    const user = await storage.unbanPublicUser(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    await storage.createSecurityLog({ event: "Public User Unbanned", severity: "info", ip: req.ip || "", userAgent: req.headers["user-agent"] || "", details: `User ${user.username} unbanned by admin` });
    res.json({ success: true, data: user });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

adminRouter.post("/public-users/:id/verify", requireAdmin, async (req, res) => {
  try {
    const user = await storage.verifyPublicUserById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, data: user });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

adminRouter.delete("/public-users/:id", requireAdmin, async (req, res) => {
  try {
    const ok = await storage.deletePublicUser(req.params.id);
    if (!ok) return res.status(404).json({ success: false, message: "User not found" });
    await storage.createSecurityLog({ event: "Public User Deleted", severity: "warning", ip: req.ip || "", userAgent: req.headers["user-agent"] || "", details: `Public user ID ${req.params.id} deleted by admin` });
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ─── MARKETPLACE SERVICES (ADMIN CRUD) ───────────────────────────────────────

adminRouter.get("/services", requireAdmin, async (_req, res) => {
  try {
    const services = await storage.getServices();
    res.json({ success: true, data: services });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

adminRouter.post("/services", requireAdmin, async (req, res) => {
  try {
    const data = req.body;
    if (!data.title || !data.description || !data.price || !data.category) {
      return res.status(400).json({ success: false, message: "title, description, price, and category are required" });
    }
    const service = await storage.createService({
      title:           data.title,
      description:     data.description,
      longDescription: data.longDescription ?? "",
      price:           String(data.price),
      category:        data.category,
      platform:        data.platform ?? "",
      deliveryTime:    data.deliveryTime ?? "1-3 days",
      features:        data.features ?? "[]",
      minQuantity:     Number(data.minQuantity) || 1,
      maxQuantity:     Number(data.maxQuantity) || 10000,
      isActive:        data.isActive ?? true,
      imageUrl:        data.imageUrl ?? "",
      order:           Number(data.order) || 0,
    });
    res.status(201).json({ success: true, data: service });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

adminRouter.put("/services/:id", requireAdmin, async (req, res) => {
  try {
    const updated = await storage.updateService(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, message: "Service not found" });
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

adminRouter.delete("/services/:id", requireAdmin, async (req, res) => {
  try {
    const ok = await storage.deleteService(req.params.id);
    if (!ok) return res.status(404).json({ success: false, message: "Service not found" });
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ─── ORDERS (ADMIN MANAGEMENT) ────────────────────────────────────────────────

adminRouter.get("/orders", requireAdmin, async (_req, res) => {
  try {
    const orders = await storage.getOrders();
    res.json({ success: true, data: orders });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

adminRouter.put("/orders/:id", requireAdmin, async (req, res) => {
  try {
    const allowed = ["orderStatus", "paymentStatus", "adminNote", "transactionId"];
    const updates: any = {};
    for (const key of allowed) {
      if (key in req.body) updates[key] = req.body[key];
    }
    const updated = await storage.updateOrder(req.params.id, updates);
    if (!updated) return res.status(404).json({ success: false, message: "Order not found" });
    await storage.createSecurityLog({ event: "Order Updated", severity: "info", ip: req.ip || "", userAgent: req.headers["user-agent"] || "", details: `Order ${req.params.id} updated — orderStatus: ${updates.orderStatus ?? "—"}, paymentStatus: ${updates.paymentStatus ?? "—"}` });
    broadcast("order_updated", { id: req.params.id, orderStatus: updated.orderStatus, paymentStatus: updated.paymentStatus });
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ─── OTP LOGS ─────────────────────────────────────────────────────────────────

adminRouter.get("/otp-logs", requireAdmin, async (req, res) => {
  try {
    const rawLimit = parseInt((req.query.limit as string) || "100", 10);
    const limit = isNaN(rawLimit) || rawLimit < 1 ? 100 : Math.min(rawLimit, 500);
    const logs = await storage.getOtpLogs(limit);
    res.json({ success: true, data: logs });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ─── TEST EMAIL ───────────────────────────────────────────────────────────────

adminRouter.post("/test-email", requireAdmin, async (req, res) => {
  try {
    const toAddress = req.body?.to as string | undefined;

    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;
    const yahooPass = process.env.YAHOO_EMAIL_PASSWORD;

    let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;
    let provider = "none";
    let senderEmail = "olderbrotherofficial@yahoo.com";

    if (gmailUser && gmailPass) {
      transporter = nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user: gmailUser, pass: gmailPass } });
      senderEmail = gmailUser;
      provider = "Gmail";
    } else if (yahooPass) {
      transporter = nodemailer.createTransport({
        host: "smtp.mail.yahoo.com", port: 465, secure: true,
        auth: { user: "olderbrotherofficial@yahoo.com", pass: yahooPass },
      });
      provider = "Yahoo";
    }

    if (!transporter) {
      return res.status(400).json({
        success: false,
        message: "No email provider configured. Set GMAIL_USER + GMAIL_APP_PASSWORD or YAHOO_EMAIL_PASSWORD in secrets.",
      });
    }

    const recipient = toAddress || senderEmail;
    await transporter.sendMail({
      from:    `"Older Brother Test" <${senderEmail}>`,
      to:      recipient,
      subject: "✅ Test Email — Older Brother Marketplace",
      html: `
        <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;background:#0d0d0d;padding:32px;border-radius:12px;border:1px solid rgba(255,255,255,0.1)">
          <h2 style="color:#06b6d4;margin:0 0 16px">✅ Email System Working</h2>
          <p style="color:rgba(255,255,255,0.7);font-size:14px;line-height:1.6;margin:0 0 16px">
            Your email configuration via <strong style="color:#fff">${provider}</strong> is working correctly.
          </p>
          <p style="color:rgba(255,255,255,0.4);font-size:12px;margin:0">Sent from Older Brother Admin Panel</p>
        </div>
      `,
    });

    res.json({ success: true, message: `Test email sent via ${provider} to ${recipient}` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: `Email failed: ${err?.message ?? "Unknown error"}` });
  }
});
