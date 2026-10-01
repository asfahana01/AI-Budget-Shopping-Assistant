export const CATEGORY_ALIASES = {
  backpack: "backpack",
  backpacks: "backpack",
  bag: "backpack",
  bags: "backpack",
  rucksack: "backpack",
  headphones: "headphones",
  headphone: "headphones",
  earphones: "headphones",
  earbuds: "headphones",
  headset: "headphones",
  smartwatch: "smartwatch",
  smartwatches: "smartwatch",
  watch: "smartwatch",
  watches: "smartwatch",
  fitnessband: "smartwatch",
  band: "smartwatch",
  notebook: "notebook",
  notebooks: "notebook",
  bottle: "bottle",
  bottles: "bottle",
  mouse: "mouse",
  mice: "mouse"
};

export const CATEGORY_KEYWORDS = Object.keys(CATEGORY_ALIASES);

export function normalizeCategory(value) {
  if (!value) return "";
  const key = String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
  return CATEGORY_ALIASES[key] || key;
}

export function normalizePrice(value) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.]/g, "");
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed) && parsed > 0) return Math.round(parsed);
  }
  return null;
}

export function normalizeRating(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(5, Math.max(0, Number(value.toFixed(1))));
  }
  return 0;
}

export function formatInr(amount) {
  return `₹${Math.round(Number(amount) || 0)}`;
}
