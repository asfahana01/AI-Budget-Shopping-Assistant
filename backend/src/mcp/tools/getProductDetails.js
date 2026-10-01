import { fetchProductsFromApi } from "../../services/productApi.js";
import { processProductPipeline } from "../../services/dataProcessing.js";

export async function getProductDetails({ productId }) {
  const raw = await fetchProductsFromApi();
  const processed = processProductPipeline(raw, { items: [], preferences: [] });
  const product = processed.allUnique.find((item) => item.productId === productId);
  return product ? { found: true, product } : { found: false, product: null, message: `Product ${productId} was not found in the catalog.` };
}
