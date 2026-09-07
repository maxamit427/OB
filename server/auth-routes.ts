import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import nodemailer from "nodemailer";
import { randomInt } from "node:crypto";
import { storage } from "./storage";
import { getGoogleClientId } from "./google-config";

export const authRouter = Router();

// ─── JWT SECRET ───────────────────────────────────────────────────────────────
// SECURITY: Set JWT_SECRET in Replit Secrets (never hardcode it here).
// For cPanel/custom hosting: add it to your server's environment or .env file.
// The app will warn in development and refuse to start in production if unset.
const PUBLIC_JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error("[FATAL] JWT_SECRET is not set. Configure it in Replit Secrets before deploying.");
      process.exit(1);
    }
    console.warn("[WARN] JWT_SECRET is not set. Using insecure fallback — set it in Replit Secrets.");
    return "dev-only-insecure-fallback-do-not-use-in-production";
  }
  return secret;
})();

// ─── RATE LIMITING ────────────────────────────────────────────────────────────
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();

function checkAuthRateLimit(key: string, max = 5): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry) return false;
  if (entry.lockedUntil > now) return true;
  if (entry.lockedUntil > 0 && entry.lockedUntil <= now) { loginAttempts.delete(key); return false; }
  return false;
}

function recordAuthFail(key: string, max = 5, lockMs = 15 * 60 * 1000) {
  const now = Date.now();
  const entry = loginAttempts.get(key) ?? { count: 0, lockedUntil: 0 };
  const updated = { count: entry.count + 1, lockedUntil: entry.lockedUntil };
  if (updated.count >= max) updated.lockedUntil = now + lockMs;
  loginAttempts.set(key, updated);
}

function clearAuthAttempts(key: string) { loginAttempts.delete(key); }

// ─── OTP EMAIL ────────────────────────────────────────────────────────────────
// SECURITY: Credentials are read ONLY from environment variables — never hardcoded.
// Set the following in Replit Secrets (or your .env for cPanel/custom hosting):
//
//   GMAIL_USER          → your Gmail address
//   GMAIL_APP_PASSWORD  → 16-char Gmail App Password (not your login password)
//                         Generate at: https://myaccount.google.com/apppasswords
//
// Fallback: YAHOO_EMAIL_PASSWORD for Yahoo SMTP.
// If neither is set, OTP codes are logged server-side but not emailed.
// Passwords are NEVER logged — only the destination email address.
export async function sendOtpEmail(email: string, code: string, type: "verify" | "reset" | "login"): Promise<boolean> {
  const subject = type === "verify"
    ? "Verify your Older Brother account"
    : type === "reset"
    ? "Reset your Older Brother password"
    : "Your Older Brother login code";

  const body = `
    <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;background:#0d0d0d;padding:40px;border-radius:16px;border:1px solid rgba(255,255,255,0.08)">
      <div style="text-align:center;margin-bottom:32px">
        <h1 style="color:#06b6d4;font-size:24px;margin:0;letter-spacing:-0.5px">Older Brother</h1>
        <p style="color:rgba(255,255,255,0.4);font-size:12px;margin:4px 0 0">Digital Security Platform</p>
      </div>
      <h2 style="color:#fff;font-size:18px;margin:0 0 8px">${
        type === "verify" ? "Verify your email" : type === "reset" ? "Reset your password" : "Your login code"
      }</h2>
      <p style="color:rgba(255,255,255,0.5);font-size:14px;line-height:1.6;margin:0 0 28px">
        ${type === "verify"
          ? "Enter this code to verify your email address."
          : type === "reset"
          ? "Enter this code to reset your password."
          : "Use this code to complete your login."}
      </p>
      <div style="text-align:center;background:rgba(6,182,212,0.08);border:1px solid rgba(6,182,212,0.2);border-radius:12px;padding:28px;margin-bottom:24px">
        <p style="color:rgba(255,255,255,0.4);font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px">Your OTP Code</p>
        <p style="color:#06b6d4;font-size:40px;font-weight:700;letter-spacing:12px;margin:0;font-family:monospace">${code}</p>
        <p style="color:rgba(255,255,255,0.3);font-size:11px;margin:12px 0 0">Expires in 10 minutes</p>
      </div>
      <p style="color:rgba(255,255,255,0.3);font-size:12px;text-align:center;margin:0">
        If you didn't request this code, you can safely ignore this email.
      </p>
    </div>
  `;

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  const yahooPass = process.env.YAHOO_EMAIL_PASSWORD;

  let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;
  let senderEmail = "olderbrotherofficial@yahoo.com";

  if (gmailUser && gmailPass) {
    // Explicit Gmail SMTP — more reliable than service:"gmail" in cloud environments
    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: gmailUser, pass: gmailPass },
    });
    senderEmail = gmailUser;
  } else if (yahooPass) {
    transporter = nodemailer.createTransport({
      host: "smtp.mail.yahoo.com", port: 465, secure: true,
      auth: { user: "olderbrotherofficial@yahoo.com", pass: yahooPass },
    });
  }

  if (!transporter) {
    console.warn(`[AUTH OTP] No email transport configured. OTP email skipped for ${email}`);
    return false;
  }

  // Verify SMTP connection before sending
  try {
    await transporter.verify();
    console.log(`[AUTH OTP] SMTP connection OK. Sending ${type} OTP to ${email}`);
  } catch (verifyErr) {
    console.error(`[AUTH OTP] SMTP connection FAILED. Check GMAIL_USER / GMAIL_APP_PASSWORD in Replit Secrets.`, verifyErr);
    throw verifyErr;
  }

  const info = await transporter.sendMail({
    from: `"Older Brother" <${senderEmail}>`,
    to: email,
    subject,
    html: body,
  });
  console.log(`[AUTH OTP] Email sent to ${email} — messageId: ${info.messageId}`);
  return true;
}

