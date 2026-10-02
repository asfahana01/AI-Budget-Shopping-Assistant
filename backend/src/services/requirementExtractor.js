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

function mergeRequirements(prior = {}, next = {}) {
  const items = [...new Set([...(prior.items || []), ...(next.items || [])].map(normalizeCategory).filter(Boolean))];
  const preferences = [...new Set([...(prior.preferences || []), ...(next.preferences || [])])];
  return {
    budget: next.budget ?? prior.budget ?? null,
    currency: next.currency || prior.currency || "INR",
    items,
    preferences
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

  const requirements = mergeRequirements(priorRequirements, mergedFromLlm);
  const missing = [];
  if (!requirements.budget) missing.push("budget");
  if (!requirements.items.length) missing.push("items");

  return {
    requirements,
    missing,
    clarificationNeeded: missing.length > 0,
    source: llmResult ? "heuristic+llm" : "heuristic"
  };
}
