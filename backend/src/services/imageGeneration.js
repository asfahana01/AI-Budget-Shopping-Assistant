import { config } from "../config.js";

export const PREVIEW_DISCLAIMER = "AI-generated visual preview — not the actual product.";

export function resolveVerifiedProducts(productIds, catalog) {
  const products = productIds.map((productId) => catalog.find((product) => product.productId === productId));
  if (products.some((product) => !product)) throw new Error("INVALID_PRODUCT_ID");
  return products;
}

function cleanPreference(value) {
  return String(value || "").replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, 160).trim();
}

export function buildShoppingBoardPrompt(products, preferences = []) {
  const verifiedItems = products.map((product) => ({
    productType: product.category,
    color: product.color || null
  }));
  return [
    "Create a conceptual shopping-board illustration showing these general product types together.",
    "Use the category and known color only as visual references; do not reproduce an exact branded product or imply this is a product photograph.",
    `Verified item references: ${JSON.stringify(verifiedItems)}`,
    `General visual preferences: ${preferences.map(cleanPreference).filter(Boolean).join(", ") || "clean neutral layout"}`,
    "This is an illustrative AI-generated preview, not an exact representation of any catalog item."
  ].join("\n");
}

export async function generateShoppingBoard(products, preferences = [], options = {}) {
  const apiKey = options.apiKey ?? config.openaiApiKey;
  const baseUrl = options.baseUrl ?? config.openaiBaseUrl;
  const model = options.model ?? config.imageModel;
  if (!apiKey) {
    return {
      status: "unavailable",
      message: "Image generation is not configured. Real product images are still available."
    };
  }

  try {
    const response = await (options.fetchImpl || fetch)(`${baseUrl}/images/generations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, prompt: buildShoppingBoardPrompt(products, preferences), size: "1024x1024", n: 1 })
    });
    if (!response.ok) throw new Error("IMAGE_GENERATION_FAILURE");
    const payload = await response.json();
    const imageUrl = payload.data?.[0]?.url || (payload.data?.[0]?.b64_json ? `data:image/png;base64,${payload.data[0].b64_json}` : "");
    if (!imageUrl) throw new Error("IMAGE_GENERATION_FAILURE");
    return { status: "ok", source: "generated", imageUrl, disclaimer: PREVIEW_DISCLAIMER };
  } catch {
    return { status: "unavailable", message: "Image generation is unavailable right now. Real product images are still available." };
  }
}

export async function generateBundlePreview(products, style, options = {}) {
  return generateShoppingBoard(products, [style], options);
}
