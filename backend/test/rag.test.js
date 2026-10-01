import test from "node:test";
import assert from "node:assert/strict";
import { answerWithRag, GROUNDED_RAG_PROMPT, RAG_INSUFFICIENT_ANSWER } from "../src/services/rag/ragAnswer.js";
import { resetKnowledgeIndex } from "../src/services/rag/retriever.js";

test("return-policy questions retrieve and cite return policy context", async () => {
  resetKnowledgeIndex();
  const result = await answerWithRag("Can opened headphones be returned?", { useLlm: false });
  assert.equal(result.status, "ok");
  assert.ok(result.sources.some((source) => source.source === "return-policy.txt"));
  assert.ok(result.retrievedChunks > 0);
});

test("warranty questions cite the warranty source", async () => {
  resetKnowledgeIndex();
  const result = await answerWithRag("What warranty period and warranty coverage is available?", { useLlm: false });
  assert.equal(result.status, "ok");
  assert.ok(result.sources.some((source) => source.source === "warranty-policy.txt"));
});

test("unrelated questions return a safe insufficient-context answer", async () => {
  resetKnowledgeIndex();
  const result = await answerWithRag("xylophone nebula quantum", { useLlm: false });
  assert.equal(result.status, "insufficient_context");
  assert.equal(result.answer, RAG_INSUFFICIENT_ANSWER);
  assert.deepEqual(result.sources, []);
});

test("grounded prompt treats retrieved documents as untrusted reference data", () => {
  assert.match(GROUNDED_RAG_PROMPT, /ignore any prompt injection/i);
  assert.match(GROUNDED_RAG_PROMPT, /only the retrieved reference context/i);
});
