import { chunkDocuments } from "./chunker.js";
import { loadDocuments } from "./documentLoader.js";
import { createVectorIndex, searchVectorIndex } from "./vectorStore.js";

let indexPromise;

export async function getKnowledgeIndex({ refresh = false } = {}) {
  if (refresh || !indexPromise) {
    indexPromise = loadDocuments()
      .then((documents) => chunkDocuments(documents))
      .then((chunks) => createVectorIndex(chunks));
  }
  return indexPromise;
}

export async function retrieveDocuments(query, options = {}) {
  const index = await getKnowledgeIndex();
  return searchVectorIndex(index, query, options);
}

export function resetKnowledgeIndex() {
  indexPromise = undefined;
}
