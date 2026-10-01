import { useEffect, useState } from "react";
import { apiErrorMessage, fetchProducts } from "../api.js";
import ProductCard from "../components/ProductCard.jsx";

export default function CatalogPage() {
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchProducts()
      .then((data) => {
        setProducts(data.products || []);
        setStats(data.pipelineStats);
      })
      .catch((err) => setError(apiErrorMessage(err)));
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <h1 className="font-display text-4xl">Cleaned catalog</h1>
      <p className="mt-2 max-w-2xl text-ink/70">
        This list is the output of validate → clean → normalize → filter unavailable/invalid rows → rank. Invalid prices and duplicates never reach the LLM.
      </p>
      {stats ? (
        <p className="mt-4 text-sm text-moss">
          Raw {stats.raw} → cleaned {stats.cleaned} → unique {stats.unique} → available {stats.available}
        </p>
      ) : null}
      {error ? <p className="mt-4 text-clay">{error}</p> : null}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.productId} product={product} />
        ))}
      </div>
    </div>
  );
}
