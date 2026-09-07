import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import nodemailer from "nodemailer";
import { adminRouter } from "./admin-routes";
import { setupAdminWS } from "./adminWS";
import { authRouter } from "./auth-routes";
import { marketplaceRouter } from "./marketplace-routes";
import { seedIfEmpty } from "./seed";

const contactFormSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName:  z.string().min(1, "Last name is required").max(100),
  email:     z.string().email("Invalid email address").max(200),
  message:   z.string().min(10, "Message must be at least 10 characters").max(5000),
});

// Escape HTML entities to prevent injection in email body
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\n/g, "<br>");
}

// ─── EMAIL TRANSPORTER ────────────────────────────────────────────────────────
// SECURITY: Email credentials are read ONLY from environment variables.
// Never hardcode passwords here. Set the following in Replit Secrets:
//
//   GMAIL_USER          → your Gmail address (e.g. you@gmail.com)
//   GMAIL_APP_PASSWORD  → 16-char Gmail App Password (not your login password)
//                         Generate at: https://myaccount.google.com/apppasswords
//
// For Yahoo fallback, set YAHOO_EMAIL_PASSWORD in Replit Secrets.
// For cPanel/custom hosting: add these to your server .env file instead.
//
// If neither is set, contact form messages are saved to the database but
// no email is sent — the form still works for visitors.
const createEmailTransporter = () => {
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
      host: "smtp.mail.yahoo.com",
      port: 465,
      secure: true,
      auth: { user: "olderbrotherofficial@yahoo.com", pass: yahooPass },
    });
  }
  console.warn("[EMAIL] No email credentials set. Contact form emails will not be sent. Set GMAIL_USER and GMAIL_APP_PASSWORD in Replit Secrets.");
  return null;
};

// Public settings keys that are safe to expose to the frontend
const PUBLIC_SETTINGS_KEYS = [
  // Brand & Identity
  "site_title", "site_description", "logo_url", "nav_brand_name",
  // Hero
  "hero_badge_text", "hero_headline", "hero_subheadline",
  "hero_security_notice", "hero_cta_primary", "hero_cta_secondary", "hero_logo_link",
  // About
  "about_title", "about_description",
  // Services
  "services_title", "services_subtitle", "services_description",
  // Team
  "team_title", "team_description",
  // Portfolio
  "portfolio_title", "portfolio_description",
  // Contact
  "contact_label", "contact_title", "contact_description",
  "contact_email", "contact_location", "contact_facebook_url", "contact_facebook_cta",
  // Footer
  "footer_copyright", "footer_credit",
  // Social
  "twitter_url", "instagram_url", "telegram_url",
  // Marketplace / Payment
  "marketplace_enabled", "marketplace_badge", "marketplace_title", "marketplace_subtitle",
  "bkash_number", "nagad_number", "rocket_number",
];

