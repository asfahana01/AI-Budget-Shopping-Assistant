import { z } from "zod";
import { searchProducts } from "./tools/searchProducts.js";
import { getProductDetails } from "./tools/getProductDetails.js";
import { checkBudgetBundle } from "./tools/checkBudgetBundle.js";
import { getPolicy } from "./tools/getPolicy.js";

const productIdSchema = z.string().trim().min(1).max(80).regex(/^[a-z0-9_-]+$/i);

export const toolSchemas = {
  search_products: z.object({
    query: z.string().trim().min(1).max(200),
    category: z.string().trim().min(1).max(40).optional(),
    maxPrice: z.number().positive().max(10_000_000).optional(),
    inStockOnly: z.boolean().default(true)
  }),
  get_product_details: z.object({ productId: productIdSchema }),
  check_budget_bundle: z.object({
    budget: z.number().positive().max(10_000_000),
    items: z.array(z.string().trim().min(1).max(40)).min(1).max(8),
    preferences: z.array(z.string().trim().max(80)).max(12).default([])
  }),
  get_policy: z.object({ topic: z.string().trim().min(1).max(200) })
};

const toolHandlers = {
  search_products: searchProducts,
  get_product_details: getProductDetails,
  check_budget_bundle: checkBudgetBundle,
  get_policy: getPolicy
};

export async function callTool(name, input) {
  const schema = toolSchemas[name];
  const handler = toolHandlers[name];
  if (!schema || !handler) {
    return { ok: false, error: { code: "UNKNOWN_TOOL", message: `Unknown shopping tool: ${String(name).slice(0, 80)}.` } };
  }

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "INVALID_TOOL_INPUT",
        message: parsed.error.issues.map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`).join("; ")
      }
    };
  }

  try {
    return { ok: true, structuredContent: await handler(parsed.data) };
  } catch {
    return { ok: false, error: { code: "TOOL_FAILURE", message: "The shopping tool could not complete this request." } };
  }
}
