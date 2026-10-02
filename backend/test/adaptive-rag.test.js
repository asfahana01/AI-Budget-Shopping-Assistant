import test from "node:test";
import assert from "node:assert/strict";
import { routeQuery } from "../src/services/queryRouter.js";
import { answerWithAdaptiveRag, retrieveWithVerification } from "../src/services/rag/adaptiveRag.js";

test("router classifies shopping, knowledge, graph, tool, image, and unknown requests", () => {
  assert.equal(routeQuery("I have ₹5000 and need a backpack"), "shopping");
  assert.equal(routeQuery("Can I return opened headphones?"), "knowledge");
  assert.equal(routeQuery("Can opened headphones be returned?"), "knowledge");
  assert.equal(routeQuery("Which wireless headphones with long battery fit with a backpack?"), "graph");
  assert.equal(routeQuery("Search in-stock headphones under ₹2000"), "tool");
  assert.equal(routeQuery("Create a visual bundle preview"), "image_generation");
  assert.equal(routeQuery("Hello there"), "unknown");
});

test("adaptive retrieval rewrites once and performs no unbounded retries", async () => {
  let calls = 0;
  const retrieve = async (query) => {
    calls += 1;
    return [];
  };
  const result = await retrieveWithVerification("How long is shipping?", { retrieve });
  assert.equal(calls, 2);
  assert.equal(result.rewritten, true);
  assert.match(result.queryUsed, /delivery timeline/);
});

test("weak retrieval returns the safe insufficient-context response", async () => {
  const result = await answerWithAdaptiveRag("unrelated question", {
    useLlm: false,
    retrieve: async () => []
  });
  assert.equal(result.status, "insufficient_context");
  assert.deepEqual(result.sources, []);
});
