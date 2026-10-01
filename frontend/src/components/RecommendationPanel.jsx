import ProductCard from "./ProductCard.jsx";
import { formatInr } from "../utils.js";

export default function RecommendationPanel({ result, loading, error }) {
  if (loading) {
    return (
      <div className="rounded-3xl bg-white/70 p-8 shadow-card ring-1 ring-sand">
        <p className="animate-pulse font-display text-2xl">Comparing combinations…</p>
        <p className="mt-2 text-ink/70">Cleaning catalog data and verifying totals on the backend.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl bg-white p-8 ring-1 ring-clay/40">
        <h2 className="font-display text-2xl text-clay">Something went wrong</h2>
        <p className="mt-2 text-ink/80">{error}</p>
      </div>
    );
  }

  if (!result || result.status === "needs_clarification") {
    return (
      <div className="rounded-3xl bg-moss px-8 py-10 text-paper shadow-card">
        <p className="text-sm uppercase tracking-[0.2em] text-sand">Waiting for details</p>
        <h2 className="mt-3 font-display text-3xl">Tell me a budget and what to buy</h2>
        <p className="mt-4 max-w-md text-paper/80">
          Example: “I have ₹5000. I need a backpack, headphones and a smartwatch for college.”
        </p>
      </div>
    );
  }

  if (result.status === "error") {
    return (
      <div className="rounded-3xl bg-white p-8 ring-1 ring-sand">
        <h2 className="font-display text-2xl">No valid combination</h2>
        <p className="mt-3 whitespace-pre-line text-ink/80">{result.assistantMessage || result.message}</p>
      </div>
    );
  }

  const rec = result.recommendation;
  const products = rec?.products || [];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-card ring-1 ring-sand md:p-8">
        <p className="text-sm uppercase tracking-[0.2em] text-clay">AI recommended shopping list</p>
        <h2 className="mt-2 font-display text-3xl">Your verified bundle</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.productId} product={product} highlight />
          ))}
        </div>
        <dl className="mt-6 grid grid-cols-3 gap-3 rounded-2xl bg-paper p-4 text-center">
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink/50">Total</dt>
            <dd className="font-display text-2xl">{formatInr(rec.totalPrice)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink/50">Budget</dt>
            <dd className="font-display text-2xl">{formatInr(result.requirements?.budget)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink/50">Remaining</dt>
            <dd className="font-display text-2xl text-moss">{formatInr(rec.remainingBudget)}</dd>
          </div>
        </dl>
        <div className="mt-6">
          <h3 className="font-display text-xl">Why this recommendation?</h3>
          <p className="mt-2 text-ink/80">{rec.reason || result.assistantMessage}</p>
        </div>
      </section>

      {result.alternatives?.length ? (
        <section className="rounded-3xl bg-white p-6 ring-1 ring-sand">
          <h3 className="font-display text-xl">Alternative combinations</h3>
          <div className="mt-4 space-y-4">
            {result.alternatives.map((combo, index) => (
              <div key={index} className="rounded-2xl bg-paper p-4">
                <p className="text-sm font-medium">
                  Option {index + 2} · {formatInr(combo.totalPrice)} · {formatInr(combo.remainingBudget)} left
                </p>
                <p className="mt-1 text-sm text-ink/70">
                  {combo.products.map((p) => `${p.name} (₹${p.price})`).join(" · ")}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
