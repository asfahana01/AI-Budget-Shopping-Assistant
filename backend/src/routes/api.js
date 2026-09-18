import { Router } from "express";
import multer from "multer";
import { fetchProductsFromApi } from "../services/productApi.js";
import { processProductPipeline } from "../services/dataProcessing.js";
import { optimizeBudget } from "../services/budgetOptimizer.js";
import { analyzeProductImage } from "../services/vision.js";
import { extractRequirements } from "../services/requirementExtractor.js";
import { buildRecommendation, conversationalRecommend } from "../services/recommend.js";
import { appendMessage, getSession, saveSession } from "../services/sessionStore.js";
import { chatSchema, optimizeSchema, recommendSchema, validate } from "../middleware/validate.js";
import { normalizeCategory } from "../utils/normalize.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 }
});

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({ ok: true, service: "ai-budget-shopping-assistant" });
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
    const extracted = await extractRequirements(body.message, session.requirements);
    session.requirements = extracted.requirements;
    await appendMessage(session, "user", body.message);

    const result = await conversationalRecommend({
      requirements: extracted.requirements,
      missing: extracted.missing,
      conversationHistory: session.messages,
      visualContext: session.visualContext
    });

    await appendMessage(session, "assistant", result.assistantMessage);
    await saveSession(session);

    res.json({
      sessionId: session.sessionId,
      extraction: extracted,
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
