import { processProductPipeline } from "../dataProcessing.js";
import { fetchProductsFromApi } from "../productApi.js";

function slug(value) {
  return String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function buildProductGraph(rawProducts) {
  const cleaned = processProductPipeline(rawProducts, { items: [], preferences: [] });
  const nodes = new Map();
  const edges = [];
  const addNode = (node) => nodes.set(node.id, node);
  const addEdge = (from, type, to) => edges.push({ from, type, to });

  for (const product of cleaned.allUnique) {
    const productId = `product:${product.productId}`;
    addNode({ id: productId, type: "product", label: product.name, data: product });

    const relationships = [
      ["category", "BELONGS_TO", `category:${slug(product.category)}`, product.category],
      ["brand", "MADE_BY", `brand:${slug(product.brand)}`, product.brand],
      ["rating", "HAS_RATING", `rating:${product.rating}`, String(product.rating)],
      ["price", "HAS_PRICE", `price:${product.price}`, String(product.price)],
      ["availability", "HAS_AVAILABILITY", `availability:${slug(product.availability)}`, product.availability]
    ];
    for (const [type, relation, id, label] of relationships) {
      addNode({ id, type, label, data: { value: label } });
      addEdge(productId, relation, id);
    }

    for (const feature of product.features) {
      const id = `feature:${slug(feature)}`;
      addNode({ id, type: "feature", label: feature, data: { value: feature } });
      addEdge(productId, "HAS_FEATURE", id);
    }
  }

  return { nodes: [...nodes.values()], edges, productCount: cleaned.allUnique.length };
}

export async function buildCatalogGraph() {
  return buildProductGraph(await fetchProductsFromApi());
}
