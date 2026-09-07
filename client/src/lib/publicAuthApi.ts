const BASE = "/api/auth";

async function req<T = any>(method: string, path: string, body?: object, token?: string | null): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => ({ success: false, message: "Invalid response" }));
  return json;
}

const getToken = () => localStorage.getItem("public_auth_token");

export const publicAuthApi = {
  register: (data: { name: string; username: string; email: string; password: string }) =>
    req("POST", "/register", data),

  login: (email: string, password: string, rememberMe = false) =>
    req("POST", "/login", { email, password, rememberMe }),

  logout: () => req("POST", "/logout", undefined, getToken()),

  me: (token?: string) =>
    req("GET", "/me", undefined, token || getToken()),

  sendOtp: (email: string, type: "verify_email" | "reset_password" | "login") =>
    req("POST", "/send-otp", { email, type }),

  verifyOtp: (email: string, code: string, type: "verify_email" | "reset_password" | "login") =>
    req("POST", "/verify-otp", { email, code, type }),

  forgotPassword: (email: string) =>
    req("POST", "/forgot-password", { email }),

  resetPassword: (email: string, code: string, newPassword: string) =>
    req("POST", "/reset-password", { email, code, newPassword }),

  socialLogin: (provider: "google" | "facebook" | "apple", token: string) =>
    req("POST", `/social/${provider}`, { token }),
};
