import { hasRelevantContext, answerWithRag } from "./ragAnswer.js";
import { retrieveDocuments } from "./retriever.js";

const rewriteTerms = [
  [/\bshipping\b/i, "delivery dispatch delivery timeline"],
  [/\bopened\b/i, "opened item return eligibility"],
  [/\breturns?\b/i, "return exchange return policy"],
  [/\brefunds?\b/i, "refund processing payment reversal"],
  [/\bwarrant(?:y|ies)\b/i, "warranty coverage warranty period"],
  [/\bcare\b/i, "product care instructions"]
];

export function rewriteQuery(query) {
  let rewritten = String(query || "").trim();
  for (const [pattern, expansion] of rewriteTerms) {
    if (pattern.test(rewritten)) rewritten = `${rewritten} ${expansion}`;
  }
  return rewritten;
}

export async function retrieveWithVerification(query, { retrieve = retrieveDocuments } = {}) {
  const firstPass = await retrieve(query, { topK: 4, threshold: 0.06 });
  if (hasRelevantContext(firstPass)) return { chunks: firstPass, queryUsed: query, rewritten: false };

  const rewrittenQuery = rewriteQuery(query);
  const secondPass = await retrieve(rewrittenQuery, { topK: 4, threshold: 0.06 });
  return { chunks: secondPass, queryUsed: rewrittenQuery, rewritten: true };
}

export async function answerWithAdaptiveRag(query, options = {}) {
  const retrieval = await retrieveWithVerification(query, options);
  return answerWithRag(query, { useLlm: options.useLlm, retrieval: retrieval.chunks });
}
