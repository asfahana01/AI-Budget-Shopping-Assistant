import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connectMongo, mongoReady } from "../db.js";
import { Product } from "../models/Product.js";
import { normalizeCategory } from "../utils/normalize.js";

const catalogPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../data/products.json"
);

await connectMongo();

if (!mongoReady) {
  console.error("MongoDB is not connected.");
  process.exit(1);
}

try {
  const raw = JSON.parse(await readFile(catalogPath, "utf8"));

  const docs = raw
    .filter((item) => item?.productId && item?.name)
    .map((item) => ({
      ...item,
      normalizedCategory: normalizeCategory(item.category)
    }));

  for (const item of docs) {
    const { productId, ...updateFields } = item;

    await Product.updateOne(
      { productId },
      { $set: updateFields, $setOnInsert: { productId } },
      { upsert: true }
    );
  }

  console.log(`Updated or inserted ${docs.length} product documents.`);
} catch (error) {
  console.error("Catalog seeding failed:", error);
  process.exitCode = 1;
} finally {
  process.exit();
}