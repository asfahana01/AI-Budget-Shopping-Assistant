export function isSafeExternalUrl(value) {
  if (typeof value !== "string") return false;

  const trimmed = value.trim();
  if (!trimmed) return false;

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

export function normalizeOfficialUrl(value) {
  if (value === null || value === undefined || value === "") return null;

  const trimmed = String(value).trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith("https://")) return null;

  return isSafeExternalUrl(trimmed) ? trimmed : null;
}

export function getVerifiedShoppingLink(product) {
  if (!product || typeof product !== "object") return null;

  const url = normalizeOfficialUrl(product.officialUrl);
  return url || null;
}
