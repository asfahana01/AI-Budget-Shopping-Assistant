# AI Budget Shopping Assistant

An AI-powered shopping assistant that finds **verified product combinations inside a fixed budget**. Deterministic backend code owns prices, filtering, and totals. The LLM only explains combinations the backend already checked.

## Concept mapping

| Concept | Where it lives | What it does |
| --- | --- | --- |
| API integration | `backend/src/services/productApi.js`, `GET /api/products` | Loads catalog from MongoDB or bundled JSON. Keys stay on the server. |
| Data handling | `backend/src/services/dataProcessing.js` | Validate → clean → normalize → dedupe → availability filter → requirement filter → rank → limit for the LLM. |
| LLM | `backend/src/services/llm.js` | Writes the recommendation narrative and chat reply. Never decides whether a total is over budget. |
| Prompt engineering | `backend/src/services/prompts.js` | Role + task + constraints + output format, plus injection hardening. |
| Context engineering | `backend/src/services/contextBuilder.js` | Builds `{ user, requirements, products, combinations, conversationHistory, visualContext }`. |
| Multimodal AI | `backend/src/services/vision.js`, `POST /api/analyze-image` | Describes product photos. Unknown details return `Unable to determine from the image.` |

## Architecture

```
Frontend (React + Vite)
   ↓
Backend API (Express)
   ↓
Product API (MongoDB or mock JSON)
   ↓
Data processing
   ↓
Budget optimization (cartesian combinations, scored, total ≤ budget)
   ↓
Context builder
   ↓
LLM (explanation only)
   ↓
Structured recommendation
   ↓
Frontend
```

## Folder structure

```
backend/
  src/
    config.js
    server.js
    db.js
    data/products.json
    data/sample-api-responses.json
    models/
    middleware/
    routes/api.js
    services/          # productApi, dataProcessing, budgetOptimizer,
                       # prompts, contextBuilder, llm, vision, recommend
    scripts/seed.js
frontend/
  src/pages, components, api.js
docs/sample-conversations.md
.env.example
```

## API endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/chat` | Conversational requirement extraction + recommend |
| POST | `/api/recommend` | Direct structured recommend |
| GET | `/api/products` | Cleaned catalog |
| POST | `/api/analyze-image` | Multimodal product image analysis |
| POST | `/api/optimize-budget` | Combinations only (no LLM) |
| GET | `/api/health` | Liveness |

Prices from the browser are **not trusted**. `/api/recommend` and `/api/chat` always re-price from the catalog.

## Run locally

### 1. Prerequisites

- Node.js 18+
- Optional: MongoDB, plus an OpenAI-compatible API key for live LLM/vision

Without MongoDB the JSON catalog and in-memory sessions are used.
Without `OPENAI_API_KEY` the app still runs: budget math stays real; explanations use a deterministic fallback; image analysis is conservative.

### 2. Install

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 3. Environment

```bash
cp .env.example backend/.env
```

Set `OPENAI_API_KEY` (and optionally `OPENAI_BASE_URL` for Groq or Azure) if you want live LLM + vision.

### 4. Start

Terminal A:

```bash
cd backend
npm run dev
```

Terminal B:

```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

Optional Mongo seed:

```bash
cd backend
npm run seed
```

## Sample request

`POST /api/recommend`

```json
{
  "budget": 5000,
  "items": ["backpack", "headphones", "smartwatch"],
  "preferences": ["college use", "good battery life"]
}
```

The optimizer keeps `totalPrice <= 5000`. Remaining budget is `budget - totalPrice`.

## Security

- Secrets only in `backend/.env` (gitignored)
- Zod validation on chat, recommend, and optimize bodies
- Image uploads capped at 4 MB and checked for MIME type
- CORS limited to `FRONTEND_ORIGIN`

## Demo conversation

See `docs/sample-conversations.md`.
