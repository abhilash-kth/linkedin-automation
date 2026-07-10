import mongoose from "mongoose";
import mongoConfig from "../../config/mongodb.config.js";

let isConnected = false;

export async function connectDB() {
  if (isConnected) return;

  try {
    await mongoose.connect(mongoConfig.uri, mongoConfig.options);
    isConnected = true;
    console.log(`✅ MongoDB connected`);
  } catch (err) {
    console.error(`❌ MongoDB connection failed: ${err.message}`);
    throw err;
  }
}

export async function disconnectDB() {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
  console.log(`🔒 MongoDB disconnected`);
}

export function isDBConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}