import { config } from "../config.js";
import { CHAT_REPLY_PROMPT, EXTRACTION_PROMPT, SYSTEM_PROMPT, VISION_PROMPT } from "./prompts.js";

function extractJson(text) {
  if (!text) return null;
  const fenced = text.match(/```json([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

export function hasLlmKey() {
  return Boolean(config.openaiApiKey);
}

export async function callChatModel({ system, user, json = true }) {
  if (!hasLlmKey()) return null;

  const response = await fetch(`${config.openaiBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.openaiApiKey}`
    },
    body: JSON.stringify({
      model: config.openaiModel,
      temperature: 0.3,
      response_format: json ? { type: "json_object" } : undefined,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ]
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    const error = new Error("LLM_FAILURE");
    error.detail = detail.slice(0, 400);
    throw error;
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content || "";
  return json ? extractJson(content) : content;
}

export async function callVisionModel({ imageBase64, mimeType }) {
  if (!hasLlmKey()) return null;

  const response = await fetch(`${config.openaiBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.openaiApiKey}`
    },
    body: JSON.stringify({
      model: config.visionModel,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: VISION_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this product image. Do not invent hidden specs." },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`
              }
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    const error = new Error("VISION_FAILURE");
    error.detail = (await response.text()).slice(0, 400);
    throw error;
  }

  const payload = await response.json();
  return extractJson(payload.choices?.[0]?.message?.content || "");
}

export async function generateRecommendationNarrative(context) {
  const userPayload = JSON.stringify(
    {
      instruction:
        "Use only this verified backend context. Combinations were already checked against the budget.",
      context
    },
    null,
    2
  );

  try {
    const parsed = await callChatModel({
      system: SYSTEM_PROMPT,
      user: userPayload,
      json: true
    });
    if (parsed?.recommendation) return { source: "llm", data: parsed };
  } catch (error) {
    return { source: "fallback", error: error.message, data: fallbackNarrative(context) };
  }

  return { source: "fallback", data: fallbackNarrative(context) };
}

export async function generateChatReply(context, structured) {
  try {
    const text = await callChatModel({
      system: CHAT_REPLY_PROMPT,
      user: JSON.stringify({ contextSummary: context.user, structured }, null, 2),
      json: false
    });
    if (text) return text.trim();
  } catch {
    // use fallback
  }
  return structured.assistantMessage;
}

export async function extractWithLlm(message, priorRequirements) {
  try {
    return await callChatModel({
      system: EXTRACTION_PROMPT,
      user: JSON.stringify({ message, priorRequirements }),
      json: true
    });
  } catch {
    return null;
  }
}

export function fallbackNarrative(context) {
  const top = context.combinations[0];
  if (!top) {
    return {
      recommendation: {
        summary: "No verified combination fits the current budget and item list.",
        products: [],
        totalPrice: 0,
        remainingBudget: context.user.budget || 0,
        reason:
          "The backend did not find a complete set of requested products whose verified prices stay within budget."
      },
      alternatives: [],
      budgetStatus: "no_combination"
    };
  }

  const names = top.products.map((p) => p.name).join(", ");
  return {
    recommendation: {
      summary: `Recommended ${names} for a verified total of ₹${top.totalPrice}.`,
      products: top.products,
      totalPrice: top.totalPrice,
      remainingBudget: top.remainingBudget,
      reason: `This combination stays within your ₹${context.user.budget} budget, keeps an average rating of ${top.averageRating}, and matches the requested categories${
        context.user.preferences?.length ? ` while considering: ${context.user.preferences.join(", ")}` : ""
      }.`
    },
    alternatives: context.combinations.slice(1).map((combo) => ({
      summary: combo.products.map((p) => p.name).join(" + "),
      products: combo.products,
      totalPrice: combo.totalPrice,
      remainingBudget: combo.remainingBudget,
      reason: `Alternative with ranking score ${combo.rankingScore} and ₹${combo.remainingBudget} remaining.`
    })),
    budgetStatus: "within_budget"
  };
}
