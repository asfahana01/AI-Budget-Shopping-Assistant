import { Router } from "express";
import multer from "multer";
import { fetchProductsFromApi } from "../services/productApi.js";
import { processProductPipeline } from "../services/dataProcessing.js";
import { optimizeBudget } from "../services/budgetOptimizer.js";
import { analyzeProductImage } from "../services/vision.js";
import { extractRequirements } from "../services/requirementExtractor.js";
import { buildRecommendation, conversationalRecommend } from "../services/recommend.js";
import { appendMessage, getSession, saveSession } from "../services/sessionStore.js";
import { chatSchema, graphQuerySchema, imagePreviewSchema, modelEvaluationSchema, optimizeSchema, recommendSchema, toolRequestSchema, validate } from "../middleware/validate.js";
import { normalizeCategory } from "../utils/normalize.js";
import { knowledgeQuerySchema } from "../middleware/validate.js";
import { fetchExternalProducts } from "../services/externalProductApi.js";
import { evaluateModels, validateModelRequest } from "../services/modelEvaluation.js";
import { answerWithRag } from "../services/rag/ragAnswer.js";
import { queryProductGraph } from "../services/graph/graphRetriever.js";
import { buildGraphContext } from "../services/graph/graphContext.js";
import { callTool } from "../mcp/server.js";
import { generateBundlePreview, resolveVerifiedProducts } from "../services/imageGeneration.js";
import { routeQuery } from "../services/queryRouter.js";
import { answerWithAdaptiveRag } from "../services/rag/adaptiveRag.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 }
});

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({ ok: true, service: "ai-budget-shopping-assistant" });
});

