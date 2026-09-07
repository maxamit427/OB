/**
 * Email Configuration Template
 *
 * This file is a portable fallback template for email credentials.
 * The server ALWAYS reads from environment variables first.
 *
 * PORTABLE SETUP INSTRUCTIONS:
 * ─────────────────────────────
 *
 * Option 1 — Replit (recommended):
 *   Add secrets in Replit Secrets tab:
 *     GMAIL_USER         = your-gmail@gmail.com
 *     GMAIL_APP_PASSWORD = your-16-char-app-password
 *
 * Option 2 — cPanel / VPS / GitHub:
 *   Create a .env file in the project root:
 *     GMAIL_USER=your-gmail@gmail.com
 *     GMAIL_APP_PASSWORD=your-16-char-app-password
 *
 * How to get a Gmail App Password:
 *   1. Go to https://myaccount.google.com/apppasswords
 *   2. Select "Mail" and your device
 *   3. Copy the 16-character password (no spaces)
 *   4. Set it as GMAIL_APP_PASSWORD
 *
 * SMTP Settings (auto-configured by the server):
 *   Host:   smtp.gmail.com
 *   Port:   465
 *   Secure: true (SSL)
 *
 * ─────────────────────────────
 * DO NOT hardcode real credentials in this file.
 * It is checked into version control as a template only.
 */

module.exports = {
  GMAIL_USER: process.env.GMAIL_USER || "",
  GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD || "",
  YAHOO_EMAIL_PASSWORD: process.env.YAHOO_EMAIL_PASSWORD || "",

  isConfigured() {
    return !!(this.GMAIL_USER && this.GMAIL_APP_PASSWORD) || !!this.YAHOO_EMAIL_PASSWORD;
  },

  getStatus() {
    if (this.GMAIL_USER && this.GMAIL_APP_PASSWORD) {
      return { provider: "Gmail", sender: this.GMAIL_USER, configured: true };
    }
    if (this.YAHOO_EMAIL_PASSWORD) {
      return { provider: "Yahoo", sender: "olderbrotherofficial@yahoo.com", configured: true };
    }
    return { provider: null, sender: null, configured: false };
  },
};
