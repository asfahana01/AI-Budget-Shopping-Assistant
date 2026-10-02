import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

export const config = {
  port: Number(process.env.PORT || 3000),
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  mongodbUri: process.env.MONGODB_URI || "",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  openaiBaseUrl: (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, ""),
  openaiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
  embeddingModel: process.env.EMBEDDING_MODEL || "text-embedding-3-small",
  imageModel: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
  visionModel: process.env.VISION_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini",
  modelEvalAllowlist: (process.env.MODEL_EVAL_ALLOWLIST || "gpt-4o-mini,another-model").split(",").map((item) => item.trim()).filter(Boolean),
  externalProductApiUrl: process.env.EXTERNAL_PRODUCT_API_URL || "",
  externalProductApiEnabled: String(process.env.EXTERNAL_PRODUCT_API_ENABLED || "false").toLowerCase() === "true",
  externalProductApiTimeoutMs: Number(process.env.EXTERNAL_PRODUCT_API_TIMEOUT_MS || 5000)
};
