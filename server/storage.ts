import {
  type Message, type InsertMessage,
  type PortfolioItem, type InsertPortfolioItem,
  type TeamMember, type InsertTeamMember,
  type SecurityLog,
  type SiteSetting,
  type Category, type InsertCategory,
  type Service,
  type Order,
} from "@shared/schema";

import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

import {
  AdminUserModel, PendingUserModel, ActivityLogModel, MessageModel,
  PortfolioItemModel, TeamMemberModel, SecurityLogModel, SiteSettingModel,
  CategoryModel, PublicUserModel, OtpCodeModel, ServiceModel, OrderModel,
} from "./mongo-models";

import { connectDB } from "./db";

export type UserRole     = "super_admin" | "admin" | "moderator" | "editor";
export type PendingStatus = "pending" | "approved" | "rejected";

export interface AdminUser {
  id: string; username: string; password: string; role: UserRole;
  email: string; fullName: string; createdAt: string;
  lastLogin?: string; lastSeen?: string;
}

export interface PendingUser {
  id: string; fullName: string; username: string; email: string;
  password: string; requestedRole: "admin" | "super_admin";
  status: PendingStatus; ip: string; userAgent: string; createdAt: string;
  reviewedAt?: string; reviewedBy?: string; rejectReason?: string;
}

export interface ActivityLog {
  id: string; userId: string; username: string;
  event: "login" | "logout" | "signup_request" | "signup_approved" | "signup_rejected" | "password_change" | "page_view";
  ip: string; userAgent: string; device: string; browser: string;
  details: string; createdAt: string;
}

export type InsertSecurityLog = {
  event: string; severity?: string; ip?: string; userAgent?: string; details?: string;
};

const MAX_SECURITY_LOGS = 500;
const MAX_ACTIVITY_LOGS = 1000;

