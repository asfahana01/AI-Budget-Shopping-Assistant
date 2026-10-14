import { CATEGORY_ALIASES, normalizeCategory } from "../utils/normalize.js";
import { extractWithLlm } from "./llm.js";

const ITEM_PATTERN = new RegExp(
  `\\b(${Object.keys(CATEGORY_ALIASES).join("|")})\\b`,
  "gi"
);

function parseBudget(text) {
  const parseNumber = (match) => {
    const value = match[1].replace(/,/g, "");
    const multiplier = ((match[2] || "").toLowerCase() === "k") ? 1000 : 1;
    return Number(value) * multiplier;
  };

  const rupee = text.match(/(?:₹|rs\.?|inr)\s*([0-9][0-9,]*)(?:\s*(k))?/i);
  const under = text.match(/\b(?:under|below|within|budget(?:\s+of)?)\s*(?:₹|rs\.?|inr)?\s*([0-9][0-9,]*)(?:\s*(k))?/i);
  const dollars = text.match(/\$\s*([0-9][0-9,]*)(?:\s*(k))?/i);
  if (rupee) return { budget: parseNumber(rupee), currency: "INR" };
  if (under) return { budget: parseNumber(under), currency: "INR" };
  if (dollars) return { budget: parseNumber(dollars), currency: "USD" };
  return { budget: null, currency: null };
}

function parseItems(text) {
  const found = [...text.matchAll(ITEM_PATTERN)].map((match) => normalizeCategory(match[1]));
  return [...new Set(found)];
}

function parsePreferences(text) {
  const prefs = [];
  const lowered = text.toLowerCase();
  const hints = [
    ["college", "college use"],
    ["campus", "college use"],
    ["battery", "good battery life"],
    ["wireless", "wireless"],
    ["anc", "noise cancellation"],
    ["quality", "good quality"],
    ["durable", "durable"],
    ["light", "lightweight"],
    ["water", "water resistant"],
    ["budget", "value for money"]
  ];
  for (const [needle, label] of hints) {
    if (lowered.includes(needle)) prefs.push(label);
  }
  return [...new Set(prefs)];
}

function detectRequestMode(message, priorRequirements = {}) {
  const text = message.toLowerCase();
  const replacementPattern = /\b(actually|instead|forget that|change it|new request|start over|something else)\b/i;
  const additivePattern = /\b(also add|additionally|include|plus|another|add one more)\b/i;
  const hasBudget = /(?:₹|rs\.?|inr|\$|\bunder\b|\bbelow\b|\bwithin\b|\bbudget\b)/i.test(text);
  const extractedItems = parseItems(message);

  if (replacementPattern.test(text)) return "replace";
  if (additivePattern.test(text)) return "add";
  if (hasBudget && extractedItems.length >= 2) return "replace";
  if (!priorRequirements?.items?.length) return "replace";
  return "continue";
}

function mergeRequirements(prior = {}, next = {}, mode = "replace") {
  const priorItems = [...new Set((prior.items || []).map(normalizeCategory).filter(Boolean))];
  const nextItems = [...new Set((next.items || []).map(normalizeCategory).filter(Boolean))];
  const priorPreferences = [...new Set((prior.preferences || []).filter(Boolean))];
  const nextPreferences = [...new Set((next.preferences || []).filter(Boolean))];

  let items = nextItems;
  if (mode === "add") {
    items = [...new Set([...priorItems, ...nextItems])];
  } else if (mode === "continue") {
    items = nextItems.length ? (priorItems.length ? priorItems : nextItems) : priorItems;
  }

  return {
    budget: next.budget ?? prior.budget ?? null,
    currency: next.currency || prior.currency || "INR",
    items,
    preferences: mode === "replace" ? nextPreferences : [...new Set([...priorPreferences, ...nextPreferences])]
  };
}

export async function extractRequirements(message, priorRequirements = {}) {
  const heuristic = {
    ...parseBudget(message),
    items: parseItems(message),
    preferences: parsePreferences(message)
  };

  const llmResult = await extractWithLlm(message, priorRequirements);
  const mergedFromLlm = llmResult
    ? {
        budget: typeof llmResult.budget === "number" ? llmResult.budget : heuristic.budget,
        currency: llmResult.currency || heuristic.currency,
        items: Array.isArray(llmResult.items) && llmResult.items.length ? llmResult.items.map(normalizeCategory) : heuristic.items,
        preferences: Array.isArray(llmResult.preferences) ? llmResult.preferences : heuristic.preferences
      }
    : heuristic;

  const mode = detectRequestMode(message, priorRequirements);
  const requirements = mergeRequirements(priorRequirements, mergedFromLlm, mode);
  const missing = [];
  if (!requirements.budget) missing.push("budget");
  if (!requirements.items.length) missing.push("items");

  return {
    requirements,
    missing,
    clarificationNeeded: missing.length > 0,
    source: llmResult ? "heuristic+llm" : "heuristic",
    mode
  };
}
