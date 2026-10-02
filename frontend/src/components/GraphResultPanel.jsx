export default function GraphResultPanel({ message }) {
  const graph = message.graph || {};
  return (
    <>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-clay">Product relationship search</p>
      <p className="whitespace-pre-line">{message.content}</p>
      {graph.relatedProducts?.length ? (
        <div className="mt-3 space-y-2 border-t border-sand/70 pt-3">
          {graph.relatedProducts.slice(0, 5).map((product) => (
            <div key={product.productId} className="flex items-start gap-3 text-xs">
              {product.image ? <img src={product.image} alt="" className="h-12 w-12 rounded object-cover" /> : null}
              <div>
                <p className="font-medium">{product.name} <span className="text-ink/50">({product.productId})</span></p>
                <p className="text-ink/70">{product.category} · {product.features?.join(", ")}</p>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {graph.seedNodes?.length ? (
        <p className="mt-3 border-t border-sand/70 pt-2 text-xs text-ink/70">
          Seed nodes: {graph.seedNodes.map((node) => `${node.label} [${node.type}]`).join(" · ")}
        </p>
      ) : null}
      {graph.graphContext ? (
        <details className="mt-2 text-xs">
          <summary className="cursor-pointer font-medium">Relationship context</summary>
          <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap text-ink/70">{graph.graphContext}</pre>
        </details>
      ) : null}
      {graph.sources?.length ? (
        <p className="mt-2 text-xs text-ink/70">Source product IDs: {graph.sources.join(", ")}</p>
      ) : null}
    </>
  );
}
