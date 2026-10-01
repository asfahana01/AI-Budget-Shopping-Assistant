import mongoose from "mongoose";
import { config } from "./config.js";

export let mongoReady = false;

export async function connectMongo() {
  if (!config.mongodbUri) return false;
  try {
    await mongoose.connect(config.mongodbUri, { serverSelectionTimeoutMS: 2500 });
    mongoReady = true;
    console.log("MongoDB connected");
    return true;
  } catch (error) {
    mongoReady = false;
    console.warn("MongoDB unavailable, using in-memory sessions and JSON catalog:", error.message);
    return false;
  }
}
