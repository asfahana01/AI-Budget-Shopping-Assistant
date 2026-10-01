import test from "node:test";
import assert from "node:assert/strict";
import { fetchProductsFromApi } from "../src/services/productApi.js";
import { optimizeBudget } from "../src/services/budgetOptimizer.js";
import { buildProductGraph } from "../src/services/graph/graphBuilder.js";
import { queryProductGraph } from "../src/services/graph/graphRetriever.js";

test("catalog graph contains product and feature nodes", async () => {
  const graph = buildProductGraph(await fetchProductsFromApi());
  assert.ok(graph.nodes.some((node) => node.id === "product:P105"));
  assert.ok(graph.nodes.some((node) => node.type === "feature" && /water resistant/i.test(node.label)));
  assert.ok(graph.edges.some((edge) => edge.from === "product:P105" && edge.type === "HAS_FEATURE"));
});

test("feature graph retrieval returns connected in-stock products", async () => {
  const result = await queryProductGraph("water resistant backpack");
  assert.ok(result.seedNodes.length > 0);
  assert.ok(result.relatedProducts.some((product) => product.productId === "P105"));
  assert.ok(result.sources.includes("P105"));
});

test("out-of-stock products are excluded from graph candidates", async () => {
  const result = await queryProductGraph("water resistant backpack");
  assert.ok(!result.relatedProducts.some((product) => product.productId === "P108"));
});

test("graph candidates still use the deterministic optimizer for budget totals", async () => {
  const graph = await queryProductGraph("wireless headphones battery");
  const result = optimizeBudget({ products: graph.relatedProducts, items: ["headphones"], budget: 2000 });
  assert.equal(result.ok, true);
  assert.ok(result.combinations.every((combo) => combo.totalPrice <= 2000 && combo.withinBudget));
});
