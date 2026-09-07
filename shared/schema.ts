import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Contact Messages
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: text("created_at").notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

// Portfolio Items
export const portfolioItems = pgTable("portfolio_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  tags: text("tags").notNull().default("[]"),
  imageUrl: text("image_url").notNull().default(""),
  liveUrl: text("live_url").notNull().default(""),
  featured: boolean("featured").default(false).notNull(),
  order: integer("order").default(0).notNull(),
  createdAt: text("created_at").notNull(),
});

export type PortfolioItem = typeof portfolioItems.$inferSelect;
export type InsertPortfolioItem = typeof portfolioItems.$inferInsert;

// Team Members
export const teamMembers = pgTable("team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  position: text("position").notNull(),
  bio: text("bio").notNull().default(""),
  imageUrl: text("image_url").notNull().default(""),
  facebookUrl: text("facebook_url").notNull().default(""),
  twitterUrl: text("twitter_url").notNull().default(""),
  linkedinUrl: text("linkedin_url").notNull().default(""),
  githubUrl: text("github_url").notNull().default(""),
  order: integer("order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = typeof teamMembers.$inferInsert;

// Security / Activity Logs
export const securityLogs = pgTable("security_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  event: text("event").notNull(),
  severity: text("severity").notNull().default("info"),
  ip: text("ip").notNull().default(""),
  userAgent: text("user_agent").notNull().default(""),
  details: text("details").notNull().default(""),
  createdAt: text("created_at").notNull(),
});

export type SecurityLog = typeof securityLogs.$inferSelect;
export type InsertSecurityLog = typeof securityLogs.$inferInsert;

// Site Settings
export const siteSettings = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type SiteSetting = typeof siteSettings.$inferSelect;

// Dynamic Categories / Services
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull().default(""),
  description: text("description").notNull().default(""),
  icon: text("icon").notNull().default("Shield"),
  color: text("color").notNull().default("text-cyan-400"),
  imageUrl: text("image_url").notNull().default(""),
  type: text("type").notNull().default("service"),
  order: integer("order").default(0).notNull(),
  isVisible: boolean("is_visible").default(true).notNull(),
  createdAt: text("created_at").notNull(),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

// ─── PUBLIC USER SYSTEM ────────────────────────────────────────────────────────

export const publicUsers = pgTable("public_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  phone: text("phone"),
  role: text("role").notNull().default("user"),
  isEmailVerified: boolean("is_email_verified").default(false).notNull(),
  isBanned: boolean("is_banned").default(false).notNull(),
  banReason: text("ban_reason"),
  profileImageUrl: text("profile_image_url"),
  provider: text("provider").notNull().default("email"),
  providerId: text("provider_id"),
  createdAt: text("created_at").notNull(),
  lastLoginAt: text("last_login_at"),
  lastSeenAt: text("last_seen_at"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
});

export type PublicUser = typeof publicUsers.$inferSelect;
export type InsertPublicUser = typeof publicUsers.$inferInsert;

// OTP Codes
export const otpCodes = pgTable("otp_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  code: text("code").notNull(),
  type: text("type").notNull(),
  expiresAt: text("expires_at").notNull(),
  usedAt: text("used_at"),
  attempts: integer("attempts").default(0).notNull(),
  createdAt: text("created_at").notNull(),
});

export type OtpCode = typeof otpCodes.$inferSelect;

// ─── MARKETPLACE SERVICES ──────────────────────────────────────────────────────

export const services = pgTable("services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  longDescription: text("long_description").notNull().default(""),
  price: text("price").notNull(),
  category: text("category").notNull(),
  platform: text("platform").notNull().default(""),
  deliveryTime: text("delivery_time").notNull().default("1-3 days"),
  features: text("features").notNull().default("[]"),
  minQuantity: integer("min_quantity").notNull().default(1),
  maxQuantity: integer("max_quantity").notNull().default(10000),
  isActive: boolean("is_active").notNull().default(true),
  imageUrl: text("image_url").notNull().default(""),
  order: integer("order").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export const insertServiceSchema = createInsertSchema(services).omit({ id: true, createdAt: true });
export type InsertService = typeof insertServiceSchema._type;
export type Service = typeof services.$inferSelect;

// ─── ORDERS ───────────────────────────────────────────────────────────────────

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull(),
  serviceId: text("service_id").notNull(),
  serviceTitle: text("service_title").notNull(),
  quantity: integer("quantity").notNull().default(1),
  link: text("link").notNull(),
  notes: text("notes").notNull().default(""),
  paymentMethod: text("payment_method").notNull(),
  transactionId: text("transaction_id").notNull().default(""),
  paymentStatus: text("payment_status").notNull().default("pending"),
  orderStatus: text("order_status").notNull().default("pending"),
  totalPrice: text("total_price").notNull(),
  userEmail: text("user_email").notNull().default(""),
  userName: text("user_name").notNull().default(""),
  adminNote: text("admin_note").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrder = typeof insertOrderSchema._type;
export type Order = typeof orders.$inferSelect;

// ─── ADMIN USERS ──────────────────────────────────────────────────────────────

export const adminUsers = pgTable("admin_users", {
  id:        varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username:  text("username").notNull().unique(),
  password:  text("password").notNull(),
  role:      text("role").notNull().default("admin"),
  email:     text("email").notNull().default(""),
  fullName:  text("full_name").notNull().default(""),
  createdAt: text("created_at").notNull(),
  lastLogin: text("last_login"),
  lastSeen:  text("last_seen"),
});

// ─── PENDING USERS (signup requests) ─────────────────────────────────────────

export const pendingUsers = pgTable("pending_users", {
  id:            varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fullName:      text("full_name").notNull(),
  username:      text("username").notNull(),
  email:         text("email").notNull(),
  password:      text("password").notNull(),
  requestedRole: text("requested_role").notNull().default("admin"),
  status:        text("status").notNull().default("pending"),
  ip:            text("ip").notNull().default(""),
  userAgent:     text("user_agent").notNull().default(""),
  createdAt:     text("created_at").notNull(),
  reviewedAt:    text("reviewed_at"),
  reviewedBy:    text("reviewed_by"),
  rejectReason:  text("reject_reason"),
});

// ─── ACTIVITY LOGS ────────────────────────────────────────────────────────────

export const activityLogs = pgTable("activity_logs", {
  id:        varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId:    text("user_id").notNull(),
  username:  text("username").notNull(),
  event:     text("event").notNull(),
  ip:        text("ip").notNull().default(""),
  userAgent: text("user_agent").notNull().default(""),
  device:    text("device").notNull().default(""),
  browser:   text("browser").notNull().default(""),
  details:   text("details").notNull().default(""),
  createdAt: text("created_at").notNull(),
});
