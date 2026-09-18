import { callVisionModel, hasLlmKey } from "./llm.js";

const UNKNOWN = "Unable to determine from the image.";

export function demoVisionFromName(filename = "") {
  const name = filename.toLowerCase();
  if (name.includes("backpack") || name.includes("bag")) {
    return {
      productType: "backpack",
      color: UNKNOWN,
      shape: "rectangular pack",
      style: "casual",
      visibleFeatures: ["shoulder straps"],
      visualDescription: "Image filename suggests a backpack. Color and extra features cannot be confirmed without a vision model.",
      confidence: "low"
    };
  }
  return {
    productType: UNKNOWN,
    color: UNKNOWN,
    shape: UNKNOWN,
    style: UNKNOWN,
    visibleFeatures: [],
    visualDescription: "No vision API key is configured, so only a conservative placeholder analysis is available.",
    confidence: "low"
  };
}

export async function analyzeProductImage({ buffer, mimeType, filename }) {
  if (!buffer?.length) {
    const error = new Error("INVALID_IMAGE");
    throw error;
  }

  if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mimeType)) {
    const error = new Error("INVALID_IMAGE");
    throw error;
  }

  if (!hasLlmKey()) {
    return { source: "demo", analysis: demoVisionFromName(filename) };
  }

  const imageBase64 = buffer.toString("base64");
  const analysis = await callVisionModel({ imageBase64, mimeType });
  if (!analysis) {
    const error = new Error("VISION_FAILURE");
    throw error;
  }

  return {
    source: "vision",
    analysis: {
      productType: analysis.productType || UNKNOWN,
      color: analysis.color || UNKNOWN,
      shape: analysis.shape || UNKNOWN,
      style: analysis.style || UNKNOWN,
      visibleFeatures: Array.isArray(analysis.visibleFeatures) ? analysis.visibleFeatures : [],
      visualDescription: analysis.visualDescription || UNKNOWN,
      confidence: analysis.confidence || "medium"
    }
  };
}
