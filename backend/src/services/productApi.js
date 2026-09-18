import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import { Product } from "../models/Product.js";

const catalogPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../data/products.json"
);

let memoryCatalog = null;

async function loadJsonCatalog() {
  if (!memoryCatalog) {
    const raw = await readFile(catalogPath, "utf8");
    memoryCatalog = JSON.parse(raw);
  }
  return memoryCatalog;
}

export async function fetchProductsFromApi({ category, inStockOnly = false } = {}) {
  try {
    if (mongoose.connection.readyState === 1) {
      const query = {};
      if (category) query.normalizedCategory = category;
      if (inStockOnly) query.availability = "in_stock";
      const docs = await Product.find(query).lean();
      if (docs.length) return docs;
    }
  } catch {
    // Fall through to the bundled catalog.
  }

  let products = await loadJsonCatalog();
  if (category) {
    products = products.filter(
      (item) =>
        String(item.category || "").toLowerCase() === String(category).toLowerCase()
    );
  }
  return structuredClone(products);
}

export async function getCatalogSnapshot() {
  return fetchProductsFromApi();
}
