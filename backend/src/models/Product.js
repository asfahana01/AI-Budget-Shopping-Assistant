import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    category: String,
    normalizedCategory: String,
    brand: String,
    price: Number,
    rating: Number,
    description: String,
    features: [String],
    image: String,
    availability: { type: String, default: "in_stock" }
  },
  { timestamps: true }
);

export const Product = mongoose.models.Product || mongoose.model("Product", productSchema);
