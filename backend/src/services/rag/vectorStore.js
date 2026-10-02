import { embedTexts } from "./embeddings.js";

export function cosineSimilarity(left, right) {
  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length || !left.length) return 0;
    let dot = 0;
    let leftNorm = 0;
    let rightNorm = 0;
    for (let index = 0; index < left.length; index += 1) {
      dot += left[index] * right[index];
      leftNorm += left[index] * left[index];
      rightNorm += right[index] * right[index];
    }
    return leftNorm && rightNorm ? dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm)) : 0;
  }
  if (!left || !right || Array.isArray(left) || Array.isArray(right)) return 0;
  const sharedTerms = Object.keys(left).filter((term) => Object.hasOwn(right, term));
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (const value of Object.values(left)) leftNorm += value * value;
  for (const value of Object.values(right)) rightNorm += value * value;
  for (const term of sharedTerms) {
    dot += left[term] * right[term];
  }
  return leftNorm && rightNorm ? dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm)) : 0;
}

export async function createVectorIndex(chunks) {
  const vectors = await embedTexts(chunks.map((chunk) => chunk.text));
  return chunks.map((chunk, index) => ({ ...chunk, embedding: vectors[index] }));
}

export function preferredKnowledgeSource(query) {
  const text = String(query).toLowerCase();
  if (/\b(refund|money back|inspection|payment reversal)\b/.test(text)) return "refund-policy.txt";
  if (/\b(warranty|manufacturer|coverage|claim)\b/.test(text)) return "warranty-policy.txt";
  if (/\b(return|returns|returned|opened|unused|packaging|exchange)\b/.test(text)) return "return-policy.txt";
  if (/\b(delivery|shipping|dispatch|arrival|ship)\b/.test(text)) return "delivery-policy.txt";
  if (/\b(product facts?|features?|price|availability|in.stock|catalog)\b/.test(text)) return "product-facts.txt";
  return null;
}

function rankingAdjustment(source, preferredSource) {
  if (!preferredSource) return 0;
  if (source === preferredSource) return 0.3;
  if (/^(return|refund|warranty|delivery)-policy\.txt$/.test(source)) return -0.12;
  return -0.04;
}

export async function searchVectorIndex(index, query, { topK = 4, threshold = 0.06, embedding = null } = {}) {
  const [queryVector] = embedding ? [embedding] : await embedTexts([query]);
  const preferredSource = preferredKnowledgeSource(query);
  return index
    .map((chunk) => {
      const score = cosineSimilarity(queryVector, chunk.embedding);
      return { ...chunk, score, rankingScore: score + rankingAdjustment(chunk.source, preferredSource) };
    })
    .filter((chunk) => chunk.score >= threshold)
    .sort((left, right) => right.rankingScore - left.rankingScore || right.score - left.score)
    .slice(0, topK);
}
