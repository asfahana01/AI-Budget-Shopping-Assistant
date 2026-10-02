import json
from collections import defaultdict
from pathlib import Path


def load_products(path):
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def clean_products(products):
    cleaned = []
    seen = set()
    for product in products:
        if not isinstance(product, dict):
            continue
        product_id = str(product.get("productId") or product.get("id") or "").strip()
        name = str(product.get("name") or "").strip()
        price = product.get("price")
        if not name or not product_id:
            continue
        try:
            price_value = float(price)
        except (TypeError, ValueError):
            continue
        if price_value <= 0:
            continue
        key = (product_id.lower(), name.lower())
        if key in seen:
            continue
        seen.add(key)
        cleaned.append({
            "productId": product_id,
            "name": name,
            "category": str(product.get("category") or "uncategorized").strip(),
            "price": round(price_value, 2),
            "availability": str(product.get("availability") or "in_stock").lower(),
        })
    return cleaned


def summarize(products):
    by_category = defaultdict(list)
    total_price = 0.0
    for product in products:
        by_category[product["category"]].append(product)
        total_price += product["price"]

    summary = {
        "count": len(products),
        "categories": {category: len(items) for category, items in sorted(by_category.items())},
        "average_price": round(total_price / len(products), 2) if products else 0.0,
        "in_stock": sum(1 for product in products if product["availability"] == "in_stock"),
    }
    return summary


def main():
    project_root = Path(__file__).resolve().parents[1]
    catalog_path = project_root / "backend" / "src" / "data" / "products.json"
    products = load_products(catalog_path)
    cleaned = clean_products(products)
    summary = summarize(cleaned)
    print(json.dumps(summary, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
