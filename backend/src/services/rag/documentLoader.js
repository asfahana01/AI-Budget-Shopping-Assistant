import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchProductsFromApi } from "../productApi.js";
import { processProductPipeline } from "../dataProcessing.js";

const documentsDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), "documents");

export async function loadDocuments() {
  let filenames = [];
  try {
    filenames = (await readdir(documentsDirectory)).filter((name) => name.endsWith(".txt"));
  } catch {
    // The catalog-derived facts below remain available if static documents are missing.
  }

  const documents = [];
  for (const filename of filenames) {
    try {
      const text = (await readFile(path.join(documentsDirectory, filename), "utf8")).trim();
      if (text) {
        documents.push({
          text,
          source: filename,
          documentType: filename.replace(/\.txt$/, ""),
          metadata: {}
        });
      }
    } catch {
      // Skip an unreadable source and continue with the remaining knowledge base.
    }
  }

  try {
    const rawProducts = await fetchProductsFromApi();
    const catalog = processProductPipeline(rawProducts, { items: [], preferences: [] });
    for (const product of catalog.allRanked) {
      documents.push({
        text: `${product.name}. Category: ${product.category}. Brand: ${product.brand}. Price: ${product.price}. Availability: ${product.availability}. Description: ${product.description}. Features: ${product.features.join(", ")}.`,
        source: "product-facts.txt",
        documentType: "product",
        metadata: { productId: product.productId, category: product.category }
      });
    }
  } catch {
    // Static policy sources can still answer questions when the catalog is unavailable.
  }

  return documents;
}
