import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// ─── JWT SECRET ───────────────────────────────────────────────────────────────
// SECURITY: This secret must NEVER be hardcoded here.
// Set it in Replit Secrets (or your .env for local/cPanel hosting):
//   Key:   JWT_SECRET
//   Value: a long random string, e.g. openssl rand -hex 64
//
// Without this secret set, admin tokens will use a weak fallback in development
// and the server will refuse to start in production.

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error("[FATAL] JWT_SECRET environment variable is not set. Set it in Replit Secrets before deploying.");
      process.exit(1);
    }
    console.warn("[WARN] JWT_SECRET is not set. Using insecure fallback for development only. Set it in Replit Secrets.");
    return "dev-only-insecure-fallback-do-not-use-in-production";
  }
  return secret;
}

export const JWT_SECRET = getJwtSecret();

export interface AdminTokenPayload {
  id: string;
  username: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      admin?: AdminTokenPayload;
    }
  }
}

export function generateToken(payload: AdminTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
}

export function verifyToken(token: string): AdminTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AdminTokenPayload;
  } catch {
    return null;
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }

  req.admin = payload;
  next();
}