apiRouter.post("/knowledge/query", async (req, res, next) => {
  try {
    const body = validate(knowledgeQuerySchema, req.body);
    res.json(await answerWithRag(body.query));
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/graph/query", async (req, res, next) => {
  try {
    const body = validate(graphQuerySchema, req.body);
    const graph = await queryProductGraph(body.query);
    const names = graph.relatedProducts.slice(0, 5).map((product) => product.name);
    res.json({
      status: graph.relatedProducts.length ? "ok" : "insufficient_context",
      answer: names.length ? `Catalog relationships matched: ${names.join(", ")}.` : "I could not find matching in-stock products in the catalog graph.",
      ...graph,
      graphContext: buildGraphContext(graph)
    });
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/tools/:toolName", async (req, res, next) => {
  try {
    const body = validate(toolRequestSchema, req.body);
    const result = await callTool(req.params.toolName, body.input);
    res.status(result.ok ? 200 : result.error.code === "UNKNOWN_TOOL" ? 404 : 400).json(result);
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/generate-shopping-preview", async (req, res, next) => {
  try {
    const body = validate(imagePreviewSchema, req.body);
    const raw = await fetchProductsFromApi();
    const catalog = processProductPipeline(raw, { items: [], preferences: [] });
    const products = resolveVerifiedProducts(body.productIds, catalog.allUnique);
    res.json(await generateBundlePreview(products, body.style));
  } catch (error) {
    next(error);
  }
});

apiRouter.get("/products", async (req, res, next) => {
  try {
    const raw = await fetchProductsFromApi();
    const processed = processProductPipeline(raw, {
      items: req.query.category ? [normalizeCategory(req.query.category)] : [],
      preferences: []
    });
    res.json({
      count: processed.allRanked.length,
      pipelineStats: processed.stats,
      products: processed.allRanked
    });
  } catch (error) {
    error.message = error.message || "PRODUCT_API_FAILURE";
    next(error);
  }
});

apiRouter.get("/external-products", async (_req, res, next) => {
  try {
    const result = await fetchExternalProducts();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/evaluate/models", async (req, res, next) => {
  try {
    const body = validate(modelEvaluationSchema, req.body);
    const validation = validateModelRequest(body);
    if (!validation.ok) {
      return res.status(400).json({
        prompt: body.prompt,
        results: [],
        message: validation.message,
        requireTwoModels: validation.requireTwoModels === true
      });
    }
    const result = await evaluateModels(body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/optimize-budget", async (req, res, next) => {
  try {
    const body = validate(optimizeSchema, req.body);
    const raw = await fetchProductsFromApi();
    const processed = processProductPipeline(raw, {
      items: body.items.map(normalizeCategory),
      preferences: body.preferences || []
    });
    const result = optimizeBudget({
      products: processed.allRanked,
      items: body.items.map(normalizeCategory),
      budget: body.budget,
      preferences: body.preferences || []
    });
    res.json({ pipelineStats: processed.stats, ...result });
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/recommend", async (req, res, next) => {
  try {
    const body = validate(recommendSchema, req.body);
    const requirements = {
      budget: body.budget,
      currency: body.currency || "INR",
      items: body.items.map(normalizeCategory),
      preferences: body.preferences || []
    };
    const result = await buildRecommendation({
      requirements,
      visualContext: body.visualContext || null
    });
    const { context, ...publicResult } = result;
    res.json(publicResult);
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/chat", async (req, res, next) => {
  try {
    const body = validate(chatSchema, req.body);
    const session = await getSession(body.sessionId);
    await appendMessage(session, "user", body.message);
    const route = routeQuery(body.message);
    let result;

    if (route === "shopping") {
      const extracted = await extractRequirements(body.message, session.requirements);
      session.requirements = extracted.requirements;
      result = {
        route,
        extraction: extracted,
        ...(await conversationalRecommend({
          requirements: extracted.requirements,
          missing: extracted.missing,
          conversationHistory: session.messages,
          visualContext: session.visualContext
        }))
      };
    } else if (route === "knowledge") {
      const answer = await answerWithAdaptiveRag(body.message);
      result = { route, ...answer, assistantMessage: answer.answer };
    } else if (route === "graph") {
      const graph = await queryProductGraph(body.message);
      const extracted = await extractRequirements(body.message, session.requirements);
      session.requirements = extracted.requirements;
      if (!extracted.missing.length) {
        const recommendation = await buildRecommendation({
          requirements: extracted.requirements,
          conversationHistory: session.messages,
          visualContext: session.visualContext,
          candidateProductIds: graph.sources
        });
        result = {
          route,
          graph,
          ...recommendation,
          assistantMessage: recommendation.assistantMessage || recommendation.recommendation?.reason || recommendation.message
        };
      } else {
        const names = graph.relatedProducts.slice(0, 5).map((product) => product.name);
        result = {
          route,
          status: graph.relatedProducts.length ? "ok" : "insufficient_context",
          graph,
          assistantMessage: names.length
            ? `Related in-stock catalog products: ${names.join(", ")}.`
            : "I could not find matching in-stock products in the catalog graph."
        };
        if (extracted.missing.includes("budget")) result.assistantMessage += " Share a budget if you want me to verify a bundle total.";
      }
    } else if (route === "tool") {
      const extracted = await extractRequirements(body.message, session.requirements);
      const lower = body.message.toLowerCase();
      let toolName;
      let input;
      if (/\bget policy\b/i.test(body.message)) {
        toolName = "get_policy";
        input = { topic: body.message };
      } else if (/\b(check|verify)\b.{0,30}\bbundle\b/i.test(body.message)) {
        toolName = "check_budget_bundle";
        input = {
          budget: extracted.requirements.budget,
          items: extracted.requirements.items,
          preferences: extracted.requirements.preferences
        };
      } else if (/\b(details?|product id)\b/i.test(body.message)) {
        const productId = body.message.match(/\b[A-Z][A-Z0-9_-]{1,79}\b/i)?.[0];
        toolName = "get_product_details";
        input = { productId };
      } else {
        const searchTerms = body.message
          .replace(/\b(search|products?|show|me|find|in.stock|available|under|below|rupees?|rs\.?|inr)\b/gi, " ")
          .replace(/[₹$\d,]/g, " ").replace(/\s+/g, " ").trim();
        toolName = "search_products";
        input = {
          query: searchTerms || extracted.requirements.items.join(" "),
          category: extracted.requirements.items[0],
          maxPrice: extracted.requirements.budget || undefined,
          inStockOnly: true
        };
      }
      const tool = await callTool(toolName, input);
      const structured = tool.structuredContent;
      const names = structured?.products?.slice(0, 5).map((product) => product.name) || [];
      result = {
        route,
        toolName,
        toolResult: structured || tool.error,
        status: tool.ok ? "ok" : "error",
        assistantMessage: tool.ok
          ? names.length ? `Verified catalog results: ${names.join(", ")}.` : JSON.stringify(structured)
          : tool.error.message
      };
    } else if (route === "image_generation") {
      const extracted = await extractRequirements(body.message, session.requirements);
      const items = extracted.requirements.items;
      if (!items.length) {
        result = { route, status: "needs_clarification", assistantMessage: "Which product types should appear in the visual preview?" };
      } else {
        const raw = await fetchProductsFromApi();
        const processed = processProductPipeline(raw, extracted.requirements);
        const selected = items.map((item) => processed.allRanked.find((product) => product.category === item)).filter(Boolean);
        if (selected.length !== items.length) {
          result = { route, status: "insufficient_context", assistantMessage: "I could not find in-stock catalog products for every requested preview item." };
        } else {
          const preview = await generateBundlePreview(selected, body.message);
          result = {
            route,
            status: preview.status,
            preview,
            assistantMessage: preview.status === "ok" ? preview.disclaimer : preview.message
          };
        }
      }
    } else {
      result = {
        route,
        status: "needs_clarification",
        assistantMessage: "I can help with a shopping recommendation, a product policy or fact, a product relationship search, an in-stock product search, or a visual preview. What would you like to do?"
      };
    }

    await appendMessage(session, "assistant", result.assistantMessage || "");
    await saveSession(session);

    res.json({
      sessionId: session.sessionId,
      ...result
    });
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/analyze-image", upload.single("image"), async (req, res, next) => {
  try {
    if (!req.file) {
      const error = new Error("INVALID_IMAGE");
      throw error;
    }
    const result = await analyzeProductImage({
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
      filename: req.file.originalname
    });

    if (req.body.sessionId) {
      const session = await getSession(req.body.sessionId);
      session.visualContext = result.analysis;
      const type = result.analysis.productType;
      if (type && type !== "Unable to determine from the image.") {
        const category = normalizeCategory(type);
        if (category && !session.requirements.items.includes(category)) {
          session.requirements.items.push(category);
        }
      }
      await saveSession(session);
    }

    res.json(result);
  } catch (error) {
    if (error instanceof multer.MulterError) {
      error.message = "INVALID_IMAGE";
    }
    next(error);
  }
});
