import { fetchProductsFromApi } from "../../services/productApi.js";
import { processProductPipeline } from "../../services/dataProcessing.js";
import { optimizeBudget } from "../../services/budgetOptimizer.js";
import { normalizeCategory } from "../../utils/normalize.js";

export async function checkBudgetBundle({ budget, items, preferences = [] }) {
  const normalizedItems = items.map(normalizeCategory);
  const raw = await fetchProductsFromApi();
  const processed = processProductPipeline(raw, { items: normalizedItems, preferences });
  const result = optimizeBudget({
    products: processed.allRanked,
    items: normalizedItems,
    budget,
    preferences
  });
  return {
    ok: result.ok,
    code: result.code,
    combinations: result.combinations,
    missing: result.missing,
    cheapestTotal: result.cheapestTotal
  };
}
