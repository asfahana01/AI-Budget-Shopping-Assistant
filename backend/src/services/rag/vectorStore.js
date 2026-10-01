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

export async function createVectorIndex(chunks, { useRemote = true } = {}) {
  const vectors = useRemote
    ? await embedTexts(chunks.map((chunk) => chunk.text))
    : await embedTexts(chunks.map((chunk) => chunk.text));
  return chunks.map((chunk, index) => ({ ...chunk, embedding: vectors[index] }));
}

export async function searchVectorIndex(index, query, { topK = 4, threshold = 0.06, embedding = null } = {}) {
  const [queryVector] = embedding ? [embedding] : await embedTexts([query]);
  return index
    .map((chunk) => ({ ...chunk, score: cosineSimilarity(queryVector, chunk.embedding) }))
    .filter((chunk) => chunk.score >= threshold)
    .sort((left, right) => right.score - left.score)
    .slice(0, topK);
}
