export function formatInr(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

export function stars(rating) {
  return Number(rating || 0).toFixed(1);
}
