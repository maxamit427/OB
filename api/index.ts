import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import express, { type Request, type Response } from "express";
import { app, prepareApp } from "../server/app";

let ready: Promise<void> | null = null;

function prepareVercelApp() {
  if (!ready) {
    ready = (async () => {
      await prepareApp();

      const distPath = path.resolve(process.cwd(), "dist/public");
      const indexPath = path.join(distPath, "index.html");
      if (!fs.existsSync(indexPath)) {
        throw new Error("Frontend build not found. Run npm run build before deploying.");
      }

      app.use(express.static(distPath));
      app.use("*", (_req, res) => {
        res.sendFile(indexPath);
      });
    })();
  }
  return ready;
}

export default async function handler(req: Request, res: Response) {
  await prepareVercelApp();
  return app(req, res);
}