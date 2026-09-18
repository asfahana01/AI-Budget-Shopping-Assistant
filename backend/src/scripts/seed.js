import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connectMongo, mongoReady } from "../db.js";
import { Product } from "../models/Product.js";
import { normalizeCategory } from "../utils/normalize.js";

const catalogPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../data/products.json");

await connectMongo();
if (!mongoReady) {
  console.error("MongoDB is not connected. Start MongoDB or skip seeding and use the JSON catalog.");
  process.exit(1);
}

const raw = JSON.parse(await readFile(catalogPath, "utf8"));
const docs = raw
  .filter((item) => item?.productId && item?.name)
  .map((item) => ({
    ...item,
    normalizedCategory: normalizeCategory(item.category)
  }));

await Product.deleteMany({});
await Product.insertMany(docs, { ordered: false }).catch(() => {});
console.log(`Seeded ${docs.length} product documents`);
process.exit(0);
