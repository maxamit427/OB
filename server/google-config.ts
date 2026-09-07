import fs from "node:fs";
import path from "node:path";

type GoogleConfigFile = { clientId?: unknown };

export function getGoogleClientId(): string | undefined {
  const fromEnvironment = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
  if (fromEnvironment?.trim()) return fromEnvironment.trim();

  const configPath = path.resolve(process.cwd(), "config/google/client-id.json");
  try {
    const file = JSON.parse(fs.readFileSync(configPath, "utf8")) as GoogleConfigFile;
    return typeof file.clientId === "string" && file.clientId.trim()
      ? file.clientId.trim()
      : undefined;
  } catch {
    return undefined;
  }
}