export function generateOtp(): string {
  return randomInt(100000, 1000000).toString();
}

function generatePublicToken(payload: { id: string; email: string; username: string; role: string }): string {
  return jwt.sign(payload, PUBLIC_JWT_SECRET, { expiresIn: "30d" });
}

// ─── MIDDLEWARE: requirePublicAuth ────────────────────────────────────────────
export function requirePublicAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  try {
    const payload = jwt.verify(authHeader.slice(7), PUBLIC_JWT_SECRET) as any;
    req.publicUser = payload;
    next();
  } catch {
    res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
}

// ─── REGISTER ─────────────────────────────────────────────────────────────────
authRouter.post("/register", async (req, res) => {
  try {
    const { name, username, email, password } = z.object({
      name:     z.string().min(2, "Name must be at least 2 characters").max(80),
      username: z.string().min(3, "Username must be at least 3 characters").max(32)
                  .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
      email:    z.string().email("Invalid email address"),
      password: z.string().min(8, "Password must be at least 8 characters"),
    }).parse(req.body);

    const ip = req.ip || "unknown";
    const ua = req.headers["user-agent"] || "";

    const existing = await storage.getPublicUserByEmail(email);
    if (existing) return res.status(400).json({ success: false, message: "An account with this email already exists" });

    const existingUsername = await storage.getPublicUserByUsername(username);
    if (existingUsername) return res.status(400).json({ success: false, message: "This username is already taken" });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await storage.createPublicUser({ name, username, email, passwordHash, provider: "email", ipAddress: ip, userAgent: ua });

    // Send OTP
    const code = generateOtp();
    await storage.createOtpCode({ email, code, type: "verify_email" });

    try { await sendOtpEmail(email, code, "verify"); } catch (e) {
      console.error("[AUTH] Failed to send OTP:", e);
    }

    await storage.createSecurityLog({ event: "Public User Registered", severity: "info", ip, userAgent: ua, details: `New user: ${username} (${email})` });

    res.status(201).json({ success: true, message: "Account created. Please verify your email.", userId: user.id, email });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, message: err.errors[0].message });
    console.error("[AUTH] Register error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ─── LOGIN ────────────────────────────────────────────────────────────────────
authRouter.post("/login", async (req, res) => {
  const ip = req.ip || "unknown";
  const ua = req.headers["user-agent"] || "";

  try {
    const { email, password, rememberMe } = z.object({
      email:      z.string().min(1, "Email or username is required"),
      password:   z.string().min(1, "Password is required"),
      rememberMe: z.boolean().optional(),
    }).parse(req.body);

    if (checkAuthRateLimit(`login:${ip}`)) {
      return res.status(429).json({ success: false, message: "Too many failed attempts. Try again in 15 minutes." });
    }

    // Find by email or username
    const user = email.includes("@")
      ? await storage.getPublicUserByEmail(email)
      : await storage.getPublicUserByUsername(email);

    if (!user || !user.passwordHash) {
      recordAuthFail(`login:${ip}`);
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    if (user.isBanned) {
      return res.status(403).json({ success: false, message: `Account suspended${user.banReason ? ": " + user.banReason : ""}` });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      recordAuthFail(`login:${ip}`);
      await storage.createSecurityLog({ event: "Public Login Failed", severity: "warning", ip, userAgent: ua, details: `Failed login: ${email}` });
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    clearAuthAttempts(`login:${ip}`);

    if (!user.isEmailVerified) {
      // Resend OTP and ask to verify
      const code = generateOtp();
      await storage.createOtpCode({ email: user.email, code, type: "verify_email" });
      try { await sendOtpEmail(user.email, code, "verify"); } catch {}
      return res.status(403).json({
        success: false,
        message: "Email not verified. A new verification code has been sent.",
        requiresVerification: true,
        email: user.email,
      });
    }

    await storage.updatePublicUserLastLogin(user.id, ip);
    const token = generatePublicToken({ id: user.id, email: user.email, username: user.username, role: user.role });

    await storage.createSecurityLog({ event: "Public User Login", severity: "info", ip, userAgent: ua, details: `Login: ${user.username}` });

    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, username: user.username, email: user.email, role: user.role, isEmailVerified: user.isEmailVerified, profileImageUrl: user.profileImageUrl },
    });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, message: err.errors[0].message });
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ─── SEND OTP ─────────────────────────────────────────────────────────────────
authRouter.post("/send-otp", async (req, res) => {
  try {
    const { email, type } = z.object({
      email: z.string().email(),
      type:  z.enum(["verify_email", "reset_password", "login"]),
    }).parse(req.body);

    const ip = req.ip || "unknown";
    if (checkAuthRateLimit(`otp:${email}`, 3)) {
      return res.status(429).json({ success: false, message: "Too many OTP requests. Please wait before trying again." });
    }

    const code = generateOtp();
    await storage.createOtpCode({ email, code, type });

    const emailType = type === "verify_email" ? "verify" : type === "reset_password" ? "reset" : "login";
    try { await sendOtpEmail(email, code, emailType as any); } catch (e) {
      console.error("[AUTH] OTP send failed:", e);
    }

    recordAuthFail(`otp:${email}`, 3, 60 * 1000);
    res.json({ success: true, message: "Verification code sent to your email" });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, message: err.errors[0].message });
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ─── VERIFY OTP ──────────────────────────────────────────────────────────────
authRouter.post("/verify-otp", async (req, res) => {
  try {
    const { email, code, type } = z.object({
      email: z.string().email(),
      code:  z.string().length(6, "Code must be 6 digits"),
      type:  z.enum(["verify_email", "reset_password", "login"]),
    }).parse(req.body);

    const ip = req.ip || "unknown";
    const ua = req.headers["user-agent"] || "";

    const otp = await storage.getValidOtpCode(email, type);
    if (!otp) {
      return res.status(400).json({ success: false, message: "No valid code found. Please request a new one." });
    }

    if (new Date(otp.expiresAt) < new Date()) {
      return res.status(400).json({ success: false, message: "This code has expired. Please request a new one." });
    }

    if (otp.attempts >= 5) {
      return res.status(400).json({ success: false, message: "Too many incorrect attempts. Please request a new code." });
    }

    if (otp.code !== code) {
      await storage.incrementOtpAttempts(otp.id);
      const remaining = Math.max(0, 5 - (otp.attempts + 1));
      return res.status(400).json({
        success: false,
        message: remaining ? `Incorrect code. ${remaining} attempts remaining.` : "Too many incorrect attempts. Please request a new code.",
      });
    }

    await storage.markOtpUsed(otp.id);

    if (type === "verify_email") {
      await storage.verifyPublicUserEmail(email);
      const user = await storage.getPublicUserByEmail(email);
      if (!user) return res.status(404).json({ success: false, message: "User not found" });

      await storage.updatePublicUserLastLogin(user.id, ip);
      const token = generatePublicToken({ id: user.id, email: user.email, username: user.username, role: user.role });
      await storage.createSecurityLog({ event: "Public Email Verified", severity: "info", ip, userAgent: ua, details: `Email verified: ${email}` });

      return res.json({ success: true, message: "Email verified successfully!", token, user: { id: user.id, name: user.name, username: user.username, email: user.email, role: user.role, isEmailVerified: true } });
    }

    res.json({ success: true, message: "Code verified", email });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, message: err.errors[0].message });
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ─── FORGOT PASSWORD ──────────────────────────────────────────────────────────
authRouter.post("/forgot-password", async (req, res) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const rateKey = `forgot:${req.ip || "unknown"}:${email.toLowerCase()}`;
    if (checkAuthRateLimit(rateKey, 3)) {
      return res.status(429).json({ success: false, message: "Too many reset requests. Please wait before trying again." });
    }
    recordAuthFail(rateKey, 3, 10 * 60 * 1000);
    const user = await storage.getPublicUserByEmail(email);

    // Always respond with success to prevent email enumeration
    if (user && !user.isBanned) {
      const code = generateOtp();
      await storage.createOtpCode({ email, code, type: "reset_password" });
      console.log(`[FORGOT-PW] User found (${user.username}). Sending reset OTP to ${email}…`);
      try {
        await sendOtpEmail(email, code, "reset");
      } catch (mailErr: any) {
        console.error(`[FORGOT-PW] Email send FAILED for ${email}:`, mailErr?.message ?? mailErr);
      }
    } else {
      console.warn(`[FORGOT-PW] No account found for email: ${email} (user=${!!user}, banned=${user?.isBanned})`);
    }

    res.json({ success: true, message: "If an account exists with that email, a reset code has been sent." });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, message: err.errors[0].message });
    console.error("[FORGOT-PW] Unexpected error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ─── RESET PASSWORD ───────────────────────────────────────────────────────────
authRouter.post("/reset-password", async (req, res) => {
  try {
    const { email, code, newPassword } = z.object({
      email:       z.string().email(),
      code:        z.string().length(6),
      newPassword: z.string().min(8, "Password must be at least 8 characters"),
    }).parse(req.body);

    const otp = await storage.getValidOtpCode(email, "reset_password");
    if (!otp) {
      return res.status(400).json({ success: false, message: "Invalid or expired reset code" });
    }
    if (new Date(otp.expiresAt) < new Date()) {
      return res.status(400).json({ success: false, message: "Invalid or expired reset code" });
    }
    if (otp.attempts >= 5) {
      return res.status(400).json({ success: false, message: "Too many incorrect attempts. Please request a new code." });
    }
    if (otp.code !== code) {
      await storage.incrementOtpAttempts(otp.id);
      return res.status(400).json({ success: false, message: "Invalid or expired reset code" });
    }

    await storage.markOtpUsed(otp.id);
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await storage.updatePublicUserPassword(email, hashedPassword);

    res.json({ success: true, message: "Password reset successfully. You can now log in." });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, message: err.errors[0].message });
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ─── ME ───────────────────────────────────────────────────────────────────────
authRouter.get("/me", requirePublicAuth, async (req: any, res) => {
  try {
    const user = await storage.getPublicUserById(req.publicUser.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (user.isBanned) return res.status(403).json({ success: false, message: "Account suspended" });

    await storage.updatePublicUserLastSeen(user.id);
    res.json({ success: true, user: { id: user.id, name: user.name, username: user.username, email: user.email, role: user.role, isEmailVerified: user.isEmailVerified, profileImageUrl: user.profileImageUrl, createdAt: user.createdAt } });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
authRouter.post("/logout", requirePublicAuth, async (req: any, res) => {
  await storage.createSecurityLog({ event: "Public User Logout", severity: "info", ip: req.ip || "", userAgent: req.headers["user-agent"] || "", details: `Logout: ${req.publicUser?.username}` });
  res.json({ success: true });
});

// ─── GOOGLE SOCIAL LOGIN ──────────────────────────────────────────────────────
// Google Identity Services provides a short-lived access token in the browser.
// The token is checked server-side with Google's tokeninfo endpoint before an
// application session is created.
authRouter.get("/social/google/config", (_req, res) => {
  const clientId = getGoogleClientId();
  if (!clientId) {
    return res.status(503).json({
      success: false,
      message: "Google sign-in is not configured. Add GOOGLE_CLIENT_ID to the server environment.",
      configRequired: true,
    });
  }
  return res.json({ success: true, clientId });
});

authRouter.post("/social/:provider", async (req, res) => {
  const { provider } = req.params;
  if (provider !== "google") {
    return res.status(400).json({ success: false, message: "Unknown provider" });
  }

  const clientId = getGoogleClientId();
  if (!clientId) {
    return res.status(503).json({
      success: false,
      message: "Google sign-in is not configured. Add GOOGLE_CLIENT_ID to the server environment.",
      configRequired: true,
    });
  }

  try {
    const { token } = z.object({ token: z.string().min(20).max(10000) }).parse(req.body);
    const googleResponse = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(token)}`,
    );
    if (!googleResponse.ok) {
      return res.status(401).json({ success: false, message: "Google sign-in token is invalid or expired." });
    }

    const profile = await googleResponse.json() as {
      aud?: string;
      sub?: string;
      email?: string;
      verified_email?: string | boolean;
      email_verified?: string | boolean;
      name?: string;
      picture?: string;
    };
    const verified = profile.verified_email === true || profile.verified_email === "true"
      || profile.email_verified === true || profile.email_verified === "true";

    if (profile.aud !== clientId || !profile.sub || !profile.email || !verified) {
      return res.status(401).json({ success: false, message: "Google account verification failed." });
    }

    const ip = req.ip || "unknown";
    const ua = req.headers["user-agent"] || "";
    let user = await storage.getPublicUserByEmail(profile.email);

    if (user?.isBanned) {
      return res.status(403).json({ success: false, message: `Account suspended${user.banReason ? ": " + user.banReason : ""}` });
    }

    if (!user) {
      const baseUsername = (profile.email.split("@")[0] || "googleuser")
        .replace(/[^a-zA-Z0-9_]/g, "")
        .slice(0, 24) || "googleuser";
      let username = baseUsername;
      let suffix = 1;
      while (await storage.getPublicUserByUsername(username)) {
        username = `${baseUsername.slice(0, 20)}${suffix++}`;
      }

      user = await storage.createPublicUser({
        name: profile.name?.trim() || username,
        username,
        email: profile.email,
        passwordHash: null,
        provider: "google",
        providerId: profile.sub,
        profileImageUrl: profile.picture || "",
        ipAddress: ip,
        userAgent: ua,
      });
      await storage.verifyPublicUserEmail(user.email);
      user = await storage.getPublicUserByEmail(profile.email) || user;
    }

    await storage.updatePublicUserLastLogin(user.id, ip);
    const sessionToken = generatePublicToken({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    });
    await storage.createSecurityLog({
      event: "Public Google Login",
      severity: "info",
      ip,
      userAgent: ua,
      details: `Google login: ${user.username}`,
    });

    return res.json({
      success: true,
      token: sessionToken,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        isEmailVerified: true,
        profileImageUrl: user.profileImageUrl,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: "Invalid Google sign-in request." });
    }
    console.error("[AUTH] Google login error:", err);
    return res.status(502).json({ success: false, message: "Could not verify your Google account right now." });
  }
});
