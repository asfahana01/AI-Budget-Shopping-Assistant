import { useState } from "react";
import { isSafeExternalUrl } from "../utils/officialLinks.js";

export default function ShoppingActions({ products = [], actionLabel = "Shop this bundle", bundleLabel = "Open official product pages" }) {
  const [popupBlocked, setPopupBlocked] = useState(false);
  const verifiedProducts = products.filter((product) => isSafeExternalUrl(product?.officialUrl));
  const unavailableCount = products.length - verifiedProducts.length;

  const handleOpenAll = () => {
    if (!verifiedProducts.length) return;
    setPopupBlocked(false);
    const windows = verifiedProducts.map((product) => {
      return window.open(product.officialUrl, "_blank", "noopener,noreferrer");
    });
    if (windows.some((windowRef) => !windowRef)) {
      setPopupBlocked(true);
    }
  };

  if (!products.length) {
    return <p className="text-sm text-ink/60">Official link unavailable</p>;
  }

  return (
    <div className="space-y-3 rounded-2xl bg-paper p-4">
      <div className="flex flex-wrap items-center gap-2">
        {verifiedProducts.length ? (
          <>
            <button
              type="button"
              onClick={handleOpenAll}
              className="rounded-full bg-moss px-3 py-2 text-sm font-medium text-paper transition hover:bg-moss/90 focus:outline-none focus:ring-2 focus:ring-clay"
            >
              {bundleLabel}
            </button>
            <span className="text-sm text-ink/70">{actionLabel}</span>
          </>
        ) : (
          <span className="text-sm text-ink/70">Official link unavailable</span>
        )}
      </div>

      {popupBlocked ? (
        <p className="text-sm text-clay">
          Pop-up blocking is enabled, so open the links below manually.
        </p>
      ) : null}

      {verifiedProducts.length ? (
        <ul className="space-y-2">
          {verifiedProducts.map((product) => (
            <li key={product.productId || product.name} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-sand">
              <span className="text-sm text-ink/80">{product.name}</span>
              <a
                href={product.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-clay px-2 py-1 text-xs font-medium text-clay transition hover:bg-clay hover:text-white focus:outline-none focus:ring-2 focus:ring-clay"
              >
                Open link
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink/70">
          Official shopping link is not available for this product yet.
        </p>
      )}

      {unavailableCount > 0 ? (
        <p className="text-xs text-ink/60">
          {unavailableCount} product{unavailableCount > 1 ? "s are" : " is"} not linked to an official product page yet.
        </p>
      ) : null}
    </div>
  );
}
