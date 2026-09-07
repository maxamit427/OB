import { Router, type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import { z } from "zod";
import nodemailer from "nodemailer";
import { broadcast } from "./adminWS";

export const marketplaceRouter = Router();

// ─── JWT SECRET ───────────────────────────────────────────────────────────────
// SECURITY: Set JWT_SECRET in Replit Secrets (never hardcode it here).
// For cPanel/custom hosting: add it to your server's environment or .env file.
const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error("[FATAL] JWT_SECRET is not set. Configure it in Replit Secrets before deploying.");
      process.exit(1);
    }
    return "dev-only-insecure-fallback-do-not-use-in-production";
  }
  return secret;
})();

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────

interface AuthRequest extends Request {
  publicUser?: { id: string; email: string; name: string; username: string };
}

function requirePublicAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "").trim();
  if (!token) return res.status(401).json({ success: false, message: "Authentication required" });
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    req.publicUser = { id: payload.id, email: payload.email, name: payload.name, username: payload.username };
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired session" });
  }
}

// ─── EMAIL HELPERS ─────────────────────────────────────────────────────────────
// SECURITY: Credentials are read ONLY from environment variables — never hardcoded.
// Set the following in Replit Secrets (or your .env for cPanel/custom hosting):
//
//   GMAIL_USER          → your Gmail address
//   GMAIL_APP_PASSWORD  → 16-char Gmail App Password (not your login password)
//                         Generate at: https://myaccount.google.com/apppasswords
//
// If neither Gmail nor Yahoo credentials are set, new orders are logged to the
// server console but no email is sent. The order is still saved to the database.

function createEmailTransporter() {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (gmailUser && gmailPass) {
    // Explicit Gmail SMTP — more reliable than service:"gmail" in cloud environments
    return nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: gmailUser, pass: gmailPass },
    });
  }
  const yahooPass = process.env.YAHOO_EMAIL_PASSWORD;
  if (yahooPass) {
    return nodemailer.createTransport({
      host: "smtp.mail.yahoo.com", port: 465, secure: true,
      auth: { user: "olderbrotherofficial@yahoo.com", pass: yahooPass },
    });
  }
  console.warn("[EMAIL] No email credentials configured. Order notification emails will not be sent. Set GMAIL_USER and GMAIL_APP_PASSWORD in Replit Secrets.");
  return null;
}

function getSenderEmail(): string {
  return process.env.GMAIL_USER || "olderbrotherofficial@yahoo.com";
}

// ADMIN_EMAIL — where order & contact notifications are delivered.
// Falls back to the sender Gmail so you still get the emails if not set.
function getAdminEmail(): string {
  return process.env.ADMIN_EMAIL || getSenderEmail();
}

// ─── ORDER EMAIL NOTIFICATION ─────────────────────────────────────────────────

async function sendOrderEmail(order: any, service: any) {
  const transporter = createEmailTransporter();
  if (!transporter) {
    console.log(`📦 NEW ORDER [${order.id}]: ${order.serviceTitle} | User: ${order.userEmail} | TxID: ${order.transactionId} | Amount: $${order.totalPrice}`);
    return;
  }
  const from  = getSenderEmail();
  const admin = getAdminEmail();
  try {
    await transporter.sendMail({
      from:    `"Older Brother Marketplace" <${from}>`,
      to:      admin,
      subject: `🛒 New Order: ${order.serviceTitle} — $${order.totalPrice}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#0a0a1a;color:#e0e0f0;padding:32px;border-radius:12px;border:1px solid #1a1a3a">
          <h2 style="color:#06b6d4;margin-bottom:24px">🛒 New Marketplace Order</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px;color:#888;width:140px">Order ID</td><td style="padding:8px;color:#e0e0f0;font-family:monospace">${order.id}</td></tr>
            <tr style="background:#ffffff08"><td style="padding:8px;color:#888">Service</td><td style="padding:8px;color:#e0e0f0">${order.serviceTitle}</td></tr>
            <tr><td style="padding:8px;color:#888">Category</td><td style="padding:8px;color:#e0e0f0">${service?.category ?? "N/A"}</td></tr>
            <tr style="background:#ffffff08"><td style="padding:8px;color:#888">User Name</td><td style="padding:8px;color:#e0e0f0">${order.userName}</td></tr>
            <tr><td style="padding:8px;color:#888">User Email</td><td style="padding:8px;color:#e0e0f0">${order.userEmail}</td></tr>
            <tr style="background:#ffffff08"><td style="padding:8px;color:#888">Quantity</td><td style="padding:8px;color:#e0e0f0">${order.quantity.toLocaleString()}</td></tr>
            <tr><td style="padding:8px;color:#888">Target Link</td><td style="padding:8px;color:#e0e0f0">${order.link}</td></tr>
            <tr style="background:#ffffff08"><td style="padding:8px;color:#888">Payment Method</td><td style="padding:8px;color:#e0e0f0">${order.paymentMethod.toUpperCase()}</td></tr>
            <tr><td style="padding:8px;color:#888">Transaction ID</td><td style="padding:8px;color:#06b6d4;font-family:monospace;font-weight:bold">${order.transactionId || "Not submitted yet"}</td></tr>
            <tr style="background:#ffffff08"><td style="padding:8px;color:#888">Total Amount</td><td style="padding:8px;color:#06b6d4;font-weight:bold;font-size:18px">$${order.totalPrice}</td></tr>
            <tr><td style="padding:8px;color:#888">Notes</td><td style="padding:8px;color:#e0e0f0">${order.notes || "—"}</td></tr>
          </table>
          <p style="margin-top:24px;color:#666;font-size:12px">Login to admin panel to approve payment and process this order.</p>
        </div>
      `,
    });
  } catch (e) {
    console.error("Failed to send order email:", e);
  }
}

