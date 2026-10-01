import { answerWithAdaptiveRag } from "../../services/rag/adaptiveRag.js";

export async function getPolicy({ topic }) {
  const result = await answerWithAdaptiveRag(topic);
  return { answer: result.answer, sources: result.sources, status: result.status };
}
