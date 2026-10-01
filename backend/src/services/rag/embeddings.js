import { config } from "../../config.js";

const ignoredTokens = new Set(["about", "after", "does", "have", "into", "that", "this", "what", "when", "which", "with", "would", "your"]);

export function localEmbedding(text) {
  const vector = {};
  const tokens = String(text).toLowerCase().match(/[a-z0-9]+/g) || [];
  for (const token of tokens) {
    if (token.length < 2 || ignoredTokens.has(token)) continue;
    vector[token] = (vector[token] || 0) + 1;
  }
  return vector;
}

export async function embedTexts(texts) {
  if (!config.openaiApiKey || !texts.length) return texts.map(localEmbedding);
  try {
    const response = await fetch(`${config.openaiBaseUrl}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.openaiApiKey}`
      },
      body: JSON.stringify({ model: config.embeddingModel, input: texts })
    });
    if (!response.ok) return texts.map(localEmbedding);
    const payload = await response.json();
    const vectors = (payload.data || []).sort((a, b) => a.index - b.index).map((item) => item.embedding);
    return vectors.length === texts.length ? vectors : texts.map(localEmbedding);
  } catch {
    return texts.map(localEmbedding);
  }
}
