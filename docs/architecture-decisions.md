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

`search_products`, `get_product_details`, `check_budget_bundle`, and `get_policy` call the product API, processing pipeline, optimizer, and RAG service. This avoids a second implementation of catalog cleaning or budget arithmetic. The project contains both an internal HTTP tool adapter and a separate official MCP protocol server using stdio transport.

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

## 12. Real MCP transport is separate from the app's HTTP adapter

The internal tool adapter remains the default shopping surface for the web app and direct API callers. A separate protocol server can also be started with the official MCP SDK using stdio transport. It reuses the same catalog and optimizer logic, but it is not the production app entrypoint. This keeps the browser-facing workflow stable while exposing an independently connected MCP tool surface for compatible clients.

## 13. Few-shot prompting is a normalization aid, not a business-authority layer

The few-shot examples in `prompts.js` guide the extraction model to normalize phrases such as "bag" to `backpack`, "watch" to `smartwatch`, and "college use" to a preference string. The optimizer and the product catalog remain authoritative for budget totals, product IDs, and availability.

## 14. Model comparison is isolated from production recommendations

The `/api/evaluate/models` endpoint can compare allowlisted models on a prompt, but it never selects products, computes authoritative totals, or overrides the optimizer. It is an evaluation and learning endpoint only, and each model result is handled independently so one failure does not cancel the rest.

## 15. Public API data is optional and cannot override local inventory authority

The external product API is a demonstration layer only. It validates and normalizes external data before it is filtered by the same catalog pipeline used internally, but the verified local catalog remains the authoritative source for product IDs, prices, availability, and budget decisions. If the external provider is unavailable or malformed, the backend falls back to the existing verified catalog.

## 16. Model names are server-side allowlisted

The comparison endpoint accepts only model names listed in `MODEL_EVAL_ALLOWLIST`, so the browser cannot submit arbitrary provider names or privileged model identifiers. This keeps the server-side model pool explicit and prevents accidental or malicious exposure of hidden provider options.

## 17. Python is optional and educational only

The repository remains JavaScript/Node.js because that is the production runtime. The small Python script in `tools/` is included only as a learning demonstration of equivalent catalog-cleaning and summarization ideas; it does not participate in runtime logic, API calls, or production calculations.

## 18. Security and validation

Zod validates request bodies, product identifiers, budgets, and tool inputs. Product values are always loaded from the backend catalog. Uploaded images have size limits. Provider credentials remain in environment variables and are never passed to the browser or tool results. Provider failures return safe fallback messages rather than raw credentials or stack traces.

## 19. Official shopping links are backend-owned

The backend normalizes and validates every official product URL before it is ever returned in a recommendation or product list. This keeps storefront metadata separated from LLM-generated text and prevents browser-side code from inventing fake purchase pages. Product IDs, prices, availability, and optimizer totals remain authoritative on the server.

## 20. The LLM never writes purchase URLs

LLM explanations and chat text may describe the bundle, but they never create `officialUrl` values or modify the trusted catalog. A product page link may be shown only when the backend accepted a safe verified URL from an approved source or catalog entry, and the frontend treats all other cases as unavailable.

## 21. Undocumented Amazon cart URLs are not used

The project does not construct hidden Amazon cart URLs, product IDs, or cart automation links from local catalog IDs. Some retailer flows may require a verified product-specific page or an official shipping/cart API, but the app refuses to claim a cart operation unless a real, documented mechanism is present. The safe fallback remains a list of individual official product pages.

## 22. Alternative combinations reuse backend product objects

Alternative bundles are selected from the same backend-validated combination objects as the primary recommendation. This preserves product IDs, images, prices, ratings, availability, and `officialUrl` values, rather than reconstructing them in the browser from text fragments. The UI updates by selecting a different backend object, not by rewriting product data.

## 23. Selected alternatives remain subject to deterministic budget validation

Changing the selected bundle in the UI does not bypass the backend optimizer. The alternative payload still comes from an already validated backend combination, and each candidate must continue to satisfy `totalPrice <= budget` before it is displayed as a selectable option.

## 24. Safe fallbacks replace fake links

If the catalog does not contain a verified official URL, the app shows a clear unavailable state and the text “Official shopping link is not available for this product yet.” This meets the project requirement to avoid fake purchase links while still making the product state explicit in the interface.