// ─── PUBLIC ROUTES ────────────────────────────────────────────────────────────

marketplaceRouter.get("/services", async (_req, res) => {
  try {
    const all = await storage.getServices();
    res.json({ success: true, data: all.filter(s => s.isActive) });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

marketplaceRouter.get("/services/:id", async (req, res) => {
  try {
    const service = await storage.getService(req.params.id);
    if (!service || !service.isActive) return res.status(404).json({ success: false, message: "Service not found" });
    res.json({ success: true, data: service });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ─── AUTHENTICATED ROUTES ─────────────────────────────────────────────────────

const createOrderSchema = z.object({
  serviceId:     z.string().uuid(),
  quantity:      z.number().int().positive(),
  link:          z.string().url("Invalid target URL"),
  notes:         z.string().max(1000).optional().default(""),
  paymentMethod: z.enum(["bkash", "nagad", "rocket"]),
  transactionId: z.string().max(200).optional().default(""),
});

marketplaceRouter.post("/orders", requirePublicAuth, async (req: AuthRequest, res) => {
  try {
    const data = createOrderSchema.parse(req.body);
    const user = req.publicUser!;

    // Check if user is banned
    const fullUser = await storage.getPublicUserById(user.id);
    if (!fullUser || fullUser.isBanned) return res.status(403).json({ success: false, message: "Account suspended" });

    const service = await storage.getService(data.serviceId);
    if (!service || !service.isActive) return res.status(404).json({ success: false, message: "Service not found or unavailable" });

    // Validate quantity
    if (data.quantity < service.minQuantity || data.quantity > service.maxQuantity) {
      return res.status(400).json({ success: false, message: `Quantity must be between ${service.minQuantity} and ${service.maxQuantity}` });
    }

    const totalPrice = (parseFloat(service.price) * data.quantity).toFixed(2);

    const order = await storage.createOrder({
      userId:        user.id,
      serviceId:     service.id,
      serviceTitle:  service.title,
      quantity:      data.quantity,
      link:          data.link,
      notes:         data.notes,
      paymentMethod: data.paymentMethod,
      transactionId: data.transactionId,
      paymentStatus: data.transactionId ? "submitted" : "pending",
      orderStatus:   "pending",
      totalPrice,
      userEmail:     fullUser.email,
      userName:      fullUser.name,
      adminNote:     "",
    });

    // Send admin email notification (non-blocking)
    sendOrderEmail(order, service).catch(() => {});

    // Broadcast real-time alert to all connected admins
    broadcast("new_order", {
      id:           order.id,
      serviceTitle: order.serviceTitle,
      totalPrice:   order.totalPrice,
      userEmail:    order.userEmail,
      userName:     order.userName,
      category:     order.category,
    });

    res.status(201).json({ success: true, data: order });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, message: err.errors[0].message });
    res.status(500).json({ success: false, message: "Server error" });
  }
});

marketplaceRouter.get("/orders/me", requirePublicAuth, async (req: AuthRequest, res) => {
  try {
    const orders = await storage.getOrdersByUserId(req.publicUser!.id);
    res.json({ success: true, data: orders });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

marketplaceRouter.get("/orders/:id", requirePublicAuth, async (req: AuthRequest, res) => {
  try {
    const order = await storage.getOrder(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    if (order.userId !== req.publicUser!.id) return res.status(403).json({ success: false, message: "Access denied" });
    res.json({ success: true, data: order });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

marketplaceRouter.put("/orders/:id/transaction", requirePublicAuth, async (req: AuthRequest, res) => {
  try {
    const { transactionId } = z.object({ transactionId: z.string().min(1).max(200) }).parse(req.body);
    const order = await storage.getOrder(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    if (order.userId !== req.publicUser!.id) return res.status(403).json({ success: false, message: "Access denied" });
    if (order.paymentStatus === "approved") return res.status(400).json({ success: false, message: "Payment already approved" });
    const updated = await storage.updateOrder(order.id, { transactionId, paymentStatus: "submitted" });
    // Notify admin
    const service = await storage.getService(order.serviceId);
    sendOrderEmail(updated, service).catch(() => {});
    res.json({ success: true, data: updated });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ success: false, message: err.errors[0].message });
    res.status(500).json({ success: false, message: "Server error" });
  }
});
