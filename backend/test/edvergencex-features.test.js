import test from "node:test";
import assert from "node:assert/strict";

import { FEW_SHOT_EXTRACTION_PROMPT } from "../src/services/prompts.js";
import { extractRequirements } from "../src/services/requirementExtractor.js";
import { evaluateModels, validateModelRequest } from "../src/services/modelEvaluation.js";
import { fetchExternalProducts, normalizeExternalProduct } from "../src/services/externalProductApi.js";
import { createProtocolServer } from "../src/mcp/protocolServer.js";
import { optimizeBudget } from "../src/services/budgetOptimizer.js";
import { normalizeCategory } from "../src/utils/normalize.js";

test("few-shot prompting includes concrete shopping examples", () => {
  assert.match(FEW_SHOT_EXTRACTION_PROMPT, /Example 1:/i);
  assert.match(FEW_SHOT_EXTRACTION_PROMPT, /backpack.*headphones.*smartwatch/i);
  assert.match(FEW_SHOT_EXTRACTION_PROMPT, /college use.*good battery life/i);
});

test("requirement extraction normalizes bag and watch to backend categories", async () => {
  const result = await extractRequirements("I need a bag, headphones and a watch under 5k.");
  assert.equal(result.requirements.budget, 5000);
  assert.deepEqual(result.requirements.items, ["backpack", "headphones", "smartwatch"]);
  assert.deepEqual(result.requirements.preferences, []);
});

test("requirement extraction keeps budgets and preferences grounded in the request", async () => {
  const result = await extractRequirements("I want something for college with strong battery life.");
  assert.equal(result.requirements.budget, null);
  assert.deepEqual(result.requirements.items, []);
  assert.ok(result.requirements.preferences.includes("college use"));
  assert.ok(result.requirements.preferences.includes("good battery life"));
  assert.ok(!result.requirements.preferences.includes("laptop"));
});

test("fresh requests replace stale session requirements and preferences", async () => {
  const result = await extractRequirements("I have ₹5000. I want a perfume, bedsheet and a bottle.", {
    budget: 5000,
    currency: "INR",
    items: ["backpack", "headphones", "smartwatch"],
    preferences: ["college use"]
  });

  assert.equal(result.requirements.budget, 5000);
  assert.deepEqual(result.requirements.items, ["perfume", "bedsheet", "bottle"]);
  assert.deepEqual(result.requirements.preferences, []);
  assert.equal(result.mode, "replace");
});

test("follow-up budget messages preserve prior items without re-merging stale choices", async () => {
  const result = await extractRequirements("My budget is ₹5000.", {
    budget: 3000,
    currency: "INR",
    items: ["backpack", "headphones"],
    preferences: ["college use"]
  });

  assert.equal(result.requirements.budget, 5000);
  assert.deepEqual(result.requirements.items, ["backpack", "headphones"]);
  assert.ok(result.requirements.preferences.includes("college use"));
  assert.ok(result.requirements.preferences.includes("value for money"));
  assert.equal(result.mode, "continue");
});

test("unsupported requested categories are normalized and reported as missing", () => {
  assert.equal(normalizeCategory("bed sheet"), "bedsheet");
  assert.equal(normalizeCategory("perfume"), "perfume");

  const result = optimizeBudget({
    products: [{ category: "bottle" }],
    items: ["perfume", "bedsheet", "bottle"],
    budget: 5000,
    preferences: []
  });

  assert.equal(result.code, "NO_PRODUCTS_FOUND");
  assert.deepEqual(result.missing, ["perfume", "bedsheet"]);
  assert.deepEqual(result.availableRequestedItems, ["bottle"]);
});

test("model evaluation accepts allowlisted models and rejects others", async () => {
  const allowlist = validateModelRequest({ prompt: "Explain budget fit.", models: ["gpt-4o-mini", "another-model"] });
  assert.equal(allowlist.ok, true);
  assert.deepEqual(allowlist.models, ["gpt-4o-mini", "another-model"]);

  const rejected = validateModelRequest({ prompt: "Explain budget fit.", models: ["gpt-4o-mini", "totally-unknown-model"] });
  assert.equal(rejected.ok, false);
  assert.match(rejected.message, /not allowed/i);

  const results = await evaluateModels({ prompt: "Explain budget fit.", models: ["gpt-4o-mini"] });
  assert.equal(results.requireTwoModels, true);
  assert.match(results.message, /at least two/i);
});

test("external product normalization handles valid, invalid and duplicate data", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ([
      { productId: "X1", name: "Campus Backpack", category: "Bags", brand: "Aster", price: "₹2499", rating: 4.5, availability: "in_stock", features: ["water resistant", "college use"] },
      { productId: "X1", name: "Campus Backpack", category: "Bags", brand: "Aster", price: "₹2499", rating: 4.5, availability: "in_stock", features: ["water resistant", "college use"] },
      { productId: "X2", name: "Headset Pro", category: "Headphones", brand: "Echo", price: "bad", rating: 4.0, availability: "out_of_stock", features: ["wireless"] },
      { productId: "X3", name: "Watch Lite", category: "watch", brand: "Tempo", price: 1499, rating: 3.8, availability: "in_stock", features: ["long battery life"] }
    ])
  });

  try {
    const result = await fetchExternalProducts({ enabled: true, url: "https://example.com/products" });
    assert.equal(result.source, "external_api");
    assert.equal(result.count, 2);
    assert.equal(result.products.length, 2);
    assert.ok(result.products.every((item) => item.availability === "in_stock"));
    const categories = result.products.map((item) => item.category);
    assert.ok(categories.includes("backpack"));
    assert.ok(categories.includes("smartwatch"));
    assert.equal(new Set(categories).size, 2);
  } finally {
    global.fetch = originalFetch;
  }
});

test("external API invalid and timeout responses fail safely", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => {
    throw new Error("timeout");
  };

  try {
    const timedOut = await fetchExternalProducts({ enabled: true, url: "https://example.com/products", timeoutMs: 5 });
    assert.equal(timedOut.source, "fallback");
    assert.match(timedOut.message, /unavailable|disabled|falling back|timeout|fallback/i);
  } finally {
    global.fetch = originalFetch;
  }

  global.fetch = async () => ({
    ok: true,
    json: async () => {
      throw new Error("invalid JSON");
    }
  });

  try {
    const invalid = await fetchExternalProducts({ enabled: true, url: "https://example.com/products" });
    assert.equal(invalid.source, "fallback");
    assert.match(invalid.message, /invalid|not valid|falling back/i);
  } finally {
    global.fetch = originalFetch;
  }
});

test("protocol server exposes real MCP tool metadata and rejects invalid requests", async () => {
  const server = createProtocolServer();
  const toolNames = server.listTools().map((tool) => tool.name);
  assert.ok(toolNames.includes("search_products"));
  assert.ok(toolNames.includes("get_product_details"));
  assert.ok(toolNames.includes("check_budget_bundle"));
  assert.ok(toolNames.includes("get_policy"));

  const invalid = await server.callTool("get_product_details", { productId: "bad id" });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.error.code, "INVALID_TOOL_INPUT");
});
