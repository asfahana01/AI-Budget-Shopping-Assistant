import ProductCard from "./ProductCard.jsx";
import ShoppingActions from "./ShoppingActions.jsx";
import { formatInr } from "../utils.js";

export default function CombinationDetails({ combination, budget }) {
  const products = combination?.products || [];

  return (
    <section className="rounded-3xl bg-white p-6 shadow-card ring-1 ring-sand md:p-8">
      <p className="text-sm uppercase tracking-[0.2em] text-clay">Selected combination</p>
      <h2 className="mt-2 font-display text-3xl">{combination?.summary || combination?.reason || "Verified bundle"}</h2>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.productId || `${product.name}-${product.category}`} product={product} highlight />
        ))}
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3 rounded-2xl bg-paper p-4 text-center md:grid-cols-4">
        <div>
          <dt className="text-xs uppercase tracking-wide text-ink/50">Total</dt>
          <dd className="font-display text-2xl">{formatInr(combination?.totalPrice)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-ink/50">Budget</dt>
          <dd className="font-display text-2xl">{formatInr(budget)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-ink/50">Remaining</dt>
          <dd className="font-display text-2xl text-moss">{formatInr(combination?.remainingBudget)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-ink/50">Avg. rating</dt>
          <dd className="font-display text-2xl">{combination?.averageRating ? combination.averageRating.toFixed(1) : "—"}</dd>
        </div>
      </dl>

      <div className="mt-6 space-y-3">
        {combination?.summary || combination?.reason ? (
          <p className="text-ink/80">{combination.summary || combination.reason}</p>
        ) : null}
        <ShoppingActions products={products} actionLabel="Shop this bundle" bundleLabel="Open official product pages" />
      </div>
    </section>
  );
}
