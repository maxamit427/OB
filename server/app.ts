import { type Server } from "node:http";

import express, { type Express, type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

export const app = express();
let appSetup: Promise<Server> | null = null;

export function prepareApp() {
  if (!appSetup) appSetup = registerRoutes(app);
  return appSetup;
}

// ─── SECURITY HEADERS ────────────────────────────────────────────────────────
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

// ─── BODY PARSING ─────────────────────────────────────────────────────────────
// 10MB limit to support base64-encoded images uploaded from the admin panel.
// Without this, images > 100KB silently fail with a 413 error.
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));

// ─── REQUEST LOGGER ──────────────────────────────────────────────────────────
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, unknown> | undefined = undefined;

  const originalResJson = res.json.bind(res);
  res.json = function (bodyJson: unknown) {
    capturedJsonResponse = bodyJson as Record<string, unknown>;
    return originalResJson(bodyJson);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) logLine = logLine.slice(0, 79) + "…";
      log(logLine);
    }
  });

  next();
});

export default async function runApp(
  setup: (app: Express, server: Server) => Promise<void>,
) {
  const server = await prepareApp();

  // ─── GLOBAL ERROR HANDLER ─────────────────────────────────────────────────
  // Does NOT re-throw — re-throwing after res.json() causes unhandled
  // exception warnings and can crash the process on some Node versions.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const status =
      typeof err === "object" && err !== null && "status" in err
        ? (err as { status: number }).status
        : 500;
    const message =
      typeof err === "object" && err !== null && "message" in err
        ? (err as { message: string }).message
        : "Internal Server Error";

    if (!res.headersSent) {
      res.status(status).json({ success: false, message });
    }

    if (process.env.NODE_ENV !== "production") {
      console.error("[ERROR]", err);
    }
  });

  await setup(app, server);

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
    log(`serving on port ${port}`);
  });
}
