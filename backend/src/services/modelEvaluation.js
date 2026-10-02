import { config } from "../config.js";
import { callChatModel, hasLlmKey } from "./llm.js";

export function getModelAllowlist() {
  return [...new Set((config.modelEvalAllowlist || []).map((model) => String(model).trim().toLowerCase()).filter(Boolean))];
}

export function validateModelRequest({ prompt, models }) {
  if (typeof prompt !== "string" || !prompt.trim()) {
    return { ok: false, message: "A prompt is required for model comparison.", requireTwoModels: false };
  }

  const allowlist = getModelAllowlist();
  if (!allowlist.length) {
    return { ok: false, message: "No comparison models are configured on the server.", requireTwoModels: true };
  }

  if (!Array.isArray(models) || models.length < 2) {
    return { ok: false, message: "Comparison requires at least two configured models.", requireTwoModels: true };
  }

  const normalized = [];
  const invalid = [];
  for (const model of models) {
    const value = String(model).trim();
    if (!value) continue;
    if (allowlist.includes(value.toLowerCase())) {
      normalized.push(value);
    } else {
      invalid.push(value);
    }
  }

  if (invalid.length) {
    return { ok: false, message: `Model(s) not allowed: ${invalid.join(", ")}.`, requireTwoModels: false };
  }

  const unique = [...new Set(normalized)];
  if (unique.length < 2) {
    return { ok: false, message: "Comparison requires at least two configured models.", requireTwoModels: true };
  }

  return { ok: true, models: unique, requireTwoModels: false };
}

export async function evaluateModels({ prompt, models }) {
  const validation = validateModelRequest({ prompt, models });
  if (!validation.ok) {
    return {
      prompt,
      results: [],
      message: validation.message,
      requireTwoModels: validation.requireTwoModels === true
    };
  }

  const results = [];
  for (const model of validation.models) {
    try {
      if (!hasLlmKey()) {
        results.push({ model, status: "error", message: "Model unavailable." });
        continue;
      }

      const output = await callChatModel({
        system: "You are a safe evaluator for a shopping assistant. Explain the supplied prompt without inventing authoritative shopping facts, prices, or product totals.",
        user: JSON.stringify({ prompt }, null, 2),
        json: false,
        model,
        temperature: 0.2
      });

      results.push({
        model,
        status: output ? "ok" : "error",
        output: output || "",
        message: output ? undefined : "Model unavailable."
      });
    } catch {
      results.push({ model, status: "error", message: "Model unavailable." });
    }
  }

  return {
    prompt,
    results,
    message: results.some((item) => item.status === "ok")
      ? "Model comparison completed."
      : "All configured comparison models were unavailable.",
    requireTwoModels: false
  };
}
