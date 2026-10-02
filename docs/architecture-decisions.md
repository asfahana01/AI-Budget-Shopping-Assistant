# Architecture Decisions

## 1. Deterministic prices and totals

Catalog values are loaded and normalized by backend services. `budgetOptimizer.js` creates combinations and calculates totals and remaining budget. LLM output is restricted to explanations and cannot change product IDs, prices, availability, or arithmetic.

## 2. RAG for policy and factual information

RAG retrieves source chunks for policy and catalog-fact questions and returns source names and similarity scores. This keeps answer generation tied to available reference material rather than model memory.

## 3. Unknown knowledge returns insufficient context

If retrieval does not meet the existing similarity threshold, the API returns a fixed insufficient-context response and no citations. It does not ask an LLM to fill evidence gaps.

## 4. Graph built from the cleaned product catalog

The graph builder reuses product validation and normalization. It models catalog products and explicitly supplied category, feature, brand, rating, price, and availability relationships; it does not replace the product database or assert undocumented relationships.

## 5. Graph candidates pass through the budget optimizer

Graph retrieval identifies candidate product IDs only. The normal product pipeline re-loads backend catalog values and the existing optimizer validates requested categories, stock, totals, and budget fit.

## 6. Tools reuse existing services

`search_products`, `get_product_details`, `check_budget_bundle`, and `get_policy` call the product API, processing pipeline, optimizer, and RAG service. This avoids a second implementation of catalog cleaning or budget arithmetic. The current MCP layer is an internal validated adapter exposed over HTTP, not a protocol-speaking MCP server.

## 7. Generated images are previews

Image generation receives only verified product categories, known colors, and user style preferences. Results are labeled `AI-generated visual preview — not the actual product.` They are never presented as evidence of exact appearance or specifications.

## 8. Real catalog images are never overwritten

Preview generation creates a separate generated image URL. The product pipeline and bundled catalog image fields remain unchanged; actual product cards continue using catalog images.

## 9. Local fallback embeddings

When no embeddings API key is configured, the retriever uses deterministic sparse token vectors and cosine similarity. When a key is configured, it can use the compatible embeddings API and falls back locally on provider failure. Topic-aware source ranking improves policy routing while the raw similarity score remains available.

## 10. Unsupported policy details are not invented

The repository does not contain retailer return, warranty, refund, or delivery terms. Source documents state which details are absent, and grounded answers report them as unavailable. Real retailer terms must be supplied as approved documents before the assistant can state them.

## 11. Session memory is limited

Sessions retain requirements and a rolling window of at most 20 messages. The bounded history supports follow-up questions while limiting stored conversation data and payload size. MongoDB persistence is optional; otherwise sessions live in process memory.

## 12. Security and validation

Zod validates request bodies, product identifiers, budgets, and tool inputs. Product values are always loaded from the backend catalog. Uploaded images have size limits. Provider credentials remain in environment variables and are never passed to the browser or tool results. Provider failures return safe fallback messages rather than raw credentials or stack traces.
