import test from "node:test";
import assert from "node:assert/strict";
import { callTool } from "../src/mcp/server.js";

test("search_products returns structured catalog results", async () => {
  const response = await callTool("search_products", {
    query: "wireless headphones",
    category: "headphones",
    maxPrice: 2000,
    inStockOnly: true
  });
  assert.equal(response.ok, true);
  assert.ok(response.structuredContent.count > 0);
  assert.ok(response.structuredContent.products.every((product) => product.availability === "in_stock" && product.price <= 2000));
});

test("get_product_details safely reports an unknown product", async () => {
  const response = await callTool("get_product_details", { productId: "missing-unknown" });
  assert.equal(response.ok, true);
  assert.deepEqual(response.structuredContent, {
    found: false,
    product: null,
    message: "Product missing-unknown was not found in the catalog."
  });
});

test("check_budget_bundle never emits an over-budget combination", async () => {
  const response = await callTool("check_budget_bundle", {
    budget: 5000,
    items: ["backpack", "headphones", "smartwatch"],
    preferences: ["college use", "long battery life"]
  });
  assert.equal(response.ok, true);
  assert.ok(response.structuredContent.combinations.every((combo) => combo.totalPrice <= 5000 && combo.withinBudget));
});

test("get_policy returns knowledge sources", async () => {
  const response = await callTool("get_policy", { topic: "return policy for opened headphones" });
  assert.equal(response.ok, true);
  assert.ok(response.structuredContent.sources.some((source) => source.source === "return-policy.txt"));
});

test("tool input and execution errors are returned safely", async () => {
  const invalid = await callTool("get_product_details", { productId: "bad id" });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.error.code, "INVALID_TOOL_INPUT");
  const unknown = await callTool("not_a_tool", {});
  assert.equal(unknown.ok, false);
  assert.equal(unknown.error.code, "UNKNOWN_TOOL");
});
