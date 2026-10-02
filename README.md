# AI Budget Shopping Assistant

A React + Vite shopping assistant backed by Express. Catalog facts and shopping arithmetic stay in deterministic backend services; optional language and image models explain verified results or create illustrative previews.

## Architecture

```mermaid
flowchart TD
  UI[React chat and catalog] --> API[Express API and Zod validation]
  API --> Router[Adaptive query router]
  Router --> Shopping[Shopping workflow]
  Shopping --> Catalog[Product API: MongoDB or JSON]
  Catalog --> Clean[Validation, normalization, availability, ranking]
  Clean --> Optimizer[Deterministic budget optimizer]
  Optimizer --> Explain[Optional LLM explanation]
  Router --> RAG[Basic and Adaptive RAG]
  RAG --> Docs[Policy documents and catalog facts]
  Docs --> Chunks[Chunking and embeddings]
  Chunks --> Search[Similarity retrieval and source verification]
  Search --> Grounded[Grounded answer and citations]
  Router --> Graph[Graph RAG]
  Graph --> CatalogGraph[Catalog product/category/feature graph]
  CatalogGraph --> Candidates[Graph candidates]
  Candidates --> Optimizer
  Router --> Tools[Internal MCP-style tool adapter]
  Tools --> Catalog
  Tools --> Optimizer
  Tools --> RAG
  Router --> Image[Optional image preview generation]
```

The project keeps two distinct tool surfaces:

- Internal HTTP tool adapter: validated JSON tools that power the frontend and the app's in-process shopping workflow.
- Real MCP protocol server: an optional stdio-based protocol server implemented with the official MCP SDK and started separately via `npm run mcp --prefix backend`.

The internal adapter remains the supported app entrypoint, while the protocol server is intentionally isolated for MCP clients and evaluation use.

## Responsibility Boundaries

| Component | Responsibility |
| --- | --- |
| Product API | Load the verified catalog from MongoDB or bundled JSON. |
| Data pipeline | Validate, clean, normalize, deduplicate, filter, and rank products. |
| Budget optimizer | Select combinations and calculate verified totals and remaining budget. |
| Basic RAG | Retrieve policy and product-fact chunks and cite their sources. |
| Adaptive RAG | Route requests, verify retrieval strength, and allow at most one rewrite. |
| Graph RAG | Find catalog relationships and candidate products; it does not calculate totals. |
| Tool adapter | Run validated structured catalog, budget, and policy operations. |
| Image generation | Optionally create a conceptual visual preview from verified categories and known colors. |
| LLM | Explain verified results; it does not own product IDs, features, availability, policies, or arithmetic. |

## API

All paths below are relative to `/api`. The API key column describes whether the endpoint needs an external provider; the server itself runs without one.

| Method and path | Purpose and request example | Response summary | API key |
| --- | --- | --- | --- |
| `GET /api/health` | Liveness check; no body. | `{ "ok": true, "service": "ai-budget-shopping-assistant" }` | No |
| `GET /api/products` | Read cleaned in-stock catalog; optional `?category=headphones`. | Count, pipeline stats, and product objects. | No |
| `POST /api/chat` | `{"sessionId":"session-1234","message":"I have ₹5000 and need a backpack and headphones"}` | Routed shopping, knowledge, graph, tool, preview, or clarification response. | No; optional for model explanations |
| `POST /api/recommend` | `{"budget":5000,"items":["backpack","headphones"],"preferences":["college use"]}` | Verified products, optimizer combinations, totals, explanation. | No; optional for explanation |
| `POST /api/optimize-budget` | `{"budget":5000,"items":["backpack","headphones"]}` | Optimizer combinations and pipeline stats; no LLM. | No |
| `POST /api/analyze-image` | Multipart form with `image` file and optional `sessionId`. | Visible product description and conservative image analysis. | Optional; no-key fallback is available |
| `POST /api/knowledge/query` | `{"query":"Can opened headphones be returned?"}` | Grounded answer, source names/scores, retrieved chunk count, or insufficient context. | No; optional for generated answer wording |
| `POST /api/graph/query` | `{"query":"Which in-stock backpacks are water resistant?"}` | Related products, seed nodes, graph context, and source product IDs. | No |
| `POST /api/tools/:toolName` | Example: `/api/tools/search_products` with `{"input":{"query":"wireless headphones","category":"headphones","maxPrice":2000,"inStockOnly":true}}` | Structured tool result or safe structured error. | No; `get_policy` may use an optional LLM |
| `POST /api/evaluate/models` | `{"prompt":"Explain why this verified bundle fits the budget.","models":["gpt-4o-mini","another-model"]}` | Structured comparison results for allowlisted models; failures are isolated per model. | Optional; model names are server-side allowlisted |
| `GET /api/external-products` | Optional public product JSON enrichment demo. | Normalized external-product result with fallback-safe message, count, and pipeline stats. | No; server-side provider settings only |
| `POST /api/generate-shopping-preview` | `{"productIds":["P105","P201"],"style":"minimal college desk setup"}` | Generated URL and the preview disclaimer, or safe unavailable response. | Optional; generation requires configured image access |

