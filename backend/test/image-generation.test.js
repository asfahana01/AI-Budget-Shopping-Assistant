import test from "node:test";
import assert from "node:assert/strict";
import { fetchProductsFromApi } from "../src/services/productApi.js";
import { processProductPipeline } from "../src/services/dataProcessing.js";
import { imagePreviewSchema } from "../src/middleware/validate.js";
import {
  generateBundlePreview,
  PREVIEW_DISCLAIMER,
  resolveVerifiedProducts
} from "../src/services/imageGeneration.js";

test("missing image API key returns the safe unavailable response", async () => {
  const result = await generateBundlePreview([{ category: "backpack" }], "minimal", { apiKey: "" });
  assert.deepEqual(result, {
    status: "unavailable",
    message: "Image generation is not configured. Real product images are still available."
  });
});

test("invalid product IDs are rejected before generation", () => {
  assert.equal(imagePreviewSchema.safeParse({ productIds: ["bad id"] }).success, false);
  assert.throws(() => resolveVerifiedProducts(["P-missing"], []), { message: "INVALID_PRODUCT_ID" });
});

test("generated previews include the disclaimer and use only verified visual facts", async () => {
  let requestBody;
  const result = await generateBundlePreview(
    [{ category: "backpack", color: "green", price: 1, features: ["secret claim"] }],
    "minimal college desk setup",
    {
      apiKey: "test-key",
      baseUrl: "https://example.test/v1",
      fetchImpl: async (_url, options) => {
        requestBody = JSON.parse(options.body);
        return { ok: true, json: async () => ({ data: [{ url: "https://example.test/preview.png" }] }) };
      }
    }
  );
  assert.equal(result.source, "generated");
  assert.equal(result.disclaimer, PREVIEW_DISCLAIMER);
  assert.match(requestBody.prompt, /green/);
  assert.doesNotMatch(requestBody.prompt, /secret claim|price/i);
});

test("preview generation leaves real catalog product image URLs unchanged", async () => {
  const raw = await fetchProductsFromApi();
  const catalog = processProductPipeline(raw, { items: [], preferences: [] }).allUnique;
  const before = catalog.map(({ productId, image }) => [productId, image]);
  const selected = resolveVerifiedProducts([catalog[0].productId], catalog);
  await generateBundlePreview(selected, "minimal", { apiKey: "" });
  assert.deepEqual(catalog.map(({ productId, image }) => [productId, image]), before);
});
