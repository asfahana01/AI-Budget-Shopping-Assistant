import { config } from "../config.js";
import { processProductPipeline } from "./dataProcessing.js";
import { normalizeCategory, normalizePrice } from "../utils/normalize.js";

function normalizeExternalAvailability(value) {
  const raw = String(value ?? "in_stock").trim().toLowerCase();
  if (["true", "in_stock", "available", "instock", "ok"].includes(raw) || raw.includes("instock")) {
    return "in_stock";
  }
  return "out_of_stock";
}

export function normalizeExternalProduct(item, index = 0) {
  if (!item || typeof item !== "object") return null;

  const price = normalizePrice(item.price ?? item.priceInr ?? item.amount ?? item.currentPrice ?? item.mrp ?? item.value);
  if (price === null) return null;

  const category = normalizeCategory(item.category || item.type || item.kind || item.productType || item.categoryName || "");
  const productId = String(item.productId || item.id || item.slug || `external-${index + 1}`).trim();
  const name = String(item.name || item.title || item.productName || "External product").trim();

  if (!productId || !name) return null;

  return {
    productId,
    name,
    category,
    brand: String(item.brand || item.vendor || "External vendor").trim(),
    color: String(item.color || "").trim(),
    price,
    rating: Number(item.rating ?? item.score ?? 0) || 0,
    description: String(item.description || item.summary || "").trim(),
    features: Array.isArray(item.features) ? item.features.map(String).filter(Boolean) : [],
    image: String(item.image || item.imageUrl || "").trim(),
    availability: normalizeExternalAvailability(item.availability ?? item.inStock ?? item.stockStatus ?? "in_stock")
  };
}

export async function fetchExternalProducts({
  url = config.externalProductApiUrl,
  enabled = config.externalProductApiEnabled,
  timeoutMs = config.externalProductApiTimeoutMs
} = {}) {
  if (!enabled || !url) {
    return {
      source: "fallback",
      count: 0,
      products: [],
      pipelineStats: {},
      message: "External product API is disabled or not configured. Falling back to the verified local catalog."
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs || 5000);

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal
    });

    if (!response.ok) {
      return {
        source: "fallback",
        count: 0,
        products: [],
        pipelineStats: {},
        message: "External product API is unavailable. Falling back to the verified local catalog."
      };
    }

    let payload;
    try {
      payload = await response.json();
    } catch {
      return {
        source: "fallback",
        count: 0,
        products: [],
        pipelineStats: {},
        message: "External product API returned invalid JSON. Falling back to the verified local catalog."
      };
    }

    let list = [];
    if (Array.isArray(payload)) {
      list = payload;
    } else if (Array.isArray(payload.products)) {
      list = payload.products;
    } else if (Array.isArray(payload.data)) {
      list = payload.data;
    }

    const normalizedList = list
      .map((item, index) => normalizeExternalProduct(item, index))
      .filter(Boolean);

    const processed = processProductPipeline(normalizedList, { items: [], preferences: [] });

    return {
      source: "external_api",
      count: processed.allRanked.length,
      pipelineStats: processed.stats,
      products: processed.allRanked,
      message: "External products were normalized and filtered against the verified local catalog rules."
    };
  } catch (error) {
    const message = error?.name === "AbortError"
      ? "External product API timed out. Falling back to the verified local catalog."
      : "External product API is unavailable. Falling back to the verified local catalog.";

    return {
      source: "fallback",
      count: 0,
      products: [],
      pipelineStats: {},
      message
    };
  } finally {
    clearTimeout(timer);
  }
}