export async function registerRoutes(app: Express): Promise<Server> {
  app.use("/api/admin", adminRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/marketplace", marketplaceRouter);

  // ─── PUBLIC API ROUTES ───────────────────────────────────────────────────
  // Only approved, safe, public-facing content.

  app.get("/api/public/team", async (_req, res) => {
    try {
      const members = await storage.getTeamMembers();
      const publicMembers = members
        .filter(m => m.isActive)
        .map(m => ({
          id:          m.id,
          name:        m.name,
          position:    m.position,
          bio:         m.bio,
          imageUrl:    m.imageUrl,
          facebookUrl: m.facebookUrl,
          twitterUrl:  m.twitterUrl,
          linkedinUrl: m.linkedinUrl,
          githubUrl:   m.githubUrl,
          order:       m.order,
        }));
      res.json({ success: true, data: publicMembers });
    } catch {
      res.status(500).json({ success: false, message: "Server error" });
    }
  });

  app.get("/api/public/portfolio", async (_req, res) => {
    try {
      const items = await storage.getPortfolioItems();
      // Strip any internal-only fields if added in the future
      res.json({ success: true, data: items });
    } catch {
      res.status(500).json({ success: false, message: "Server error" });
    }
  });

  app.get("/api/public/categories", async (_req, res) => {
    try {
      const cats = await storage.getCategories();
      res.json({ success: true, data: cats.filter(c => c.isVisible) });
    } catch {
      res.status(500).json({ success: false, message: "Server error" });
    }
  });

  app.get("/api/public/settings", async (_req, res) => {
    try {
      const settings = await storage.getSettings();
      const obj: Record<string, string> = {};
      for (const s of settings) {
        if (PUBLIC_SETTINGS_KEYS.includes(s.key)) obj[s.key] = s.value;
      }
      res.json({ success: true, data: obj });
    } catch {
      res.status(500).json({ success: false, message: "Server error" });
    }
  });

  // ─── CONTACT FORM ────────────────────────────────────────────────────────

  app.post("/api/contact", async (req, res) => {
    try {
      const data = contactFormSchema.parse(req.body);

      // Store in DB (no PII console logging in production)
      await storage.createMessage({
        firstName: data.firstName,
        lastName:  data.lastName,
        email:     data.email,
        message:   data.message,
        isRead:    false,
        createdAt: new Date().toISOString(),
      });

      // Send email (failure is non-fatal — message is already saved)
      const transporter = createEmailTransporter();
      if (transporter) {
        try {
          const senderEmail = process.env.GMAIL_USER || "olderbrotherofficial@yahoo.com";
          const adminEmail  = process.env.ADMIN_EMAIL || senderEmail;
          await transporter.sendMail({
            from:    `"Older Brother Website" <${senderEmail}>`,
            to:      adminEmail,
            subject: `New Contact Form Message from ${data.firstName} ${data.lastName}`,
            text:    `Name: ${data.firstName} ${data.lastName}\nEmail: ${data.email}\n\nMessage:\n${data.message}`,
            // HTML-escaped to prevent injection attacks via message content
            html: `
              <h2>New Contact Form Submission</h2>
              <p><strong>Name:</strong> ${escapeHtml(data.firstName)} ${escapeHtml(data.lastName)}</p>
              <p><strong>Email:</strong> ${escapeHtml(data.email)}</p>
              <h3>Message:</h3>
              <p>${escapeHtml(data.message)}</p>
            `,
          });
        } catch (emailError) {
          console.error("✗ Failed to send contact email:", emailError);
        }
      }

      res.status(200).json({ success: true, message: "Thank you for your message! We will get back to you soon." });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, message: error.errors[0].message });
      }
      res.status(500).json({ success: false, message: "An error occurred while processing your message." });
    }
  });

  // ─── PUBLIC TEST EMAIL ───────────────────────────────────────────────────
  // Accessible without auth — returns config status only (no actual email sent
  // without credentials). Full send test available at /api/admin/test-email.
  app.get("/api/test-email", (_req, res) => {
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;
    const yahooPass = process.env.YAHOO_EMAIL_PASSWORD;

    if (gmailUser && gmailPass) {
      return res.json({
        success: true,
        configured: true,
        provider: "Gmail",
        sender: gmailUser,
        message: "Email credentials configured (Gmail SMTP). Use POST /api/admin/test-email to send a test.",
      });
    }
    if (yahooPass) {
      return res.json({
        success: true,
        configured: true,
        provider: "Yahoo",
        sender: "olderbrotherofficial@yahoo.com",
        message: "Email credentials configured (Yahoo SMTP). Use POST /api/admin/test-email to send a test.",
      });
    }
    return res.status(200).json({
      success: false,
      configured: false,
      provider: null,
      message: "Email credentials not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in your .env or environment secrets.",
    });
  });

  // Seed default categories into the DB if it's empty (first run)
  seedIfEmpty().catch(err => console.warn("[seed] Error:", err));

  const httpServer = createServer(app);
  setupAdminWS(httpServer);
  return httpServer;
}
