export function buildLlmContext({
  requirements,
  products,
  combinations,
  conversationHistory = [],
  visualContext = null,
  pipelineStats = null
}) {
  const history = conversationHistory
    .slice(-8)
    .filter((turn) => turn?.role && turn?.content)
    .map((turn) => ({
      role: turn.role,
      content: String(turn.content).slice(0, 600)
    }));

  return {
    user: {
      budget: requirements.budget ?? null,
      currency: requirements.currency || "INR",
      items: requirements.items || [],
      preferences: requirements.preferences || []
    },
    requirements,
    products: products.map((product) => ({
      productId: product.productId,
      name: product.name,
      category: product.category,
      brand: product.brand,
      price: product.price,
      rating: product.rating,
      features: product.features,
      description: product.description,
      availability: product.availability,
      image: product.image ? { url: product.image, available: true } : { available: false },
      relevance: product.relevance
    })),
    combinations: combinations.map((combo, index) => ({
      option: index + 1,
      totalPrice: combo.totalPrice,
      remainingBudget: combo.remainingBudget,
      rankingScore: combo.rankingScore,
      averageRating: combo.averageRating,
      productIds: combo.products.map((p) => p.productId),
      products: combo.products.map((p) => ({
        productId: p.productId,
        name: p.name,
        category: p.category,
        price: p.price,
        rating: p.rating,
        features: p.features
      }))
    })),
    visualContext,
    pipelineStats,
    conversationHistory: history
  };
}
