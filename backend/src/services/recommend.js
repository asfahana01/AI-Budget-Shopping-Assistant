import { processProductPipeline } from "./dataProcessing.js";
import { optimizeBudget } from "./budgetOptimizer.js";
import { buildLlmContext } from "./contextBuilder.js";
import { generateChatReply, generateRecommendationNarrative } from "./llm.js";
import { fetchProductsFromApi } from "./productApi.js";
import { formatInr } from "../utils/normalize.js";

function clarificationMessage(missing, requirements) {
  if (missing.includes("budget") && missing.includes("items")) {
    return "I can help you shop within a budget. What is your budget, and which products do you need?";
  }
  if (missing.includes("budget")) {
    return `I noted you need ${requirements.items.join(", ")}. What is your budget?`;
  }
  return "What would you like to buy? For example: backpack, headphones, and a smartwatch.";
}

function noComboMessage(budget, optimization) {
  const extra = optimization.cheapestTotal
    ? ` The cheapest complete set I can form is about ${formatInr(optimization.cheapestTotal)}.`
    : "";
  return `I couldn't find a combination that includes all requested products within ${formatInr(budget)}.${extra}

You could:
1. Increase your budget
2. Remove one product
3. Choose lower-priced alternatives.`;
}

function publicPayload(result) {
  const { context, ...rest } = result;
  return rest;
}

export async function buildRecommendation({ requirements, conversationHistory = [], visualContext = null, candidateProductIds = null }) {
  if (!requirements.budget || requirements.budget <= 0) {
    return {
      status: "needs_clarification",
      code: "MISSING_BUDGET",
      message: "Please share a valid budget so I can keep the total within it."
    };
  }
  if (!requirements.items?.length) {
    return {
      status: "needs_clarification",
      code: "MISSING_ITEMS",
      message: "Which products should I include in the shopping list?"
    };
  }

  const raw = await fetchProductsFromApi();
  const processed = processProductPipeline(raw, requirements, visualContext);
  const candidates = candidateProductIds
    ? processed.allRanked.filter((product) => candidateProductIds.includes(product.productId))
    : processed.allRanked;
  const optimization = optimizeBudget({
    products: candidates,
    items: requirements.items,
    budget: requirements.budget,
    preferences: requirements.preferences
  });

  const context = buildLlmContext({
    requirements,
    products: candidateProductIds ? candidates.slice(0, 18) : processed.products,
    combinations: optimization.combinations,
    conversationHistory,
    visualContext,
    pipelineStats: processed.stats
  });

  if (!optimization.ok) {
    const message =
      optimization.code === "NO_PRODUCTS_FOUND"
        ? `I could not find in-stock products for: ${(optimization.missing || []).join(", ")}.`
        : noComboMessage(requirements.budget, optimization);

    const narrative = await generateRecommendationNarrative(context);
    return {
      status: "error",
      code: optimization.code,
      message,
      pipelineStats: processed.stats,
      products: processed.products,
      combinations: [],
      narrative: narrative.data,
      llmSource: narrative.source,
      context
    };
  }

  const narrative = await generateRecommendationNarrative(context);
  const rec = narrative.data.recommendation;
  const top = optimization.combinations[0];

  return {
    status: "ok",
    pipelineStats: processed.stats,
    products: processed.products,
    combinations: optimization.combinations,
    recommendation: {
      ...rec,
      products: top.products,
      totalPrice: top.totalPrice,
      remainingBudget: top.remainingBudget
    },
    alternatives: optimization.combinations.slice(1),
    narrative: narrative.data,
    llmSource: narrative.source,
    context
  };
}

export async function conversationalRecommend({ requirements, missing, conversationHistory, visualContext }) {
  if (missing.length) {
    return {
      status: "needs_clarification",
      missing,
      requirements,
      assistantMessage: clarificationMessage(missing, requirements)
    };
  }

  const userTurns = (conversationHistory || []).filter((m) => m.role === "user").length;
  if (!requirements.preferences?.length && userTurns <= 2) {
    return {
      status: "needs_clarification",
      missing: ["preferences"],
      requirements,
      assistantMessage:
        "Got it. Do you have any preferences? For example college use, long battery life, or wireless audio."
    };
  }

  const result = await buildRecommendation({
    requirements,
    conversationHistory,
    visualContext
  });

  if (result.status !== "ok") {
    return {
      ...publicPayload(result),
      requirements,
      assistantMessage: result.message
    };
  }

  const assistantMessage = await generateChatReply(result.context, {
    assistantMessage: result.recommendation.reason,
    recommendation: result.recommendation
  });

  return {
    ...publicPayload(result),
    requirements,
    assistantMessage
  };
}
