const BASE = "/api/admin";

function getToken() {
  return localStorage.getItem("admin_token");
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data: any;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  }
  if (!res.ok) throw new Error(data?.message || `Request failed: ${res.status}`);
  return data;
}

export const adminApi = {
  // Auth
  login:  (username: string, password: string) =>
    request<{ success: boolean; token: string; user: { id: string; username: string; role: string; fullName: string; email: string } }>("POST", "/login", { username, password }),
  forgotPassword: (email: string) =>
    request<{ success: boolean; message: string }>("POST", "/forgot-password", { email }),
  resetPassword: (email: string, code: string, newPassword: string) =>
    request<{ success: boolean; message: string }>("POST", "/reset-password", { email, code, newPassword }),
  logout: () => request("POST", "/logout"),
  me:     () => request<{ success: boolean; user: { id: string; username: string; role: string } }>("GET", "/me"),

  // Signup (public — no auth token required)
  signup: (data: { fullName: string; username: string; email: string; password: string; requestedRole: "admin" | "super_admin" }) =>
    request<{ success: boolean; message: string }>("POST", "/signup", data),

  // Pending users (Super Admin only)
  getPendingUsers:    () => request<{ success: boolean; data: any[] }>("GET", "/pending-users"),
  approvePendingUser: (id: string, role: string) =>
    request<{ success: boolean; data: any }>("POST", `/pending-users/${id}/approve`, { role }),
  rejectPendingUser:  (id: string, reason?: string) =>
    request<{ success: boolean; data: any }>("POST", `/pending-users/${id}/reject`, { reason }),

  // Activity logs (Super Admin only)
  getActivityLogs: (limit = 100) =>
    request<{ success: boolean; data: any[] }>("GET", `/activity-logs?limit=${limit}`),

  // Stats
  getStats: () =>
    request<{ success: boolean; data: { messages: number; unreadMessages: number; portfolioItems: number; teamMembers: number; securityAlerts: number; categories: number; pendingSignups: number } }>("GET", "/stats"),

  // Messages
  getMessages:   () => request<{ success: boolean; data: any[] }>("GET", "/messages"),
  getMessage:    (id: string) => request<{ success: boolean; data: any }>("GET", `/messages/${id}`),
  markRead:      (id: string, isRead: boolean) => request("PATCH", `/messages/${id}/read`, { isRead }),
  deleteMessage: (id: string) => request("DELETE", `/messages/${id}`),

  // Portfolio
  getPortfolio:        () => request<{ success: boolean; data: any[] }>("GET", "/portfolio"),
  createPortfolioItem: (data: any) => request<{ success: boolean; data: any }>("POST", "/portfolio", data),
  updatePortfolioItem: (id: string, data: any) => request<{ success: boolean; data: any }>("PUT", `/portfolio/${id}`, data),
  deletePortfolioItem: (id: string) => request("DELETE", `/portfolio/${id}`),

  // Team
  getTeam:          () => request<{ success: boolean; data: any[] }>("GET", "/team"),
  createTeamMember: (data: any) => request<{ success: boolean; data: any }>("POST", "/team", data),
  updateTeamMember: (id: string, data: any) => request<{ success: boolean; data: any }>("PUT", `/team/${id}`, data),
  deleteTeamMember: (id: string) => request("DELETE", `/team/${id}`),

  // Categories
  getCategories:  () => request<{ success: boolean; data: any[] }>("GET", "/categories"),
  createCategory: (data: any) => request<{ success: boolean; data: any }>("POST", "/categories", data),
  updateCategory: (id: string, data: any) => request<{ success: boolean; data: any }>("PUT", `/categories/${id}`, data),
  deleteCategory: (id: string) => request("DELETE", `/categories/${id}`),

  // Security
  getSecurityLogs: (limit = 50) =>
    request<{ success: boolean; data: any[] }>("GET", `/security/logs?limit=${limit}`),

  // Settings
  getSettings:    () => request<{ success: boolean; data: Record<string, string> }>("GET", "/settings"),
  updateSettings: (data: Record<string, string>) =>
    request<{ success: boolean; data: Record<string, string> }>("PUT", "/settings", data),

  // Users & Role Management
  getUsers:       () => request<{ success: boolean; data: any[] }>("GET", "/users"),
  createUser:     (data: { username: string; password: string; role: string }) =>
    request<{ success: boolean; data: any }>("POST", "/users", data),
  updateUserRole: (id: string, role: string) =>
    request<{ success: boolean; data: any }>("PUT", `/users/${id}/role`, { role }),
  deleteUser:     (id: string) => request("DELETE", `/users/${id}`),
  changePassword: (currentPassword: string, newPassword: string) =>
    request("PUT", "/users/password", { currentPassword, newPassword }),

  // Public Users (admin management)
  getPublicUsers:    () =>
    request<{ success: boolean; data: any[] }>("GET", "/public-users"),
  banPublicUser:     (id: string, reason: string) =>
    request<{ success: boolean; data: any }>("POST", `/public-users/${id}/ban`, { reason }),
  unbanPublicUser:   (id: string) =>
    request<{ success: boolean; data: any }>("POST", `/public-users/${id}/unban`),
  deletePublicUser:  (id: string) =>
    request("DELETE", `/public-users/${id}`),
  verifyPublicUser:  (id: string) =>
    request<{ success: boolean; data: any }>("POST", `/public-users/${id}/verify`),

  // Marketplace Services (admin CRUD)
  getServices:    () =>
    request<{ success: boolean; data: any[] }>("GET", "/services"),
  createService:  (data: any) =>
    request<{ success: boolean; data: any }>("POST", "/services", data),
  updateService:  (id: string, data: any) =>
    request<{ success: boolean; data: any }>("PUT", `/services/${id}`, data),
  deleteService:  (id: string) =>
    request("DELETE", `/services/${id}`),

  // Orders (admin management)
  getOrders:    () =>
    request<{ success: boolean; data: any[] }>("GET", "/orders"),
  updateOrder:  (id: string, data: any) =>
    request<{ success: boolean; data: any }>("PUT", `/orders/${id}`, data),

  // Email test
  testEmail: (to?: string) =>
    request<{ success: boolean; message: string }>("POST", "/test-email", to ? { to } : {}),

  // OTP Logs
  getOtpLogs: (limit = 100) =>
    request<{ success: boolean; data: any[] }>("GET", `/otp-logs?limit=${limit}`),
};
