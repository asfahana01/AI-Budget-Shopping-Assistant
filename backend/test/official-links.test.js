import assert from "node:assert/strict";
import test from "node:test";

import { optimizeBudget } from "../src/services/budgetOptimizer.js";
import { normalizeProducts, processProductPipeline } from "../src/services/dataProcessing.js";
import { getVerifiedShoppingLink, isSafeExternalUrl, normalizeOfficialUrl } from "../src/utils/officialLinks.js";

test("safe official URL validation accepts verified HTTPS links and rejects unsafe values", () => {
  assert.equal(isSafeExternalUrl("https://example.com/product"), true);
  assert.equal(isSafeExternalUrl("http://example.com/product"), false);
  assert.equal(isSafeExternalUrl("javascript:alert(1)"), false);
  assert.equal(isSafeExternalUrl("data:text/plain;base64,abc"), false);

  assert.equal(normalizeOfficialUrl("https://example.com/product"), "https://example.com/product");
  assert.equal(normalizeOfficialUrl("http://example.com/product"), null);
  assert.equal(normalizeOfficialUrl("javascript:alert(1)"), null);
});

test("missing official URLs are safe and kept unavailable", () => {
  const normalized = normalizeProducts([{
    productId: "P999",
    name: "Budget Pack",
    category: "backpack",
    brand: "TestBrand",
    price: 1200,
    rating: 4.2,
    availability: "in_stock",
    description: "Everyday use",
    features: ["lightweight"],
    image: "https://example.com/image.jpg"
  }]);

  assert.equal(normalized[0].officialUrl, null);
  assert.equal(normalized[0].officialUrlStatus, "unavailable");

  const pipeline = processProductPipeline([
    {
      productId: "P1000",
      name: "Campus Daily Pack",
      category: "backpack",
      brand: "TestBrand",
      price: 1200,
      rating: 4.2,
      availability: "in_stock",
      description: "Everyday use",
      features: ["lightweight"],
      image: "https://example.com/image.jpg"
    }
  ], { items: ["backpack"], preferences: [] });

  assert.equal(pipeline.products[0].officialUrl, null);
  assert.equal(pipeline.products[0].officialUrlStatus, "unavailable");
});

test("alternative combinations retain verified backend URLs", () => {
  const products = [
    {
      productId: "P901",
      name: "Campus Pack",
      category: "backpack",
      brand: "TestBrand",
      price: 1200,
      rating: 4.3,
      description: "Budget backpack",
      features: ["lightweight"],
      image: "https://example.com/backpack.jpg",
      availability: "in_stock",
      officialUrl: "https://example.com/backpack-product"
    },
    {
      productId: "P902",
      name: "Focus Headphones",
      category: "headphones",
      brand: "TestBrand",
      price: 2000,
      rating: 4.5,
      description: "Listening headphones",
      features: ["wireless"],
      image: "https://example.com/headphones.jpg",
      availability: "in_stock",
      officialUrl: "https://example.com/headphones-product"
    },
    {
      productId: "P903",
      name: "Pulse Watch",
      category: "smartwatch",
      brand: "TestBrand",
      price: 1800,
      rating: 4.4,
      description: "Smart wearable",
      features: ["fitness"],
      image: "https://example.com/watch.jpg",
      availability: "in_stock",
      officialUrl: "https://example.com/watch-product"
    }
  ];

  const result = optimizeBudget({
    products,
    items: ["backpack", "headphones", "smartwatch"],
    budget: 6000,
    preferences: []
  });

  assert.ok(result.combinations.length > 0);
  const first = result.combinations[0];
  const urls = first.products.map((product) => product.officialUrl);
  assert.deepEqual(urls, [
    "https://example.com/backpack-product",
    "https://example.com/headphones-product",
    "https://example.com/watch-product"
  ]);
  assert.ok(first.withinBudget);
  assert.ok(first.totalPrice <= 6000);
});

test("product objects preserve verified links without inventing URLs", () => {
  const product = {
    productId: "P777",
    name: "Verified Pack",
    category: "backpack",
    brand: "TestBrand",
    price: 1499,
    rating: 4.6,
    officialUrl: "https://example.com/verified/backpack"
  };

  assert.equal(getVerifiedShoppingLink(product), "https://example.com/verified/backpack");
  assert.equal(product.officialUrl, "https://example.com/verified/backpack");
});
