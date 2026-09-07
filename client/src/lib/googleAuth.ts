type GoogleTokenClient = {
  requestAccessToken: (options?: { prompt?: string }) => void;
};

type GoogleAccounts = {
  oauth2: {
    initTokenClient: (options: {
      client_id: string;
      scope: string;
      callback: (response: { access_token?: string; error?: string }) => void;
      error_callback?: (error: { type?: string; message?: string }) => void;
    }) => GoogleTokenClient;
  };
};

declare global {
  interface Window {
    google?: { accounts: GoogleAccounts };
  }
}

let googleScriptPromise: Promise<void> | null = null;
let googleClientIdPromise: Promise<string> | null = null;

async function getGoogleClientId() {
  const buildTimeClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  if (buildTimeClientId) return buildTimeClientId;
  if (!googleClientIdPromise) {
    googleClientIdPromise = fetch("/api/auth/social/google/config")
      .then(async response => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.clientId) {
          throw new Error(payload.message || "Google sign-in is not configured yet.");
        }
        return payload.clientId as string;
      });
  }
  return googleClientIdPromise;
}

function loadGoogleScript() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (googleScriptPromise) return googleScriptPromise;

  googleScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Google sign-in could not load.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google sign-in could not load."));
    document.head.appendChild(script);
  });

  return googleScriptPromise;
}

export async function requestGoogleAccessToken(): Promise<string> {
  const clientId = await getGoogleClientId();

  await loadGoogleScript();
  if (!window.google?.accounts?.oauth2) {
    throw new Error("Google sign-in is unavailable in this browser.");
  }

  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: "openid email profile",
      callback: response => {
        if (response.access_token) {
          resolve(response.access_token);
        } else {
          reject(new Error(response.error || "Google sign-in was cancelled."));
        }
      },
      error_callback: error => reject(new Error(error.message || "Google sign-in was cancelled.")),
    });

    client.requestAccessToken({ prompt: "select_account" });
  });
}