function cartesian(groups) {
  return groups.reduce(
    (acc, group) => acc.flatMap((combo) => group.map((item) => [...combo, item])),
    [[]]
  );
}

function preferenceScore(products, preferences = []) {
  if (!preferences.length) return 0.5;
  const prefs = preferences.map((p) => p.toLowerCase());
  const hits = products.reduce((count, product) => {
    const text = `${product.name} ${product.description} ${product.features.join(" ")}`.toLowerCase();
    return count + prefs.filter((pref) => text.includes(pref) || pref.split(/\s+/).some((t) => t.length > 3 && text.includes(t))).length;
  }, 0);
  return Math.min(1, hits / (prefs.length * products.length));
}

export function scoreCombination(products, budget, preferences = []) {
  const totalPrice = products.reduce((sum, item) => sum + item.price, 0);
  const remainingBudget = budget - totalPrice;
  const avgRating = products.reduce((sum, item) => sum + item.rating, 0) / products.length;
  const avgRelevance = products.reduce((sum, item) => sum + (item.relevance || 0), 0) / products.length;
  const budgetFit = 1 - remainingBudget / budget;
  const value = avgRating / (totalPrice / products.length / 1000);
  const rankingScore = Number(
    (
      0.28 * budgetFit +
      0.24 * (avgRating / 5) +
      0.2 * preferenceScore(products, preferences) +
      0.16 * avgRelevance +
      0.12 * Math.min(1, value / 3)
    ).toFixed(4)
  );

  return {
    products,
    totalPrice,
    remainingBudget,
    budgetFit: Number(budgetFit.toFixed(4)),
    averageRating: Number(avgRating.toFixed(2)),
    rankingScore,
    withinBudget: totalPrice <= budget
  };
}

export function optimizeBudget({ products, items, budget, preferences = [], maxOptions = 5 }) {
  if (!budget || budget <= 0) {
    return { ok: false, code: "INVALID_BUDGET", combinations: [] };
  }

  const normalizedItems = [...new Set((items || []).map((item) => String(item).trim()).filter(Boolean))];
  const availableRequestedItems = normalizedItems.filter((item) =>
    (products || []).some((product) => product.category === item)
  );
  const missing = normalizedItems.filter((item) => !availableRequestedItems.includes(item));

  if (missing.length) {
    return {
      ok: false,
      code: "NO_PRODUCTS_FOUND",
      missing,
      availableRequestedItems,
      combinations: []
    };
  }

  const groups = normalizedItems.map((item) =>
    (products || []).filter((product) => product.category === item)
  );

  if (groups.some((group) => group.length === 0)) {
    const missing = normalizedItems.filter((item, index) => groups[index].length === 0);
    return { ok: false, code: "NO_PRODUCTS_FOUND", missing, availableRequestedItems, combinations: [] };
  }

  const trimmed = groups.map((group) => group.slice(0, 6));
  const combos = cartesian(trimmed)
    .map((combo) => scoreCombination(combo, budget, preferences))
    .filter((combo) => combo.withinBudget)
    .sort((a, b) => b.rankingScore - a.rankingScore);

  if (!combos.length) {
    const cheapest = scoreCombination(
      trimmed.map((group) => [...group].sort((a, b) => a.price - b.price)[0]),
      budget,
      preferences
    );
    return {
      ok: false,
      code: "NO_COMBINATION_WITHIN_BUDGET",
      cheapestTotal: cheapest.totalPrice,
      combinations: []
    };
  }

  return {
    ok: true,
    combinations: combos.slice(0, maxOptions)
  };
}