Other tool names are `get_product_details`, `check_budget_bundle`, and `get_policy`. Inputs are validated by Zod. For example:

```json
{"input":{"productId":"P201"}}
```

```json
{"input":{"budget":5000,"items":["backpack","headphones"],"preferences":["college use"]}}
```

### Chat Routing Examples

- `I have ₹5000 and need a backpack and headphones` follows the existing extraction, catalog, optimizer, and explanation flow.
- `Can opened headphones be returned?` uses Adaptive RAG and cites the return source.
- `Which wireless headphones with long battery life fit with a college backpack under ₹5000?` uses graph candidates, then the deterministic optimizer verifies the requested combination.
- `Search in-stock wireless headphones under ₹2000` invokes the catalog search tool.
- `Create a visual preview of my backpack and headphones` uses the optional image preview service.
- Unclear requests receive a clarification rather than an invented answer.

## Environment

Create `backend/.env` as needed. Never commit provider credentials.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | Express listen port. |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | CORS origin. |
| `MONGODB_URI` | empty | Optional MongoDB connection. |
| `OPENAI_API_KEY` | empty | Optional OpenAI-compatible chat, embedding, vision, and image-generation access. |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | Compatible provider base URL. |
| `OPENAI_MODEL` | `gpt-4o-mini` | Chat model. |
| `EMBEDDING_MODEL` | `text-embedding-3-small` | Embeddings model. |
| `VISION_MODEL` | `OPENAI_MODEL` or `gpt-4o-mini` | Vision model. |
| `OPENAI_IMAGE_MODEL` | `gpt-image-1` | Image-generation model. |
| `MODEL_EVAL_ALLOWLIST` | `gpt-4o-mini,another-model` | Allowed model names for the isolated evaluation endpoint. |
| `EXTERNAL_PRODUCT_API_URL` | empty | Optional public product JSON enrichment endpoint. |
| `EXTERNAL_PRODUCT_API_ENABLED` | `false` | Enables the optional external enrichment demo. |
| `EXTERNAL_PRODUCT_API_TIMEOUT_MS` | `5000` | Timeout for public API enrichment requests. |

### Fallbacks and Knowledge Sources

- Without MongoDB, the bundled `backend/src/data/products.json` catalog and in-memory sessions are used.
- Without an LLM key, shopping explanations and image analysis use safe deterministic fallbacks.
- Without remote embeddings, RAG uses deterministic local sparse vectors and cosine similarity. If the provider fails, local embeddings are used for the request/index.
- Without image-generation access, preview requests return: `Image generation is not configured. Real product images are still available.`
- The repository does not include actual retailer terms. Missing return, refund, warranty, or delivery conditions are explicitly reported as unavailable; they are not inferred.
- RAG source documents live in `backend/src/services/rag/documents/`. Add approved material there. The in-memory index is rebuilt when the backend process starts; restart the backend after changing a source document.
- Catalog product-fact documents are generated from the backend catalog during index construction.

## Run and Test

Requirements: Node.js 18 or newer. Install and run the services separately:

```powershell
npm install --prefix backend
npm install --prefix frontend
npm run dev --prefix backend
npm run dev --prefix frontend
```

The backend defaults to `http://localhost:3000`; Vite serves the frontend at `http://localhost:5173` and proxies API requests.

Run checks:

```powershell
npm test --prefix backend
npm run build --prefix frontend
npm run mcp --prefix backend
```

The MCP server uses the official stdio transport and exposes the same validated shopping tools as the internal adapter: `search_products`, `get_product_details`, `check_budget_bundle`, and `get_policy`.

### Few-shot prompting

The backend adds a few-shot requirement-extraction prompt to the shopping workflow so item and preference normalization can follow the same patterns as the verified examples, while still grounding every recommendation in the backend catalog and budget optimizer.

### Model comparison endpoint

The evaluation endpoint is isolated from production recommendation logic. Clients can only submit names already allowlisted on the server, and comparison results are purely informative. It does not select products or alter budget totals.

### Optional external API demo

The app can optionally fetch public JSON product data, validate and normalize it, and filter it through the existing backend pipeline. The local catalog remains the authoritative source of truth; external data never overrides verified totals or stock status.

### Python learning compatibility

The optional Python script under `tools/` demonstrates equivalent JSON catalog cleaning and category summaries for educational purposes. It is not part of the production runtime and does not power the application.

## Security and Guarantees

- Browser-supplied prices, availability, product facts, and totals are not trusted.
- Recommendation and graph-candidate combinations are loaded from the backend catalog and checked by `budgetOptimizer.js`.
- The LLM does not select authoritative IDs or compute budget totals.
- Image uploads are size-limited. Preview product IDs must resolve in the verified catalog.
- Generated images are separate from real product images and are labeled `AI-generated visual preview — not the actual product.`
- The internal tool adapter returns structured data and safe errors; it does not expose provider credentials.

See [docs/edvergencex-topic-mapping.md](docs/edvergencex-topic-mapping.md), [docs/architecture-decisions.md](docs/architecture-decisions.md), and [docs/sample-conversations.md](docs/sample-conversations.md).
