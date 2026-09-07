import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn("[DB] MONGODB_URI not set — using in-memory storage.");
    return;
  }
  if (mongoose.connection.readyState >= 1) return;
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
    console.log("[DB] MongoDB connected.");
  } catch (err) {
    console.error("[DB] MongoDB connection failed:", err);
    throw err;
  }
}

export const isMongoConfigured = () => !!process.env.MONGODB_URI;
