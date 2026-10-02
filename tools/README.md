# Optional Python catalog analysis

This repository remains a JavaScript and Node.js production application. The main runtime is the backend Express service and the React + Vite frontend.

The Python script in this folder is intentionally educational and isolated. It demonstrates equivalent data-cleaning and catalog-summary concepts in Python, but it is not part of the production server, dependency graph, or runtime path.

## File

- `python_catalog_analysis.py` loads the bundled catalog JSON, removes duplicates and invalid records, groups products by category, and prints an average-price summary.

## Why this is optional

- The production codebase uses JavaScript and the existing backend services.
- The Python example exists to show how the same catalog-processing ideas can translate from Python notebook exercises into the repository's JavaScript implementation.
- This script is not used for live recommendations, product pricing, budget validation, or API execution.

## Run it

```bash
python tools/python_catalog_analysis.py
```
