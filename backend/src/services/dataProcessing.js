import { normalizeCategory, normalizePrice, normalizeRating } from "../utils/normalize.js";
import { getVerifiedShoppingLink } from "../utils/officialLinks.js";

function asArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

export function validateProducts(products) {
  return products.filter((item) => item && typeof item === "object");
}

export function cleanProducts(products) {
  return products.filter((item) => {
    const name = String(item.name || "").trim();
    const price = normalizePrice(item.price);
    return Boolean(name) && price !== null;
  });
}

export function normalizeProducts(products) {
  return products.map((item) => {
    const officialUrl = getVerifiedShoppingLink(item);

    return {
      productId: String(item.productId || item._id || item.name).trim(),
      name: String(item.name).trim(),
      category: normalizeCategory(item.category),
      brand: String(item.brand || "Unknown").trim(),
      color: String(item.color || "").trim(),
      price: normalizePrice(item.price),
      rating: normalizeRating(item.rating),
      description: String(item.description || "").trim(),
      features: asArray(item.features),
      image: String(item.image || "").trim(),
      availability: String(item.availability || "unknown").toLowerCase(),
      officialUrl: officialUrl || null,
      officialUrlStatus: officialUrl ? "available" : "unavailable"
    };
  });
}

export function dedupeProducts(products) {
  const seen = new Set();
  const unique = [];
  for (const item of products) {
    const key = `${item.productId}|${item.name.toLowerCase()}|${item.price}`;
    if (seen.has(key) || seen.has(item.productId)) continue;
    seen.add(key);
    seen.add(item.productId);
    unique.push(item);
  }
  return unique;
}

export function filterAvailable(products) {
  return products.filter((item) => item.availability === "in_stock");
}

export function filterByRequirements(products, requirements = {}, visualContext = null) {
  const needed = (requirements.items || []).map(normalizeCategory).filter(Boolean);
  let next = products;

  if (needed.length) {
    next = next.filter((item) => needed.includes(item.category));
  }

  if (visualContext?.productType) {
    const visualCategory = normalizeCategory(visualContext.productType);
    if (visualCategory && needed.includes(visualCategory)) {
      next = next.map((item) => {
        if (item.category !== visualCategory) return item;
        const haystack = `${item.name} ${item.description} ${item.features.join(" ")}`.toLowerCase();
        const hints = [
          visualContext.color,
          visualContext.style,
          visualContext.shape
        ]
          .filter((value) => value && value !== "Unable to determine from the image.")
          .map((value) => String(value).toLowerCase());
        const matchCount = hints.filter((hint) => haystack.includes(hint)).length;
        return { ...item, visualBoost: matchCount };
      });
    }
  }

  return next;
}

export function rankProducts(products, requirements = {}) {
  const preferences = (requirements.preferences || []).map((p) => p.toLowerCase());
  const scored = products.map((item) => {
    const text = `${item.name} ${item.description} ${item.features.join(" ")} ${item.brand}`.toLowerCase();
    const preferenceHits = preferences.filter((pref) =>
      pref.split(/\s+/).some((token) => token.length > 2 && text.includes(token))
    ).length;
    const preferenceScore = preferences.length ? preferenceHits / preferences.length : 0.5;
    const ratingScore = item.rating / 5;
    const valueScore = Math.min(1, (item.rating / Math.max(item.price, 1)) * 400);
    const visualScore = Math.min(1, (item.visualBoost || 0) / 3);
    const relevance = Number(
      (0.35 * ratingScore + 0.35 * preferenceScore + 0.2 * valueScore + 0.1 * visualScore).toFixed(4)
    );
    return { ...item, relevance };
  });

  scored.sort((a, b) => b.relevance - a.relevance);
  return scored;
}

export function limitForLlm(products, limit = 18) {
  const byCategory = new Map();
  for (const item of products) {
    const list = byCategory.get(item.category) || [];
    if (list.length < 6) list.push(item);
    byCategory.set(item.category, list);
  }
  const limited = [...byCategory.values()].flat();
  return limited.slice(0, limit);
}

export function processProductPipeline(rawProducts, requirements, visualContext) {
  const validated = validateProducts(rawProducts);
  const cleaned = cleanProducts(validated);
  const normalized = normalizeProducts(cleaned);
  const unique = dedupeProducts(normalized);
  const available = filterAvailable(unique);
  const filtered = filterByRequirements(available, requirements, visualContext);
  const ranked = rankProducts(filtered, requirements);
  const limited = limitForLlm(ranked);
  return {
    stats: {
      raw: rawProducts.length,
      validated: validated.length,
      cleaned: cleaned.length,
      unique: unique.length,
      available: available.length,
      filtered: filtered.length,
      ranked: ranked.length,
      sentToLlm: limited.length
    },
    allUnique: unique,
    products: limited,
    allRanked: ranked
  };
}
