import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true },
    requirements: {
      budget: Number,
      currency: { type: String, default: "INR" },
      items: [String],
      preferences: [String]
    },
    visualContext: mongoose.Schema.Types.Mixed,
    messages: [
      {
        role: { type: String, enum: ["user", "assistant"] },
        content: String,
        createdAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

export const ChatSession = mongoose.models.ChatSession || mongoose.model("ChatSession", sessionSchema);
