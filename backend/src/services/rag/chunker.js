export function chunkDocuments(documents, { chunkSize = 600, overlap = 80 } = {}) {
  const chunks = [];
  for (const document of documents) {
    const text = String(document.text || "").trim();
    if (!text) continue;
    let start = 0;
    let index = 0;
    while (start < text.length) {
      let end = Math.min(start + chunkSize, text.length);
      if (end < text.length) {
        const boundary = text.lastIndexOf(" ", end);
        if (boundary > start) end = boundary;
      }
      const chunkText = text.slice(start, end).trim();
      if (chunkText) {
        chunks.push({
          id: `${document.source}-${document.metadata?.productId || "document"}-${index}`,
          text: chunkText,
          source: document.source,
          documentType: document.documentType,
          metadata: document.metadata || {}
        });
      }
      if (end >= text.length) break;
      start = Math.max(start + 1, end - overlap);
      index += 1;
    }
  }
  return chunks;
}
