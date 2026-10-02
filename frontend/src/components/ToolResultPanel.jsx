export default function ToolResultPanel({ message }) {
  const failed = message.status === "error";
  const result = message.toolResult;
  return (
    <>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-clay">Verified catalog tool result</p>
      {message.toolName ? <p className="mb-2 text-xs text-ink/60">Tool: {message.toolName}</p> : null}
      {failed ? <p role="alert" className="text-sm text-clay">{result?.message || message.content}</p> : null}
      {!failed && message.content ? <p className="whitespace-pre-line">{message.content}</p> : null}
      {Array.isArray(result?.products) ? (
        <div className="mt-3 space-y-2 border-t border-sand/70 pt-3">
          {result.products.slice(0, 5).map((product) => (
            <p key={product.productId} className="text-xs">
              <span className="font-medium">{product.name}</span> · {product.productId} · ₹{product.price} · {product.availability}
            </p>
          ))}
        </div>
      ) : null}
      {result ? (
        <details className="mt-3 border-t border-sand/70 pt-2 text-xs">
          <summary className="cursor-pointer font-medium">Structured result</summary>
          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
        </details>
      ) : null}
    </>
  );
}
