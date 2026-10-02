import ResponseRouter from "./ResponseRouter.jsx";

export default function ChatPanel({
  messages,
  input,
  setInput,
  onSend,
  onUpload,
  loading,
  visual
}) {
  return (
    <section className="flex h-full min-h-[32rem] flex-col rounded-3xl bg-white shadow-card ring-1 ring-sand">
      <header className="border-b border-sand px-5 py-4">
        <p className="text-xs uppercase tracking-[0.2em] text-clay">Conversation</p>
        <h2 className="font-display text-2xl">Shopping chat</h2>
      </header>
      <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {messages.length === 0 ? (
          <p className="text-ink/60">
            Start with your budget, then list products. You can also upload a product photo for visual matching.
          </p>
        ) : null}
        {messages.map((message, index) => (
          <div
            key={index}
            className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              message.role === "user" ? "ml-auto bg-moss text-paper" : "bg-paper text-ink"
            }`}
          >
            {message.role === "assistant" ? (
              <ResponseRouter message={message} />
            ) : (
              <p className="whitespace-pre-line">{message.content}</p>
            )}
          </div>
        ))}
        {loading ? <p className="text-sm text-ink/50">Thinking…</p> : null}
      </div>
      {visual ? (
        <p className="px-5 text-xs text-moss">
          Visual context: {visual.productType} · {visual.color} · {visual.style}
        </p>
      ) : null}
      <form
        className="border-t border-sand p-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSend();
        }}
      >
        <label className="mb-2 flex cursor-pointer items-center gap-2 text-sm text-ink/70">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onUpload(file);
              event.target.value = "";
            }}
          />
          <span className="rounded-full bg-sand px-3 py-1">Upload product image</span>
        </label>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="I have ₹5000. I need a backpack, headphones and a smartwatch."
            className="flex-1 rounded-2xl border border-sand bg-paper px-4 py-3 outline-none ring-clay focus:ring-2"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-2xl bg-clay px-4 py-3 font-medium text-white disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </section>
  );
}
