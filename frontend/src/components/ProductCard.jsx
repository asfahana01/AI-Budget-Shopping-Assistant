export default function ProductCard({ product, highlight = false }) {
  return (
    <article
      className={`overflow-hidden rounded-2xl bg-white shadow-card ring-1 ${
        highlight ? "ring-clay" : "ring-sand"
      }`}
    >
      <div className="relative h-40 bg-sand">
        {product.image ? (
          <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-ink/50">No image</div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-1 text-xs uppercase tracking-wide">
          {product.category}
        </span>
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-lg leading-tight">{product.name}</h3>
          <p className="shrink-0 font-semibold text-moss">₹{product.price}</p>
        </div>
        <p className="text-sm text-ink/70">⭐ {Number(product.rating || 0).toFixed(1)} · {product.brand}</p>
        <ul className="flex flex-wrap gap-1">
          {(product.features || []).slice(0, 4).map((feature) => (
            <li key={feature} className="rounded-full bg-paper px-2 py-1 text-xs text-ink/80">
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
