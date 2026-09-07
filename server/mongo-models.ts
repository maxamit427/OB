import mongoose, { Schema } from "mongoose";

const opts = { versionKey: false };

const AdminUserSchema = new Schema({
  _id:       String,
  username:  { type: String, required: true },
  password:  { type: String, required: true },
  role:      { type: String, default: "admin" },
  email:     { type: String, default: "" },
  fullName:  { type: String, default: "" },
  createdAt: { type: String, required: true },
  lastLogin: String,
  lastSeen:  String,
}, opts);

const PendingUserSchema = new Schema({
  _id:           String,
  fullName:      { type: String, required: true },
  username:      { type: String, required: true },
  email:         { type: String, required: true },
  password:      { type: String, required: true },
  requestedRole: { type: String, default: "admin" },
  status:        { type: String, default: "pending" },
  ip:            { type: String, default: "" },
  userAgent:     { type: String, default: "" },
  createdAt:     { type: String, required: true },
  reviewedAt:    String,
  reviewedBy:    String,
  rejectReason:  String,
}, opts);

const ActivityLogSchema = new Schema({
  _id:       String,
  userId:    { type: String, required: true },
  username:  { type: String, required: true },
  event:     { type: String, required: true },
  ip:        { type: String, default: "" },
  userAgent: { type: String, default: "" },
  device:    { type: String, default: "" },
  browser:   { type: String, default: "" },
  details:   { type: String, default: "" },
  createdAt: { type: String, required: true },
}, opts);

const MessageSchema = new Schema({
  _id:       String,
  firstName: { type: String, required: true },
  lastName:  { type: String, required: true },
  email:     { type: String, required: true },
  message:   { type: String, required: true },
  isRead:    { type: Boolean, default: false },
  createdAt: { type: String, required: true },
}, opts);

const PortfolioItemSchema = new Schema({
  _id:         String,
  title:       { type: String, required: true },
  description: { type: String, required: true },
  category:    { type: String, required: true },
  tags:        { type: String, default: "[]" },
  imageUrl:    { type: String, default: "" },
  liveUrl:     { type: String, default: "" },
  featured:    { type: Boolean, default: false },
  order:       { type: Number, default: 0 },
  createdAt:   { type: String, required: true },
}, opts);

const TeamMemberSchema = new Schema({
  _id:         String,
  name:        { type: String, required: true },
  position:    { type: String, required: true },
  bio:         { type: String, default: "" },
  imageUrl:    { type: String, default: "" },
  facebookUrl: { type: String, default: "" },
  twitterUrl:  { type: String, default: "" },
  linkedinUrl: { type: String, default: "" },
  githubUrl:   { type: String, default: "" },
  order:       { type: Number, default: 0 },
  isActive:    { type: Boolean, default: true },
}, opts);

const SecurityLogSchema = new Schema({
  _id:       String,
  event:     { type: String, required: true },
  severity:  { type: String, default: "info" },
  ip:        { type: String, default: "" },
  userAgent: { type: String, default: "" },
  details:   { type: String, default: "" },
  createdAt: { type: String, required: true },
}, opts);

const SiteSettingSchema = new Schema({
  _id:   String,
  value: { type: String, required: true },
}, opts);

const CategorySchema = new Schema({
  _id:         String,
  title:       { type: String, required: true },
  subtitle:    { type: String, default: "" },
  description: { type: String, default: "" },
  icon:        { type: String, default: "Shield" },
  color:       { type: String, default: "text-cyan-400" },
  imageUrl:    { type: String, default: "" },
  type:        { type: String, default: "service" },
  order:       { type: Number, default: 0 },
  isVisible:   { type: Boolean, default: true },
  createdAt:   { type: String, required: true },
}, opts);

const PublicUserSchema = new Schema({
  _id:             String,
  name:            { type: String, required: true },
  username:        { type: String, required: true, unique: true },
  email:           { type: String, required: true, unique: true },
  passwordHash:    String,
  phone:           String,
  role:            { type: String, default: "user" },
  isEmailVerified: { type: Boolean, default: false },
  isBanned:        { type: Boolean, default: false },
  banReason:       String,
  profileImageUrl: String,
  provider:        { type: String, default: "email" },
  providerId:      String,
  createdAt:       { type: String, required: true },
  lastLoginAt:     String,
  lastSeenAt:      String,
  ipAddress:       String,
  userAgent:       String,
}, opts);

const OtpCodeSchema = new Schema({
  _id:       String,
  email:     { type: String, required: true },
  code:      { type: String, required: true },
  type:      { type: String, required: true },
  expiresAt: { type: String, required: true },
  usedAt:    String,
  attempts:  { type: Number, default: 0 },
  createdAt: { type: String, required: true },
}, opts);

const ServiceSchema = new Schema({
  _id:             String,
  title:           { type: String, required: true },
  description:     { type: String, required: true },
  longDescription: { type: String, default: "" },
  price:           { type: String, required: true },
  category:        { type: String, required: true },
  platform:        { type: String, default: "" },
  deliveryTime:    { type: String, default: "1-3 days" },
  features:        { type: String, default: "[]" },
  minQuantity:     { type: Number, default: 1 },
  maxQuantity:     { type: Number, default: 10000 },
  isActive:        { type: Boolean, default: true },
  imageUrl:        { type: String, default: "" },
  order:           { type: Number, default: 0 },
  createdAt:       { type: String, required: true },
}, opts);

const OrderSchema = new Schema({
  _id:           String,
  userId:        { type: String, required: true },
  serviceId:     { type: String, required: true },
  serviceTitle:  { type: String, required: true },
  quantity:      { type: Number, default: 1 },
  link:          { type: String, required: true },
  notes:         { type: String, default: "" },
  paymentMethod: { type: String, required: true },
  transactionId: { type: String, default: "" },
  paymentStatus: { type: String, default: "pending" },
  orderStatus:   { type: String, default: "pending" },
  totalPrice:    { type: String, required: true },
  userEmail:     { type: String, default: "" },
  userName:      { type: String, default: "" },
  adminNote:     { type: String, default: "" },
  createdAt:     { type: String, required: true },
  updatedAt:     { type: String, required: true },
}, opts);

function m<T>(name: string, schema: Schema) {
  return (mongoose.models[name] || mongoose.model<T & Document>(name, schema)) as mongoose.Model<T & Document>;
}

export const AdminUserModel    = m("AdminUser",    AdminUserSchema);
export const PendingUserModel  = m("PendingUser",  PendingUserSchema);
export const ActivityLogModel  = m("ActivityLog",  ActivityLogSchema);
export const MessageModel      = m("Message",      MessageSchema);
export const PortfolioItemModel= m("PortfolioItem",PortfolioItemSchema);
export const TeamMemberModel   = m("TeamMember",   TeamMemberSchema);
export const SecurityLogModel  = m("SecurityLog",  SecurityLogSchema);
export const SiteSettingModel  = m("SiteSetting",  SiteSettingSchema);
export const CategoryModel     = m("Category",     CategorySchema);
export const PublicUserModel   = m("PublicUser",   PublicUserSchema);
export const OtpCodeModel      = m("OtpCode",      OtpCodeSchema);
export const ServiceModel      = m("Service",      ServiceSchema);
export const OrderModel        = m("Order",        OrderSchema);
