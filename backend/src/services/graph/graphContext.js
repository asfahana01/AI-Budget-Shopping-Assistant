export function buildGraphContext(result) {
  const productLines = result.relatedProducts.map((product) =>
    `${product.productId}: ${product.name} (${product.category}); catalog-listed features: ${product.features.join(", ") || "none"}; availability: ${product.availability}.`
  );
  return [result.graphContext, ...productLines].filter(Boolean).join("\n");
}
