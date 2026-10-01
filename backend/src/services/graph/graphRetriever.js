import { buildCatalogGraph } from "./graphBuilder.js";

function tokens(text) {
  return new Set(String(text).toLowerCase().match(/[a-z0-9]+/g) || []);
}

function nodeScore(node, queryTokens) {
  const labelTokens = tokens(node.label);
  let score = 0;
  for (const token of queryTokens) {
    if (token.length > 2 && labelTokens.has(token)) score += 1;
  }
  return score;
}

export function retrieveSubgraph(graph, query, { maxHops = 2, inStockOnly = true } = {}) {
  const queryTokens = tokens(query);
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const seedNodes = graph.nodes
    .map((node) => ({ node, score: nodeScore(node, queryTokens) }))
    .filter(({ node, score }) => score > 0 && ["category", "feature", "brand", "product"].includes(node.type))
    .sort((left, right) => right.score - left.score)
    .slice(0, 12)
    .map(({ node }) => node);

  const adjacency = new Map();
  for (const edge of graph.edges) {
    const forward = adjacency.get(edge.from) || [];
    forward.push({ id: edge.to, edge });
    adjacency.set(edge.from, forward);
    const backward = adjacency.get(edge.to) || [];
    backward.push({ id: edge.from, edge });
    adjacency.set(edge.to, backward);
  }

  const visited = new Set(seedNodes.map((node) => node.id));
  const selectedEdges = new Map();
  let frontier = seedNodes.map((node) => node.id);
  for (let hop = 0; hop < maxHops; hop += 1) {
    const next = [];
    for (const nodeId of frontier) {
      for (const adjacent of adjacency.get(nodeId) || []) {
        selectedEdges.set(`${adjacent.edge.from}|${adjacent.edge.type}|${adjacent.edge.to}`, adjacent.edge);
        if (!visited.has(adjacent.id)) {
          visited.add(adjacent.id);
          next.push(adjacent.id);
        }
      }
    }
    frontier = next;
  }

  const relatedProducts = [...visited]
    .map((id) => nodesById.get(id))
    .filter((node) => node?.type === "product")
    .filter((node) => !inStockOnly || node.data.availability === "in_stock")
    .map((node) => ({ ...node.data, graphRelevance: nodeScore(node, queryTokens) }))
    .sort((left, right) => right.graphRelevance - left.graphRelevance || left.price - right.price);

  return {
    seedNodes: seedNodes.map(({ id, type, label }) => ({ id, type, label })),
    relatedProducts,
    graphContext: [...selectedEdges.values()]
      .map((edge) => `${nodesById.get(edge.from)?.label || edge.from} ${edge.type} ${nodesById.get(edge.to)?.label || edge.to}`)
      .join("\n"),
    sources: relatedProducts.map((product) => product.productId)
  };
}

export async function queryProductGraph(query, options = {}) {
  const graph = await buildCatalogGraph();
  return retrieveSubgraph(graph, query, options);
}
