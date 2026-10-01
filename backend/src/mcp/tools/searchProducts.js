import { fetchProductsFromApi } from "../../services/productApi.js";
import { processProductPipeline } from "../../services/dataProcessing.js";
import { normalizeCategory } from "../../utils/normalize.js";

export async function searchProducts({ query, category, maxPrice, inStockOnly = true }) {
  const raw = await fetchProductsFromApi();
  const processed = processProductPipeline(raw, { items: [], preferences: [] });
  const source = inStockOnly ? processed.allRanked : processed.allUnique;
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const normalizedCategory = category ? normalizeCategory(category) : "";
  const products = source
    .filter((product) => !normalizedCategory || product.category === normalizedCategory)
    .filter((product) => maxPrice === undefined || product.price <= maxPrice)
    .filter((product) => {
      const text = `${product.name} ${product.brand} ${product.category} ${product.description} ${product.features.join(" ")}`.toLowerCase();
      return terms.every((term) => text.includes(term));
    });
  return { count: products.length, products };
}