function parseBrowser(ua: string): string {
  if (!ua || ua === "System") return "System";
  if (/Edg\//i.test(ua))       return "Edge";
  if (/OPR\//i.test(ua))       return "Opera";
  if (/Chrome\//i.test(ua))    return "Chrome";
  if (/Firefox\//i.test(ua))   return "Firefox";
  if (/Safari\//i.test(ua))    return "Safari";
  if (/MSIE|Trident/i.test(ua))return "IE";
  return "Unknown";
}

function parseDevice(ua: string): string {
  if (!ua || ua === "System")            return "Server";
  if (/Mobile|Android|iPhone/i.test(ua)) return "Mobile";
  if (/iPad|Tablet/i.test(ua))           return "Tablet";
  return "Desktop";
}

export interface PublicUser {
  id: string; name: string; username: string; email: string;
  passwordHash: string | null; phone?: string; role: string;
  isEmailVerified: boolean; isBanned: boolean; banReason?: string;
  profileImageUrl?: string; provider: string; providerId?: string;
  createdAt: string; lastLoginAt?: string; lastSeenAt?: string;
  ipAddress?: string; userAgent?: string;
}

export interface OtpCode {
  id: string; email: string; code: string; type: string;
  expiresAt: string; usedAt?: string; attempts: number; createdAt: string;
}

export interface IStorage {
  getAdminUser(id: string): Promise<AdminUser | undefined>;
  getAdminUserByUsername(username: string): Promise<AdminUser | undefined>;
  getAdminUserByEmail(email: string): Promise<AdminUser | undefined>;
  getAdminUserByUsernameOrEmail(identifier: string): Promise<AdminUser | undefined>;
  getAllAdminUsers(): Promise<AdminUser[]>;
  createAdminUser(username: string, hashedPassword: string, role: UserRole, fullName?: string, email?: string): Promise<AdminUser>;
  updateAdminUserRole(id: string, role: UserRole): Promise<AdminUser | undefined>;
  updateAdminUserPassword(id: string, hashedPassword: string): Promise<AdminUser | undefined>;
  updateAdminUserLastSeen(id: string): Promise<void>;
  deleteAdminUser(id: string): Promise<boolean>;

  getPendingUsers(): Promise<PendingUser[]>;
  getPendingUser(id: string): Promise<PendingUser | undefined>;
  createPendingUser(data: Omit<PendingUser, "id" | "status" | "createdAt">): Promise<PendingUser>;
  approvePendingUser(id: string, role: UserRole, reviewedBy: string): Promise<PendingUser | undefined>;
  rejectPendingUser(id: string, reviewedBy: string, reason?: string): Promise<PendingUser | undefined>;

  getActivityLogs(limit?: number): Promise<ActivityLog[]>;
  createActivityLog(data: Omit<ActivityLog, "id" | "createdAt" | "device" | "browser">): Promise<ActivityLog>;

  getMessages(): Promise<Message[]>;
  getMessage(id: string): Promise<Message | undefined>;
  createMessage(msg: InsertMessage): Promise<Message>;
  updateMessageRead(id: string, isRead: boolean): Promise<Message | undefined>;
  deleteMessage(id: string): Promise<boolean>;

  getPortfolioItems(): Promise<PortfolioItem[]>;
  getPortfolioItem(id: string): Promise<PortfolioItem | undefined>;
  createPortfolioItem(item: InsertPortfolioItem): Promise<PortfolioItem>;
  updatePortfolioItem(id: string, item: Partial<InsertPortfolioItem>): Promise<PortfolioItem | undefined>;
  deletePortfolioItem(id: string): Promise<boolean>;

  getTeamMembers(): Promise<TeamMember[]>;
  getTeamMember(id: string): Promise<TeamMember | undefined>;
  createTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  updateTeamMember(id: string, member: Partial<InsertTeamMember>): Promise<TeamMember | undefined>;
  deleteTeamMember(id: string): Promise<boolean>;

  getSecurityLogs(limit?: number): Promise<SecurityLog[]>;
  createSecurityLog(log: InsertSecurityLog): Promise<SecurityLog>;

  getSettings(): Promise<SiteSetting[]>;
  getSetting(key: string): Promise<SiteSetting | undefined>;
  setSetting(key: string, value: string): Promise<SiteSetting>;

  getCategories(): Promise<Category[]>;
  getCategory(id: string): Promise<Category | undefined>;
  createCategory(cat: InsertCategory): Promise<Category>;
  updateCategory(id: string, cat: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: string): Promise<boolean>;

  getPublicUserById(id: string): Promise<PublicUser | undefined>;
  getPublicUserByEmail(email: string): Promise<PublicUser | undefined>;
  getPublicUserByUsername(username: string): Promise<PublicUser | undefined>;
  getAllPublicUsers(): Promise<PublicUser[]>;
  createPublicUser(data: Omit<PublicUser, "id" | "createdAt" | "isEmailVerified" | "isBanned" | "role">): Promise<PublicUser>;
  updatePublicUserLastLogin(id: string, ip?: string): Promise<void>;
  updatePublicUserLastSeen(id: string): Promise<void>;
  verifyPublicUserEmail(email: string): Promise<void>;
  updatePublicUserPassword(email: string, hashedPassword: string): Promise<void>;
  banPublicUser(id: string, reason: string): Promise<PublicUser | undefined>;
  unbanPublicUser(id: string): Promise<PublicUser | undefined>;
  deletePublicUser(id: string): Promise<boolean>;
  verifyPublicUserById(id: string): Promise<PublicUser | undefined>;

  createOtpCode(data: { email: string; code: string; type: string }): Promise<OtpCode>;
  getValidOtpCode(email: string, type: string): Promise<OtpCode | undefined>;
  getOtpLogs(limit?: number): Promise<OtpCode[]>;
  markOtpUsed(id: string): Promise<void>;
  incrementOtpAttempts(id: string): Promise<void>;

  getServices(): Promise<Service[]>;
  getService(id: string): Promise<Service | undefined>;
  createService(data: Omit<Service, "id" | "createdAt">): Promise<Service>;
  updateService(id: string, data: Partial<Omit<Service, "id" | "createdAt">>): Promise<Service | undefined>;
  deleteService(id: string): Promise<boolean>;

  getOrders(): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  getOrdersByUserId(userId: string): Promise<Order[]>;
  createOrder(data: Omit<Order, "id" | "createdAt" | "updatedAt">): Promise<Order>;
  updateOrder(id: string, data: Partial<Order>): Promise<Order | undefined>;

  getStats(): Promise<{
    messages: number; unreadMessages: number; portfolioItems: number;
    teamMembers: number; securityAlerts: number; categories: number;
    pendingSignups: number; publicUsers: number; services: number;
    orders: number; pendingOrders: number; totalRevenue: number; completedOrders: number;
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// IN-MEMORY STORAGE (fallback when no MONGODB_URI)
// ─────────────────────────────────────────────────────────────────────────────

export class MemStorage implements IStorage {
  private adminUsers:     Map<string, AdminUser>      = new Map();
  private pendingUsers:   Map<string, PendingUser>    = new Map();
  private publicUsers:    Map<string, PublicUser>     = new Map();
  private otpCodes:       Map<string, OtpCode>        = new Map();
  private activityLogs:   Map<string, ActivityLog>    = new Map();
  private messages:       Map<string, Message>        = new Map();
  private portfolioItems: Map<string, PortfolioItem>  = new Map();
  private teamMembers:    Map<string, TeamMember>     = new Map();
  private securityLogs:   Map<string, SecurityLog>    = new Map();
  private settings:       Map<string, SiteSetting>    = new Map();
  private categoriesMap:  Map<string, Category>       = new Map();
  private servicesMap:    Map<string, Service>        = new Map();
  private ordersMap:      Map<string, Order>          = new Map();

  constructor() { this.seed(); }

  private seed() {
    const adminId = randomUUID();
    this.adminUsers.set(adminId, { id: adminId, username: "admin", password: bcrypt.hashSync("admin123", 10), role: "super_admin", email: "olderbrotherofficial@yahoo.com", fullName: "Super Admin", createdAt: new Date().toISOString() });
    const amitId = randomUUID();
    this.adminUsers.set(amitId, { id: amitId, username: "amitmax44", password: bcrypt.hashSync("Amitmax3", 10), role: "super_admin", email: "maxamit279@gmail.com", fullName: "Amit Max", createdAt: new Date().toISOString() });

    const defaults: [string, string][] = [
      ["site_title","Older Brother Team"],["site_description","Web3 Digital Security Platform"],["maintenance_mode","false"],["contact_email","olderbrotherofficial@yahoo.com"],["twitter_url",""],["instagram_url",""],["telegram_url",""],["seo_keywords","Web3, Digital Security, Facebook Support, Copyright Protection"],["logo_url",""],["nav_brand_name","OLDER BROTHER"],["hero_badge_text","Next Gen Digital Guidance"],["hero_headline","Protecting Your Digital Legacy"],["hero_subheadline","We are the OLDER BROTHER Team. Navigating the complexities of Facebook support, copyright protection, and community growth with Web3 precision."],["hero_security_notice",""],["hero_cta_primary","Start Conversation"],["hero_cta_secondary","View Work"],["hero_logo_link","https://www.facebook.com/OlderBrotherofficiall"],["about_title","Our Journey"],["about_description","From humble beginnings to digital guardians. We've evolved alongside the internet to provide cutting-edge protection and support."],["services_title","Premium Digital Services"],["services_subtitle","What We Do"],["services_description","We provide the shield and the sword for your online presence. Expert tools and strategies for the modern web."],["team_title","Meet Our Older Brother Cyber Expert"],["team_description","The minds behind Older Brother. Experts in their fields, united by a common goal."],["portfolio_title","Selected Works"],["portfolio_description","Showcasing our impact across the digital landscape."],["contact_label","Get in Touch"],["contact_title","Ready to secure your digital future?"],["contact_description","Reach out to the Older Brother Team for a consultation. We are ready to assist with your digital needs."],["contact_location","Decentralized & Remote"],["contact_facebook_url","https://www.facebook.com/OlderBrotherofficiall"],["contact_facebook_cta","Visit Our Facebook Page"],["footer_copyright","Older Brother Team. All rights reserved."],["footer_credit","Design & Development by Amit Max"],["bkash_number","01XXXXXXXXX"],["nagad_number","01XXXXXXXXX"],["rocket_number","01XXXXXXXXX"],["marketplace_enabled","true"],["marketplace_title","Digital Services Marketplace"],["marketplace_subtitle","Premium growth and security services"],
    ];
    for (const [key, value] of defaults) this.settings.set(key, { key, value });

    const portfolioData = [
      { title: "Facebook Account Recovery", description: "Recovered 500+ compromised Facebook accounts for enterprise clients using advanced security protocols.", category: "Facebook Support", tags: '["Facebook","Security","Recovery"]', featured: true },
      { title: "NFT Collection Security Audit", description: "Comprehensive security audit for a major NFT collection, preventing potential $2M exploit.", category: "Web3", tags: '["NFT","Blockchain","Audit"]', featured: true },
      { title: "Brand Copyright Shield", description: "Implemented automated copyright monitoring across 15 social platforms for a global brand.", category: "Copyright", tags: '["Copyright","Brand Protection","Automation"]', featured: false },
      { title: "Community Management System", description: "Built and managed 50k+ member Web3 community with zero security incidents over 12 months.", category: "Community", tags: '["Community","Discord","Web3"]', featured: false },
    ];
    for (const [i, p] of portfolioData.entries()) {
      const id = randomUUID();
      this.portfolioItems.set(id, { id, ...p, imageUrl: "", liveUrl: "", order: i, createdAt: new Date().toISOString() });
    }

    const teamData = [
      { name: "Alex Chen", position: "Lead Security Architect", bio: "10+ years in cybersecurity and Web3 infrastructure.", order: 0 },
      { name: "Mia Torres", position: "Web3 Strategy Lead", bio: "DeFi pioneer with expertise in blockchain security protocols.", order: 1 },
      { name: "Jordan Blake", position: "Community Director", bio: "Built and managed 100k+ member crypto communities.", order: 2 },
    ];
    for (const member of teamData) {
      const id = randomUUID();
      this.teamMembers.set(id, { id, ...member, imageUrl: "", facebookUrl: "", twitterUrl: "", linkedinUrl: "", githubUrl: "", isActive: true });
    }

    const sampleEvents = [
      { event: "System Started", severity: "info", details: "Application server initialized successfully" },
      { event: "Admin Login", severity: "info", details: "Successful admin authentication" },
      { event: "Failed Login Attempt", severity: "warning", details: "Invalid credentials attempted" },
    ];
    for (const e of sampleEvents) {
      const id = randomUUID();
      this.securityLogs.set(id, { id, event: e.event, severity: e.severity, ip: "127.0.0.1", userAgent: "System", details: e.details, createdAt: new Date().toISOString() });
    }

    const categoryData = [
      { title: "Facebook", subtitle: "Social Media", description: "Facebook page likes, account recovery, Meta verification and more.", icon: "Facebook", color: "text-blue-400", order: 0 },
      { title: "Instagram", subtitle: "Social Media", description: "Grow your Instagram followers, likes, and engagement with real accounts.", icon: "Instagram", color: "text-pink-400", order: 1 },
      { title: "TikTok", subtitle: "Social Media", description: "Boost TikTok followers and video views to expand your reach.", icon: "Zap", color: "text-cyan-400", order: 2 },
      { title: "Twitter", subtitle: "Social Media", description: "Build your Twitter/X presence with quality followers and engagement.", icon: "Twitter", color: "text-sky-400", order: 3 },
      { title: "Web3", subtitle: "Blockchain", description: "Web3 wallet security, DeFi advisory, and smart contract consultations.", icon: "Globe", color: "text-purple-400", order: 4 },
    ];
    for (const c of categoryData) {
      const id = randomUUID();
      this.categoriesMap.set(id, { id, ...c, imageUrl: "", type: "service", isVisible: true, createdAt: new Date().toISOString() });
    }

    const serviceData: Array<Omit<Service, "id" | "createdAt">> = [
      { title: "Facebook Page Likes", description: "Boost your Facebook page with real, active followers.", longDescription: "Our Facebook Page Likes service delivers genuine-looking followers from quality accounts.", price: "15.00", category: "Facebook", platform: "Facebook", deliveryTime: "1-3 days", features: '["Real-looking accounts","Gradual delivery","No password required","24/7 support","Refill guarantee"]', minQuantity: 100, maxQuantity: 100000, isActive: true, imageUrl: "", order: 0 },
      { title: "Facebook Account Recovery", description: "Professional service to recover disabled or hacked Facebook accounts.", longDescription: "Our team of Facebook experts has recovered thousands of accounts. Success rate over 90%.", price: "49.99", category: "Facebook", platform: "Facebook", deliveryTime: "3-7 days", features: '["90%+ success rate","All account types","Hacked accounts","Disabled accounts","2FA lockout recovery"]', minQuantity: 1, maxQuantity: 1, isActive: true, imageUrl: "", order: 1 },
      { title: "Facebook Meta Verification", description: "Get the official Meta blue checkmark on your Facebook page.", longDescription: "We guide you through the official Meta verification process step by step.", price: "99.99", category: "Facebook", platform: "Facebook", deliveryTime: "7-14 days", features: '["Official process","Documentation support","Revision included","High approval rate"]', minQuantity: 1, maxQuantity: 1, isActive: true, imageUrl: "", order: 2 },
      { title: "Instagram Followers", description: "Grow your Instagram following with high-quality followers.", longDescription: "Real-looking Instagram followers delivered gradually to keep your account safe.", price: "12.00", category: "Instagram", platform: "Instagram", deliveryTime: "1-3 days", features: '["Real-looking profiles","Safe gradual delivery","No password needed","30-day refill"]', minQuantity: 100, maxQuantity: 500000, isActive: true, imageUrl: "", order: 3 },
      { title: "Instagram Post Likes", description: "Increase engagement on your Instagram posts.", longDescription: "Boost your Instagram post engagement with our likes service.", price: "5.00", category: "Instagram", platform: "Instagram", deliveryTime: "0-24 hours", features: '["Instant start","Real-looking accounts","Safe for account","Bulk discounts available"]', minQuantity: 50, maxQuantity: 100000, isActive: true, imageUrl: "", order: 4 },
      { title: "TikTok Followers", description: "Grow your TikTok audience and reach more people.", longDescription: "Quality TikTok followers delivered safely to your account.", price: "10.00", category: "TikTok", platform: "TikTok", deliveryTime: "1-2 days", features: '["Real-looking profiles","Monetization eligible","Safe delivery","24/7 support"]', minQuantity: 100, maxQuantity: 1000000, isActive: true, imageUrl: "", order: 5 },
      { title: "TikTok Video Views", description: "Increase your TikTok video view count and boost discoverability.", longDescription: "Supercharge your TikTok videos with views that help push them into the For You Page.", price: "3.00", category: "TikTok", platform: "TikTok", deliveryTime: "0-12 hours", features: '["Lightning fast delivery","ForYouPage boost","Any public video","Bulk rates available"]', minQuantity: 1000, maxQuantity: 10000000, isActive: true, imageUrl: "", order: 6 },
      { title: "Twitter/X Followers", description: "Build your Twitter/X audience with quality followers.", longDescription: "Grow your Twitter X following fast with our reliable follower service.", price: "8.00", category: "Twitter", platform: "Twitter/X", deliveryTime: "1-3 days", features: '["Quality accounts","Gradual delivery","No password required","Verified-looking profiles"]', minQuantity: 100, maxQuantity: 500000, isActive: true, imageUrl: "", order: 7 },
      { title: "Web3 Wallet Security Audit", description: "Comprehensive security audit for your Web3 wallets.", longDescription: "Our Web3 security experts will audit your wallets and identify vulnerabilities.", price: "199.99", category: "Web3", platform: "Ethereum / BNB / Solana", deliveryTime: "5-10 days", features: '["Wallet vulnerability scan","Smart contract review","Phishing protection","Detailed report","Follow-up consultation"]', minQuantity: 1, maxQuantity: 1, isActive: true, imageUrl: "", order: 8 },
      { title: "Web3 Advisory Consultation", description: "One-on-one consultation with our Web3 and DeFi experts.", longDescription: "Get personalized guidance on navigating the Web3 ecosystem safely.", price: "79.99", category: "Web3", platform: "All Networks", deliveryTime: "1-3 days", features: '["1-hour video session","Personalized roadmap","DeFi protocol guidance","NFT security tips","Recording included"]', minQuantity: 1, maxQuantity: 10, isActive: true, imageUrl: "", order: 9 },
    ];
    for (const s of serviceData) {
      const id = randomUUID();
      this.servicesMap.set(id, { id, ...s, createdAt: new Date().toISOString() });
    }
  }

  async getAdminUser(id: string) { return this.adminUsers.get(id); }
  async getAdminUserByUsername(username: string) { return Array.from(this.adminUsers.values()).find(u => u.username.toLowerCase() === username.toLowerCase().trim()); }
  async getAdminUserByEmail(email: string) { return Array.from(this.adminUsers.values()).find(u => u.email?.toLowerCase() === email.toLowerCase().trim()); }
  async getAdminUserByUsernameOrEmail(identifier: string) { return identifier.includes("@") ? this.getAdminUserByEmail(identifier) : this.getAdminUserByUsername(identifier); }
  async getAllAdminUsers() { return Array.from(this.adminUsers.values()).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); }
  async createAdminUser(username: string, hashedPassword: string, role: UserRole, fullName = "", email = "") { const id = randomUUID(); const user: AdminUser = { id, username, password: hashedPassword, role, fullName, email, createdAt: new Date().toISOString() }; this.adminUsers.set(id, user); return user; }
  async updateAdminUserRole(id: string, role: UserRole) { const u = this.adminUsers.get(id); if (!u) return undefined; const updated = { ...u, role }; this.adminUsers.set(id, updated); return updated; }
  async updateAdminUserPassword(id: string, hashedPassword: string) { const u = this.adminUsers.get(id); if (!u) return undefined; const updated = { ...u, password: hashedPassword }; this.adminUsers.set(id, updated); return updated; }
  async updateAdminUserLastSeen(id: string) { const u = this.adminUsers.get(id); if (u) this.adminUsers.set(id, { ...u, lastSeen: new Date().toISOString() }); }
  async deleteAdminUser(id: string) { return this.adminUsers.delete(id); }

  async getPendingUsers() { return Array.from(this.pendingUsers.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); }
  async getPendingUser(id: string) { return this.pendingUsers.get(id); }
  async createPendingUser(data: Omit<PendingUser, "id" | "status" | "createdAt">) { const id = randomUUID(); const pending: PendingUser = { id, ...data, status: "pending", createdAt: new Date().toISOString() }; this.pendingUsers.set(id, pending); return pending; }
  async approvePendingUser(id: string, role: UserRole, reviewedBy: string) { const p = this.pendingUsers.get(id); if (!p) return undefined; const updated = { ...p, status: "approved" as PendingStatus, reviewedAt: new Date().toISOString(), reviewedBy }; this.pendingUsers.set(id, updated); await this.createAdminUser(p.username, p.password, role, p.fullName, p.email); return updated; }
  async rejectPendingUser(id: string, reviewedBy: string, reason = "") { const p = this.pendingUsers.get(id); if (!p) return undefined; const updated = { ...p, status: "rejected" as PendingStatus, reviewedAt: new Date().toISOString(), reviewedBy, rejectReason: reason }; this.pendingUsers.set(id, updated); return updated; }

  async getActivityLogs(limit = 200) { return Array.from(this.activityLogs.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit); }
  async createActivityLog(data: Omit<ActivityLog, "id" | "createdAt" | "device" | "browser">) {
    if (this.activityLogs.size >= MAX_ACTIVITY_LOGS) { const oldest = Array.from(this.activityLogs.values()).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0]; if (oldest) this.activityLogs.delete(oldest.id); }
    const id = randomUUID(); const log: ActivityLog = { id, ...data, device: parseDevice(data.userAgent), browser: parseBrowser(data.userAgent), createdAt: new Date().toISOString() }; this.activityLogs.set(id, log); return log;
  }

  async getMessages() { return Array.from(this.messages.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); }
  async getMessage(id: string) { return this.messages.get(id); }
  async createMessage(msg: InsertMessage) { const id = randomUUID(); const message: Message = { id, firstName: msg.firstName, lastName: msg.lastName, email: msg.email, message: msg.message, isRead: false, createdAt: new Date().toISOString() }; this.messages.set(id, message); return message; }
  async updateMessageRead(id: string, isRead: boolean) { const m = this.messages.get(id); if (!m) return undefined; const updated = { ...m, isRead }; this.messages.set(id, updated); return updated; }
  async deleteMessage(id: string) { return this.messages.delete(id); }

  async getPortfolioItems() { return Array.from(this.portfolioItems.values()).sort((a, b) => a.order - b.order); }
  async getPortfolioItem(id: string) { return this.portfolioItems.get(id); }
  async createPortfolioItem(item: InsertPortfolioItem) { const id = randomUUID(); const pi: PortfolioItem = { id, title: item.title, description: item.description, category: item.category, tags: item.tags ?? "[]", imageUrl: item.imageUrl ?? "", liveUrl: item.liveUrl ?? "", featured: item.featured ?? false, order: item.order ?? 0, createdAt: new Date().toISOString() }; this.portfolioItems.set(id, pi); return pi; }
  async updatePortfolioItem(id: string, item: Partial<InsertPortfolioItem>) { const e = this.portfolioItems.get(id); if (!e) return undefined; const updated = { ...e, ...item }; this.portfolioItems.set(id, updated); return updated; }
  async deletePortfolioItem(id: string) { return this.portfolioItems.delete(id); }

  async getTeamMembers() { return Array.from(this.teamMembers.values()).sort((a, b) => a.order - b.order); }
  async getTeamMember(id: string) { return this.teamMembers.get(id); }
  async createTeamMember(member: InsertTeamMember) { const id = randomUUID(); const tm: TeamMember = { id, name: member.name, position: member.position, bio: member.bio ?? "", imageUrl: member.imageUrl ?? "", facebookUrl: member.facebookUrl ?? "", twitterUrl: member.twitterUrl ?? "", linkedinUrl: member.linkedinUrl ?? "", githubUrl: member.githubUrl ?? "", order: member.order ?? 0, isActive: member.isActive ?? true }; this.teamMembers.set(id, tm); return tm; }
  async updateTeamMember(id: string, member: Partial<InsertTeamMember>) { const e = this.teamMembers.get(id); if (!e) return undefined; const updated = { ...e, ...member }; this.teamMembers.set(id, updated); return updated; }
  async deleteTeamMember(id: string) { return this.teamMembers.delete(id); }

  async getSecurityLogs(limit = 100) { return Array.from(this.securityLogs.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit); }
  async createSecurityLog(log: InsertSecurityLog) {
    if (this.securityLogs.size >= MAX_SECURITY_LOGS) { const oldest = Array.from(this.securityLogs.values()).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0]; if (oldest) this.securityLogs.delete(oldest.id); }
    const id = randomUUID(); const sl: SecurityLog = { id, event: log.event, severity: log.severity ?? "info", ip: log.ip ?? "", userAgent: log.userAgent ?? "", details: log.details ?? "", createdAt: new Date().toISOString() }; this.securityLogs.set(id, sl); return sl;
  }

  async getSettings() { return Array.from(this.settings.values()); }
  async getSetting(key: string) { return this.settings.get(key); }
  async setSetting(key: string, value: string) { const s = { key, value }; this.settings.set(key, s); return s; }

  async getCategories() { return Array.from(this.categoriesMap.values()).sort((a, b) => a.order - b.order); }
  async getCategory(id: string) { return this.categoriesMap.get(id); }
  async createCategory(cat: InsertCategory) { const id = randomUUID(); const c: Category = { id, title: cat.title, subtitle: cat.subtitle ?? "", description: cat.description ?? "", icon: cat.icon ?? "Shield", color: cat.color ?? "text-cyan-400", imageUrl: cat.imageUrl ?? "", type: cat.type ?? "service", order: cat.order ?? 0, isVisible: cat.isVisible ?? true, createdAt: new Date().toISOString() }; this.categoriesMap.set(id, c); return c; }
  async updateCategory(id: string, cat: Partial<InsertCategory>) { const e = this.categoriesMap.get(id); if (!e) return undefined; const updated = { ...e, ...cat }; this.categoriesMap.set(id, updated); return updated; }
  async deleteCategory(id: string) { return this.categoriesMap.delete(id); }

  async getPublicUserById(id: string) { return this.publicUsers.get(id); }
  async getPublicUserByEmail(email: string) { return Array.from(this.publicUsers.values()).find(u => u.email.toLowerCase() === email.toLowerCase()); }
  async getPublicUserByUsername(username: string) { return Array.from(this.publicUsers.values()).find(u => u.username.toLowerCase() === username.toLowerCase()); }
  async getAllPublicUsers() { return Array.from(this.publicUsers.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); }
  async createPublicUser(data: Omit<PublicUser, "id" | "createdAt" | "isEmailVerified" | "isBanned" | "role">) { const id = randomUUID(); const user: PublicUser = { id, name: data.name, username: data.username, email: data.email, passwordHash: data.passwordHash ?? null, phone: data.phone, role: "user", isEmailVerified: false, isBanned: false, profileImageUrl: data.profileImageUrl, provider: data.provider ?? "email", providerId: data.providerId, createdAt: new Date().toISOString(), ipAddress: data.ipAddress, userAgent: data.userAgent }; this.publicUsers.set(id, user); return user; }
  async updatePublicUserLastLogin(id: string, ip?: string) { const u = this.publicUsers.get(id); if (u) this.publicUsers.set(id, { ...u, lastLoginAt: new Date().toISOString(), lastSeenAt: new Date().toISOString(), ...(ip ? { ipAddress: ip } : {}) }); }
  async updatePublicUserLastSeen(id: string) { const u = this.publicUsers.get(id); if (u) this.publicUsers.set(id, { ...u, lastSeenAt: new Date().toISOString() }); }
  async verifyPublicUserEmail(email: string) { const u = Array.from(this.publicUsers.values()).find(u => u.email.toLowerCase() === email.toLowerCase()); if (u) this.publicUsers.set(u.id, { ...u, isEmailVerified: true }); }
  async updatePublicUserPassword(email: string, hashedPassword: string) { const u = Array.from(this.publicUsers.values()).find(u => u.email.toLowerCase() === email.toLowerCase()); if (u) this.publicUsers.set(u.id, { ...u, passwordHash: hashedPassword }); }
  async banPublicUser(id: string, reason: string) { const u = this.publicUsers.get(id); if (!u) return undefined; const updated = { ...u, isBanned: true, banReason: reason }; this.publicUsers.set(id, updated); return updated; }
  async unbanPublicUser(id: string) { const u = this.publicUsers.get(id); if (!u) return undefined; const updated = { ...u, isBanned: false, banReason: undefined }; this.publicUsers.set(id, updated); return updated; }
  async deletePublicUser(id: string) { return this.publicUsers.delete(id); }
  async verifyPublicUserById(id: string) { const u = this.publicUsers.get(id); if (!u) return undefined; const updated = { ...u, isEmailVerified: true }; this.publicUsers.set(id, updated); return updated; }

  async createOtpCode(data: { email: string; code: string; type: string }) {
    for (const [k, otp] of this.otpCodes) { if (otp.email.toLowerCase() === data.email.toLowerCase() && otp.type === data.type && !otp.usedAt) this.otpCodes.delete(k); }
    const id = randomUUID(); const otp: OtpCode = { id, email: data.email, code: data.code, type: data.type, expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), attempts: 0, createdAt: new Date().toISOString() }; this.otpCodes.set(id, otp); return otp;
  }
  async getValidOtpCode(email: string, type: string) {
    const now = Date.now();
    return Array.from(this.otpCodes.values())
      .filter(o => o.email.toLowerCase() === email.toLowerCase() && o.type === type && !o.usedAt && new Date(o.expiresAt).getTime() > now)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  }
  async getOtpLogs(limit = 100) { return Array.from(this.otpCodes.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit); }
  async markOtpUsed(id: string) { const otp = this.otpCodes.get(id); if (otp) this.otpCodes.set(id, { ...otp, usedAt: new Date().toISOString() }); }
  async incrementOtpAttempts(id: string) { const otp = this.otpCodes.get(id); if (otp) this.otpCodes.set(id, { ...otp, attempts: otp.attempts + 1 }); }

  async getServices() { return Array.from(this.servicesMap.values()).sort((a, b) => a.order - b.order); }
  async getService(id: string) { return this.servicesMap.get(id); }
  async createService(data: Omit<Service, "id" | "createdAt">) { const id = randomUUID(); const s: Service = { id, ...data, createdAt: new Date().toISOString() }; this.servicesMap.set(id, s); return s; }
  async updateService(id: string, data: Partial<Omit<Service, "id" | "createdAt">>) { const e = this.servicesMap.get(id); if (!e) return undefined; const updated = { ...e, ...data }; this.servicesMap.set(id, updated); return updated; }
  async deleteService(id: string) { return this.servicesMap.delete(id); }

  async getOrders() { return Array.from(this.ordersMap.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); }
  async getOrder(id: string) { return this.ordersMap.get(id); }
  async getOrdersByUserId(userId: string) { return Array.from(this.ordersMap.values()).filter(o => o.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); }
  async createOrder(data: Omit<Order, "id" | "createdAt" | "updatedAt">) { const id = randomUUID(); const now = new Date().toISOString(); const order: Order = { id, ...data, createdAt: now, updatedAt: now }; this.ordersMap.set(id, order); return order; }
  async updateOrder(id: string, data: Partial<Order>) { const e = this.ordersMap.get(id); if (!e) return undefined; const updated = { ...e, ...data, updatedAt: new Date().toISOString() }; this.ordersMap.set(id, updated); return updated; }

  async getStats() {
    const msgs = Array.from(this.messages.values()); const ords = Array.from(this.ordersMap.values()); const logs = Array.from(this.securityLogs.values()); const pending = Array.from(this.pendingUsers.values()).filter(p => p.status === "pending");
    return { messages: msgs.length, unreadMessages: msgs.filter(m => !m.isRead).length, portfolioItems: this.portfolioItems.size, teamMembers: this.teamMembers.size, securityAlerts: logs.filter(l => l.severity === "warning" || l.severity === "critical").length, categories: this.categoriesMap.size, pendingSignups: pending.length, publicUsers: this.publicUsers.size, services: this.servicesMap.size, orders: ords.length, pendingOrders: ords.filter(o => o.orderStatus === "pending").length, completedOrders: ords.filter(o => o.orderStatus === "completed").length, totalRevenue: Math.round(ords.filter(o => o.paymentStatus === "approved").reduce((s, o) => s + (parseFloat(o.totalPrice) || 0), 0) * 100) / 100 };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MONGODB STORAGE
// ─────────────────────────────────────────────────────────────────────────────

function toDoc<T>(doc: any): T | undefined {
  if (!doc) return undefined;
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  const { _id, ...rest } = obj;
  return { ...rest, id: String(_id) } as T;
}

function toDocs<T>(docs: any[]): T[] {
  return docs.map(d => toDoc<T>(d)).filter(Boolean) as T[];
}

function toSetting(doc: any): SiteSetting | undefined {
  if (!doc) return undefined;
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  return { key: String(obj._id), value: obj.value };
}

export class MongoStorage implements IStorage {
  constructor() {
    connectDB()
      .then(() => this._init())
      .catch(err => console.error("[DB] Init error:", err));
  }

  private async _init() {
    try {
      const count = await AdminUserModel.countDocuments();
      if (count === 0) {
        console.log("[DB] First run — seeding default data…");
        await this._seed();
        console.log("[DB] Seed complete.");
      }
    } catch (err) {
      console.error("[DB] Seed check failed:", err);
    }
  }

  private async _seed() {
    const now = new Date().toISOString();

    await AdminUserModel.insertMany([
      { _id: randomUUID(), username: "admin",     password: bcrypt.hashSync("admin123", 10), role: "super_admin", email: "olderbrotherofficial@yahoo.com", fullName: "Super Admin", createdAt: now },
      { _id: randomUUID(), username: "amitmax44", password: bcrypt.hashSync("Amitmax3",  10), role: "super_admin", email: "maxamit279@gmail.com",          fullName: "Amit Max",    createdAt: now },
    ], { ordered: false }).catch(() => {});

    const defaults: [string, string][] = [
      ["site_title","Older Brother Team"],["site_description","Web3 Digital Security Platform"],["maintenance_mode","false"],["contact_email","olderbrotherofficial@yahoo.com"],["twitter_url",""],["instagram_url",""],["telegram_url",""],["seo_keywords","Web3, Digital Security, Facebook Support, Copyright Protection"],["logo_url",""],["nav_brand_name","OLDER BROTHER"],["hero_badge_text","Next Gen Digital Guidance"],["hero_headline","Protecting Your Digital Legacy"],["hero_subheadline","We are the OLDER BROTHER Team. Navigating the complexities of Facebook support, copyright protection, and community growth with Web3 precision."],["hero_security_notice",""],["hero_cta_primary","Start Conversation"],["hero_cta_secondary","View Work"],["hero_logo_link","https://www.facebook.com/OlderBrotherofficiall"],["about_title","Our Journey"],["about_description","From humble beginnings to digital guardians. We've evolved alongside the internet to provide cutting-edge protection and support."],["services_title","Premium Digital Services"],["services_subtitle","What We Do"],["services_description","We provide the shield and the sword for your online presence. Expert tools and strategies for the modern web."],["team_title","Meet Our Older Brother Cyber Expert"],["team_description","The minds behind Older Brother. Experts in their fields, united by a common goal."],["portfolio_title","Selected Works"],["portfolio_description","Showcasing our impact across the digital landscape."],["contact_label","Get in Touch"],["contact_title","Ready to secure your digital future?"],["contact_description","Reach out to the Older Brother Team for a consultation. We are ready to assist with your digital needs."],["contact_location","Decentralized & Remote"],["contact_facebook_url","https://www.facebook.com/OlderBrotherofficiall"],["contact_facebook_cta","Visit Our Facebook Page"],["footer_copyright","Older Brother Team. All rights reserved."],["footer_credit","Design & Development by Amit Max"],["bkash_number","01XXXXXXXXX"],["nagad_number","01XXXXXXXXX"],["rocket_number","01XXXXXXXXX"],["marketplace_enabled","true"],["marketplace_title","Digital Services Marketplace"],["marketplace_subtitle","Premium growth and security services"],
    ];
    for (const [key, value] of defaults) {
      await SiteSettingModel.findByIdAndUpdate(key, { value }, { upsert: true }).catch(() => {});
    }

    const portfolioData = [
      { title: "Facebook Account Recovery", description: "Recovered 500+ compromised Facebook accounts for enterprise clients.", category: "Facebook Support", tags: '["Facebook","Security","Recovery"]', featured: true, imageUrl: "", liveUrl: "", order: 0 },
      { title: "NFT Collection Security Audit", description: "Comprehensive security audit for a major NFT collection, preventing potential $2M exploit.", category: "Web3", tags: '["NFT","Blockchain","Audit"]', featured: true, imageUrl: "", liveUrl: "", order: 1 },
      { title: "Brand Copyright Shield", description: "Implemented automated copyright monitoring across 15 social platforms.", category: "Copyright", tags: '["Copyright","Brand Protection","Automation"]', featured: false, imageUrl: "", liveUrl: "", order: 2 },
      { title: "Community Management System", description: "Built and managed 50k+ member Web3 community with zero security incidents.", category: "Community", tags: '["Community","Discord","Web3"]', featured: false, imageUrl: "", liveUrl: "", order: 3 },
    ];
    await PortfolioItemModel.insertMany(portfolioData.map(p => ({ _id: randomUUID(), ...p, createdAt: now })), { ordered: false }).catch(() => {});

    const teamData = [
      { name: "Alex Chen",    position: "Lead Security Architect", bio: "10+ years in cybersecurity and Web3 infrastructure.",         order: 0 },
      { name: "Mia Torres",   position: "Web3 Strategy Lead",      bio: "DeFi pioneer with expertise in blockchain security protocols.", order: 1 },
      { name: "Jordan Blake", position: "Community Director",       bio: "Built and managed 100k+ member crypto communities.",           order: 2 },
    ];
    await TeamMemberModel.insertMany(teamData.map(m => ({ _id: randomUUID(), ...m, imageUrl: "", facebookUrl: "", twitterUrl: "", linkedinUrl: "", githubUrl: "", isActive: true })), { ordered: false }).catch(() => {});

    await SecurityLogModel.insertMany([
      { _id: randomUUID(), event: "System Started",       severity: "info",    ip: "127.0.0.1", userAgent: "System", details: "Application server initialized successfully", createdAt: now },
      { _id: randomUUID(), event: "Admin Login",          severity: "info",    ip: "127.0.0.1", userAgent: "System", details: "Successful admin authentication",             createdAt: now },
      { _id: randomUUID(), event: "Failed Login Attempt", severity: "warning", ip: "127.0.0.1", userAgent: "System", details: "Invalid credentials attempted",               createdAt: now },
    ], { ordered: false }).catch(() => {});

    const categoryData = [
      { title: "Facebook",  subtitle: "Social Media", description: "Facebook page likes, account recovery, Meta verification and more.", icon: "Facebook", color: "text-blue-400",   order: 0 },
      { title: "Instagram", subtitle: "Social Media", description: "Grow your Instagram followers, likes, and engagement.",              icon: "Instagram", color: "text-pink-400",   order: 1 },
      { title: "TikTok",    subtitle: "Social Media", description: "Boost TikTok followers and video views to expand your reach.",        icon: "Zap",       color: "text-cyan-400",   order: 2 },
      { title: "Twitter",   subtitle: "Social Media", description: "Build your Twitter/X presence with quality followers.",              icon: "Twitter",   color: "text-sky-400",    order: 3 },
      { title: "Web3",      subtitle: "Blockchain",   description: "Web3 wallet security, DeFi advisory, and smart contract consultations.", icon: "Globe", color: "text-purple-400", order: 4 },
    ];
    await CategoryModel.insertMany(categoryData.map(c => ({ _id: randomUUID(), ...c, imageUrl: "", type: "service", isVisible: true, createdAt: now })), { ordered: false }).catch(() => {});

    const serviceData = [
      { title: "Facebook Page Likes",        price: "15.00",  category: "Facebook",  platform: "Facebook",            deliveryTime: "1-3 days",    description: "Boost your Facebook page with real, active followers.",            longDescription: "Our Facebook Page Likes service delivers genuine-looking followers from quality accounts.", features: '["Real-looking accounts","Gradual delivery","No password required","24/7 support","Refill guarantee"]',                   minQuantity: 100,  maxQuantity: 100000,   order: 0 },
      { title: "Facebook Account Recovery",  price: "49.99",  category: "Facebook",  platform: "Facebook",            deliveryTime: "3-7 days",    description: "Professional service to recover disabled or hacked accounts.",     longDescription: "Our team has recovered thousands of accounts. Success rate over 90%.",                     features: '["90%+ success rate","All account types","Hacked accounts","Disabled accounts","2FA lockout recovery"]',                  minQuantity: 1,    maxQuantity: 1,        order: 1 },
      { title: "Facebook Meta Verification", price: "99.99",  category: "Facebook",  platform: "Facebook",            deliveryTime: "7-14 days",   description: "Get the official Meta blue checkmark on your Facebook page.",      longDescription: "We guide you through the official Meta verification process step by step.",                features: '["Official process","Documentation support","Revision included","High approval rate"]',                                    minQuantity: 1,    maxQuantity: 1,        order: 2 },
      { title: "Instagram Followers",        price: "12.00",  category: "Instagram", platform: "Instagram",           deliveryTime: "1-3 days",    description: "Grow your Instagram following with high-quality followers.",        longDescription: "Real-looking Instagram followers delivered gradually.",                                    features: '["Real-looking profiles","Safe gradual delivery","No password needed","30-day refill"]',                                    minQuantity: 100,  maxQuantity: 500000,   order: 3 },
      { title: "Instagram Post Likes",       price: "5.00",   category: "Instagram", platform: "Instagram",           deliveryTime: "0-24 hours",  description: "Increase engagement on your Instagram posts.",                     longDescription: "Boost your Instagram post engagement with our likes service.",                             features: '["Instant start","Real-looking accounts","Safe for account","Bulk discounts available"]',                                  minQuantity: 50,   maxQuantity: 100000,   order: 4 },
      { title: "TikTok Followers",           price: "10.00",  category: "TikTok",   platform: "TikTok",              deliveryTime: "1-2 days",    description: "Grow your TikTok audience and reach more people.",                 longDescription: "Quality TikTok followers delivered safely to your account.",                               features: '["Real-looking profiles","Monetization eligible","Safe delivery","24/7 support"]',                                         minQuantity: 100,  maxQuantity: 1000000,  order: 5 },
      { title: "TikTok Video Views",         price: "3.00",   category: "TikTok",   platform: "TikTok",              deliveryTime: "0-12 hours",  description: "Increase your TikTok video view count.",                           longDescription: "Supercharge your TikTok videos with views.",                                              features: '["Lightning fast delivery","ForYouPage boost","Any public video","Bulk rates available"]',                                 minQuantity: 1000, maxQuantity: 10000000, order: 6 },
      { title: "Twitter/X Followers",        price: "8.00",   category: "Twitter",  platform: "Twitter/X",           deliveryTime: "1-3 days",    description: "Build your Twitter/X audience with quality followers.",            longDescription: "Grow your Twitter X following fast.",                                                     features: '["Quality accounts","Gradual delivery","No password required","Verified-looking profiles"]',                               minQuantity: 100,  maxQuantity: 500000,   order: 7 },
      { title: "Web3 Wallet Security Audit", price: "199.99", category: "Web3",     platform: "Ethereum / BNB / Solana", deliveryTime: "5-10 days", description: "Comprehensive security audit for your Web3 wallets.",            longDescription: "Our Web3 security experts will audit your wallets and identify vulnerabilities.",           features: '["Wallet vulnerability scan","Smart contract review","Phishing protection","Detailed report","Follow-up consultation"]', minQuantity: 1,    maxQuantity: 1,        order: 8 },
      { title: "Web3 Advisory Consultation", price: "79.99",  category: "Web3",     platform: "All Networks",        deliveryTime: "1-3 days",    description: "One-on-one consultation with our Web3 and DeFi experts.",          longDescription: "Get personalized guidance on navigating the Web3 ecosystem safely.",                       features: '["1-hour video session","Personalized roadmap","DeFi protocol guidance","NFT security tips","Recording included"]',        minQuantity: 1,    maxQuantity: 10,       order: 9 },
    ];
    await ServiceModel.insertMany(serviceData.map(s => ({ _id: randomUUID(), ...s, isActive: true, imageUrl: "", createdAt: now })), { ordered: false }).catch(() => {});
  }

  // ── Admin Users ──────────────────────────────────────────────────────────────

  async getAdminUser(id: string) {
    return toDoc<AdminUser>(await AdminUserModel.findById(id));
  }

  async getAdminUserByUsername(username: string) {
    return toDoc<AdminUser>(await AdminUserModel.findOne({ username: { $regex: new RegExp(`^${username.trim()}$`, "i") } }));
  }

  async getAdminUserByEmail(email: string) {
    return toDoc<AdminUser>(await AdminUserModel.findOne({ email: { $regex: new RegExp(`^${email.trim()}$`, "i") } }));
  }

  async getAdminUserByUsernameOrEmail(identifier: string) {
    return identifier.includes("@") ? this.getAdminUserByEmail(identifier) : this.getAdminUserByUsername(identifier);
  }

  async getAllAdminUsers() {
    return toDocs<AdminUser>(await AdminUserModel.find().sort({ createdAt: 1 }));
  }

  async createAdminUser(username: string, hashedPassword: string, role: UserRole, fullName = "", email = "") {
    const id = randomUUID();
    const doc = await AdminUserModel.create({ _id: id, username, password: hashedPassword, role, fullName, email, createdAt: new Date().toISOString() });
    return toDoc<AdminUser>(doc)!;
  }

  async updateAdminUserRole(id: string, role: UserRole) {
    return toDoc<AdminUser>(await AdminUserModel.findByIdAndUpdate(id, { role }, { new: true }));
  }

  async updateAdminUserPassword(id: string, hashedPassword: string) {
    return toDoc<AdminUser>(await AdminUserModel.findByIdAndUpdate(id, { password: hashedPassword }, { new: true }));
  }

  async updateAdminUserLastSeen(id: string) {
    await AdminUserModel.findByIdAndUpdate(id, { lastSeen: new Date().toISOString() });
  }

  async deleteAdminUser(id: string) {
    const result = await AdminUserModel.findByIdAndDelete(id);
    return !!result;
  }

  // ── Pending Users ────────────────────────────────────────────────────────────

  async getPendingUsers() {
    return toDocs<PendingUser>(await PendingUserModel.find().sort({ createdAt: -1 }));
  }

  async getPendingUser(id: string) {
    return toDoc<PendingUser>(await PendingUserModel.findById(id));
  }

  async createPendingUser(data: Omit<PendingUser, "id" | "status" | "createdAt">) {
    const doc = await PendingUserModel.create({ _id: randomUUID(), ...data, status: "pending", createdAt: new Date().toISOString() });
    return toDoc<PendingUser>(doc)!;
  }

  async approvePendingUser(id: string, role: UserRole, reviewedBy: string) {
    const now = new Date().toISOString();
    const doc = await PendingUserModel.findByIdAndUpdate(id, { status: "approved", reviewedAt: now, reviewedBy }, { new: true });
    if (!doc) return undefined;
    const pending = toDoc<PendingUser>(doc)!;
    await this.createAdminUser(pending.username, pending.password, role, pending.fullName, pending.email);
    return pending;
  }

  async rejectPendingUser(id: string, reviewedBy: string, reason = "") {
    const now = new Date().toISOString();
    return toDoc<PendingUser>(await PendingUserModel.findByIdAndUpdate(id, { status: "rejected", reviewedAt: now, reviewedBy, rejectReason: reason }, { new: true }));
  }

  // ── Activity Logs ────────────────────────────────────────────────────────────

  async getActivityLogs(limit = 200) {
    return toDocs<ActivityLog>(await ActivityLogModel.find().sort({ createdAt: -1 }).limit(limit));
  }

  async createActivityLog(data: Omit<ActivityLog, "id" | "createdAt" | "device" | "browser">) {
    const doc = await ActivityLogModel.create({ _id: randomUUID(), ...data, device: parseDevice(data.userAgent), browser: parseBrowser(data.userAgent), createdAt: new Date().toISOString() });
    return toDoc<ActivityLog>(doc)!;
  }

  // ── Messages ─────────────────────────────────────────────────────────────────

  async getMessages() {
    return toDocs<Message>(await MessageModel.find().sort({ createdAt: -1 }));
  }

  async getMessage(id: string) {
    return toDoc<Message>(await MessageModel.findById(id));
  }

  async createMessage(msg: InsertMessage) {
    const doc = await MessageModel.create({ _id: randomUUID(), ...msg, isRead: false, createdAt: new Date().toISOString() });
    return toDoc<Message>(doc)!;
  }

  async updateMessageRead(id: string, isRead: boolean) {
    return toDoc<Message>(await MessageModel.findByIdAndUpdate(id, { isRead }, { new: true }));
  }

  async deleteMessage(id: string) {
    return !!(await MessageModel.findByIdAndDelete(id));
  }

  // ── Portfolio ────────────────────────────────────────────────────────────────

  async getPortfolioItems() {
    return toDocs<PortfolioItem>(await PortfolioItemModel.find().sort({ order: 1 }));
  }

  async getPortfolioItem(id: string) {
    return toDoc<PortfolioItem>(await PortfolioItemModel.findById(id));
  }

  async createPortfolioItem(item: InsertPortfolioItem) {
    const doc = await PortfolioItemModel.create({ _id: randomUUID(), ...item, createdAt: new Date().toISOString() });
    return toDoc<PortfolioItem>(doc)!;
  }

  async updatePortfolioItem(id: string, item: Partial<InsertPortfolioItem>) {
    return toDoc<PortfolioItem>(await PortfolioItemModel.findByIdAndUpdate(id, item, { new: true }));
  }

  async deletePortfolioItem(id: string) {
    return !!(await PortfolioItemModel.findByIdAndDelete(id));
  }

  // ── Team ─────────────────────────────────────────────────────────────────────

  async getTeamMembers() {
    return toDocs<TeamMember>(await TeamMemberModel.find().sort({ order: 1 }));
  }

  async getTeamMember(id: string) {
    return toDoc<TeamMember>(await TeamMemberModel.findById(id));
  }

  async createTeamMember(member: InsertTeamMember) {
    const doc = await TeamMemberModel.create({ _id: randomUUID(), ...member });
    return toDoc<TeamMember>(doc)!;
  }

  async updateTeamMember(id: string, member: Partial<InsertTeamMember>) {
    return toDoc<TeamMember>(await TeamMemberModel.findByIdAndUpdate(id, member, { new: true }));
  }

  async deleteTeamMember(id: string) {
    return !!(await TeamMemberModel.findByIdAndDelete(id));
  }

  // ── Security Logs ────────────────────────────────────────────────────────────

  async getSecurityLogs(limit = 100) {
    return toDocs<SecurityLog>(await SecurityLogModel.find().sort({ createdAt: -1 }).limit(limit));
  }

  async createSecurityLog(log: InsertSecurityLog) {
    const doc = await SecurityLogModel.create({ _id: randomUUID(), event: log.event, severity: log.severity ?? "info", ip: log.ip ?? "", userAgent: log.userAgent ?? "", details: log.details ?? "", createdAt: new Date().toISOString() });
    return toDoc<SecurityLog>(doc)!;
  }

  // ── Settings ─────────────────────────────────────────────────────────────────

  async getSettings() {
    const docs = await SiteSettingModel.find();
    return docs.map(d => toSetting(d)).filter(Boolean) as SiteSetting[];
  }

  async getSetting(key: string) {
    return toSetting(await SiteSettingModel.findById(key));
  }

  async setSetting(key: string, value: string) {
    const doc = await SiteSettingModel.findByIdAndUpdate(key, { value }, { upsert: true, new: true });
    return toSetting(doc)!;
  }

  // ── Categories ───────────────────────────────────────────────────────────────

  async getCategories() {
    return toDocs<Category>(await CategoryModel.find().sort({ order: 1 }));
  }

  async getCategory(id: string) {
    return toDoc<Category>(await CategoryModel.findById(id));
  }

  async createCategory(cat: InsertCategory) {
    const doc = await CategoryModel.create({ _id: randomUUID(), ...cat, createdAt: new Date().toISOString() });
    return toDoc<Category>(doc)!;
  }

  async updateCategory(id: string, cat: Partial<InsertCategory>) {
    return toDoc<Category>(await CategoryModel.findByIdAndUpdate(id, cat, { new: true }));
  }

  async deleteCategory(id: string) {
    return !!(await CategoryModel.findByIdAndDelete(id));
  }

  // ── Public Users ─────────────────────────────────────────────────────────────

  async getPublicUserById(id: string) {
    return toDoc<PublicUser>(await PublicUserModel.findById(id));
  }

  async getPublicUserByEmail(email: string) {
    return toDoc<PublicUser>(await PublicUserModel.findOne({ email: email.toLowerCase() }));
  }

  async getPublicUserByUsername(username: string) {
    return toDoc<PublicUser>(await PublicUserModel.findOne({ username: { $regex: new RegExp(`^${username}$`, "i") } }));
  }

  async getAllPublicUsers() {
    return toDocs<PublicUser>(await PublicUserModel.find().sort({ createdAt: -1 }));
  }

  async createPublicUser(data: Omit<PublicUser, "id" | "createdAt" | "isEmailVerified" | "isBanned" | "role">) {
    const doc = await PublicUserModel.create({
      _id:             randomUUID(),
      name:            data.name,
      username:        data.username,
      email:           data.email.toLowerCase(),
      passwordHash:    data.passwordHash ?? null,
      phone:           data.phone,
      role:            "user",
      isEmailVerified: false,
      isBanned:        false,
      profileImageUrl: data.profileImageUrl,
      provider:        data.provider ?? "email",
      providerId:      data.providerId,
      createdAt:       new Date().toISOString(),
      ipAddress:       data.ipAddress,
      userAgent:       data.userAgent,
    });
    return toDoc<PublicUser>(doc)!;
  }

  async updatePublicUserLastLogin(id: string, ip?: string) {
    const now = new Date().toISOString();
    await PublicUserModel.findByIdAndUpdate(id, { lastLoginAt: now, lastSeenAt: now, ...(ip ? { ipAddress: ip } : {}) });
  }

  async updatePublicUserLastSeen(id: string) {
    await PublicUserModel.findByIdAndUpdate(id, { lastSeenAt: new Date().toISOString() });
  }

  async verifyPublicUserEmail(email: string) {
    await PublicUserModel.findOneAndUpdate({ email: email.toLowerCase() }, { isEmailVerified: true });
  }

  async updatePublicUserPassword(email: string, hashedPassword: string) {
    await PublicUserModel.findOneAndUpdate({ email: email.toLowerCase() }, { passwordHash: hashedPassword });
  }

  async banPublicUser(id: string, reason: string) {
    return toDoc<PublicUser>(await PublicUserModel.findByIdAndUpdate(id, { isBanned: true, banReason: reason }, { new: true }));
  }

  async unbanPublicUser(id: string) {
    return toDoc<PublicUser>(await PublicUserModel.findByIdAndUpdate(id, { isBanned: false, banReason: null }, { new: true }));
  }

  async deletePublicUser(id: string) {
    return !!(await PublicUserModel.findByIdAndDelete(id));
  }

  async verifyPublicUserById(id: string) {
    return toDoc<PublicUser>(await PublicUserModel.findByIdAndUpdate(id, { isEmailVerified: true }, { new: true }));
  }

  // ── OTP Codes ────────────────────────────────────────────────────────────────

  async createOtpCode(data: { email: string; code: string; type: string }) {
    await OtpCodeModel.updateMany(
      { email: data.email.toLowerCase(), type: data.type, usedAt: null },
      { usedAt: new Date().toISOString() }
    );
    const doc = await OtpCodeModel.create({
      _id:       randomUUID(),
      email:     data.email.toLowerCase(),
      code:      data.code,
      type:      data.type,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      attempts:  0,
      createdAt: new Date().toISOString(),
    });
    return toDoc<OtpCode>(doc)!;
  }

  async getValidOtpCode(email: string, type: string) {
    const now = new Date().toISOString();
    return toDoc<OtpCode>(await OtpCodeModel.findOne({
      email: email.toLowerCase(), type, usedAt: null, expiresAt: { $gt: now },
    }).sort({ createdAt: -1 }));
  }

  async getOtpLogs(limit = 100) {
    return toDocs<OtpCode>(await OtpCodeModel.find().sort({ createdAt: -1 }).limit(limit));
  }

  async markOtpUsed(id: string) {
    await OtpCodeModel.findByIdAndUpdate(id, { usedAt: new Date().toISOString() });
  }

  async incrementOtpAttempts(id: string) {
    await OtpCodeModel.findByIdAndUpdate(id, { $inc: { attempts: 1 } });
  }

  // ── Services ─────────────────────────────────────────────────────────────────

  async getServices() {
    return toDocs<Service>(await ServiceModel.find().sort({ order: 1 }));
  }

  async getService(id: string) {
    return toDoc<Service>(await ServiceModel.findById(id));
  }

  async createService(data: Omit<Service, "id" | "createdAt">) {
    const doc = await ServiceModel.create({ _id: randomUUID(), ...data, createdAt: new Date().toISOString() });
    return toDoc<Service>(doc)!;
  }

  async updateService(id: string, data: Partial<Omit<Service, "id" | "createdAt">>) {
    return toDoc<Service>(await ServiceModel.findByIdAndUpdate(id, data, { new: true }));
  }

  async deleteService(id: string) {
    return !!(await ServiceModel.findByIdAndDelete(id));
  }

  // ── Orders ───────────────────────────────────────────────────────────────────

  async getOrders() {
    return toDocs<Order>(await OrderModel.find().sort({ createdAt: -1 }));
  }

  async getOrder(id: string) {
    return toDoc<Order>(await OrderModel.findById(id));
  }

  async getOrdersByUserId(userId: string) {
    return toDocs<Order>(await OrderModel.find({ userId }).sort({ createdAt: -1 }));
  }

  async createOrder(data: Omit<Order, "id" | "createdAt" | "updatedAt">) {
    const now = new Date().toISOString();
    const doc = await OrderModel.create({ _id: randomUUID(), ...data, createdAt: now, updatedAt: now });
    return toDoc<Order>(doc)!;
  }

  async updateOrder(id: string, data: Partial<Order>) {
    return toDoc<Order>(await OrderModel.findByIdAndUpdate(id, { ...data, updatedAt: new Date().toISOString() }, { new: true }));
  }

  // ── Stats ────────────────────────────────────────────────────────────────────

  async getStats() {
    const [
      messages, unreadMessages, portfolioItems, teamMembers,
      securityAlerts, categories, pendingSignups, publicUsers,
      services, orders, pendingOrders, completedOrders, approvedOrders,
    ] = await Promise.all([
      MessageModel.countDocuments(),
      MessageModel.countDocuments({ isRead: false }),
      PortfolioItemModel.countDocuments(),
      TeamMemberModel.countDocuments(),
      SecurityLogModel.countDocuments({ severity: { $in: ["warning", "critical"] } }),
      CategoryModel.countDocuments(),
      PendingUserModel.countDocuments({ status: "pending" }),
      PublicUserModel.countDocuments(),
      ServiceModel.countDocuments(),
      OrderModel.countDocuments(),
      OrderModel.countDocuments({ orderStatus: "pending" }),
      OrderModel.countDocuments({ orderStatus: "completed" }),
      OrderModel.find({ paymentStatus: "approved" }, { totalPrice: 1 }).lean(),
    ]);

    const totalRevenue = Math.round(
      (approvedOrders as any[]).reduce((s: number, o: any) => s + (parseFloat(o.totalPrice) || 0), 0) * 100
    ) / 100;

    return { messages, unreadMessages, portfolioItems, teamMembers, securityAlerts, categories, pendingSignups, publicUsers, services, orders, pendingOrders, completedOrders, totalRevenue };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Export: use MongoDB if MONGODB_URI is set, otherwise in-memory
// ─────────────────────────────────────────────────────────────────────────────

// Development runs should remain usable when an imported project's external
// MongoDB host is unavailable. Production still uses MongoDB when configured.
export const storage: IStorage = process.env.NODE_ENV === "production" && process.env.MONGODB_URI
  ? new MongoStorage()
  : new MemStorage();
