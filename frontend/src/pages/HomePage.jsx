import { useState } from "react";
import { analyzeImage, apiErrorMessage, sendChat } from "../api.js";
import ChatPanel from "../components/ChatPanel.jsx";
import RecommendationPanel from "../components/RecommendationPanel.jsx";

export default function HomePage() {
  const [input, setInput] = useState("");
  const [budgetInput, setBudgetInput] = useState("5000");
  const [messages, setMessages] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [visual, setVisual] = useState(null);

  async function handleSend(text) {
    const message = (text || input).trim();
    if (!message) return;
    setInput("");
    setError("");
    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    try {
      const data = await sendChat(message);
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: data.assistantMessage || data.answer || "",
        route: data.route,
        status: data.status,
        sources: data.sources || [],
        retrievedChunks: data.retrievedChunks,
        graph: data.graph,
        toolName: data.toolName,
        toolResult: data.toolResult,
        preview: data.preview
      }]);
      setResult(data);
      if (data.requirements?.budget) setBudgetInput(String(data.requirements.budget));
    } catch (err) {
      const note = apiErrorMessage(err);
      setError(note);
      setMessages((prev) => [...prev, { role: "assistant", content: note, status: "error" }]);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(file) {
    setLoading(true);
    setError("");
    try {
      const data = await analyzeImage(file);
      setVisual(data.analysis);
      const summary = `I uploaded a product image. It looks like: ${data.analysis.visualDescription}`;
      setMessages((prev) => [...prev, { role: "user", content: `Uploaded ${file.name}` }]);
      await handleSend(summary);
    } catch (err) {
      setError(apiErrorMessage(err));
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 md:px-8">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-clay">Deterministic totals · LLM explanations</p>
          <h1 className="mt-2 max-w-2xl font-display text-4xl leading-tight md:text-5xl">
            AI Budget Shopping Assistant
          </h1>
          <p className="mt-3 max-w-xl text-ink/70">
            Find a backpack, headphones, watch, or any mix that actually fits the number you typed — prices are verified on the server, not guessed by the model.
          </p>
        </div>
        <form
          className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-sand"
          onSubmit={(event) => {
            event.preventDefault();
            handleSend(`My budget is ₹${budgetInput}.`);
          }}
        >
          <label className="text-xs uppercase tracking-wide text-ink/50">Budget (INR)</label>
          <div className="mt-2 flex gap-2">
            <input
              type="number"
              min="1"
              value={budgetInput}
              onChange={(event) => setBudgetInput(event.target.value)}
              className="w-36 rounded-xl border border-sand bg-paper px-3 py-2"
            />
            <button type="submit" className="rounded-xl bg-moss px-3 py-2 text-sm text-paper">
              Set
            </button>
          </div>
        </form>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <ChatPanel
          messages={messages}
          input={input}
          setInput={setInput}
          onSend={() => handleSend()}
          onUpload={handleUpload}
          loading={loading}
          visual={visual}
        />
        <RecommendationPanel result={result} loading={loading && !result?.recommendation} error={error} />
      </div>
    </div>
  );
}
