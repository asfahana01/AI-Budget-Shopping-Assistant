const patterns = {
  image_generation: /\b(generate|create|make|show)\b.{0,50}\b(image|visual|preview|mood board|shopping board)\b|\b(bundle preview|mood board|shopping board)\b/i,
  graph: /\b(compatible with|related to|best combination of features|connected requirements|which\b.{0,120}\b(?:have|has|include|offer|satisfy|with|fit))\b/i,
  tool: /\b(search products?|search\b.{0,100}\b(?:products?|in.stock|available|headphones?|backpacks?|smartwatches?)|get details? for|product details?|get policy|check (?:this |the )?bundle|show (?:me )?(?:in.stock|available) items?)\b/i,
  knowledge: /\b(return|refund|warranty|delivery|shipping|exchange|care instructions?|compatible|compatibility|does .{1,80} have|what (?:is|are) .{1,80}(?:policy|warranty|delivery))\b/i,
  shopping: /\b(recommend|buy|purchase|i need|i want|i have\s+(?:₹|rs\.?\s*)\d|\bneed(?: a| an)?\b|looking for|shopping list|my budget|budget is|under ₹?\s*\d|under rs\.?\s*\d)\b/i
};

export function routeQuery(query) {
  const text = String(query || "").trim();
  if (!text) return "unknown";
  for (const route of ["image_generation", "graph", "tool", "knowledge", "shopping"]) {
    if (patterns[route].test(text)) return route;
  }
  return "unknown";
}
