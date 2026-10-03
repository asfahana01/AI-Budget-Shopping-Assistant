import { formatInr } from "../utils.js";

export default function CombinationCard({ combo, index, isSelected, onSelect, label }) {
  const products = combo?.products || [];
  const imageProducts = products.slice(0, 3);

  return (
    <button
      type="button"
      onClick={() => onSelect(combo)}
      aria-pressed={isSelected}
      className={`w-full rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-clay ${
        isSelected ? "border-clay bg-clay/5 shadow-card" : "border-sand bg-paper hover:border-clay/60"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-clay">{label}</p>
          <h4 className="mt-2 font-display text-xl">{formatInr(combo.totalPrice)}</h4>
        </div>
        <div className="text-right text-sm text-ink/70">
          <p>{formatInr(combo.remainingBudget)} left</p>
          <p>{combo.averageRating ? `${combo.averageRating.toFixed(1)} ★` : "Budget fit"}</p>
        </div>
      </div>

      <div className="mt-4 flex -space-x-2 overflow-hidden">
        {imageProducts.map((product) => (
          <img
            key={`${product.productId || product.name}-${product.name}`}
            src={product.image}
            alt={product.name}
            className="h-12 w-12 rounded-full border-2 border-white object-cover"
          />
        ))}
      </div>

      <p className="mt-4 text-sm text-ink/70">
        {products.map((product) => `${product.name} (${product.category})`).join(" · ")}
      </p>
    </button>
  );
}
